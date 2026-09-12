import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import {
  SITE_URL, SITE_TITLE, SITE_DESCRIPTION, findingUrl, createRss, createSitemap,
} from "../src/lib/publication.mjs";

const root = new URL("../", import.meta.url);
const sourceDir = new URL("content/findings/", root);
const outputDir = new URL("dist/", root);
const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/giu, (_, entity) => {
  const value = entity.toLowerCase();
  if (value.startsWith("#x")) return String.fromCodePoint(parseInt(value.slice(2), 16));
  if (value.startsWith("#")) return String.fromCodePoint(parseInt(value.slice(1), 10));
  return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[value];
});

function headTags(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1];
  assert(head, "HTMLにheadがありません。");
  return [...head.matchAll(/<(?:meta|link)\b[^>]*>/giu)].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(([, key, value]) => [key, decode(value)])),
  );
}

function verifyHead(html, url, title, description, type) {
  const tags = headTags(html);
  const canonicals = tags.filter((tag) => tag.rel === "canonical");
  assert.equal(canonicals.length, 1, `${url}: canonicalが一意ではありません。`);
  assert.equal(canonicals[0].href, url);
  for (const [property, content] of Object.entries({
    "og:url": url, "og:title": title, "og:description": description,
    "og:type": type, "og:site_name": SITE_TITLE, "og:locale": "ja_JP",
  })) {
    const matches = tags.filter((tag) => tag.property === property);
    assert.equal(matches.length, 1, `${url}: ${property}が一意ではありません。`);
    assert.equal(matches[0].content, content, `${url}: ${property}が原本と一致しません。`);
  }
  assert(tags.some((tag) => tag.rel === "alternate" && tag.type === "application/rss+xml" && tag.href === `${SITE_URL}rss.xml`));
}

async function main() {
  const paths = (await readdir(sourceDir)).filter((name) => name.endsWith(".json"));
  const findings = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(new URL(path, sourceDir), "utf8"))));
  verifyHead(await readFile(new URL("index.html", outputDir), "utf8"), SITE_URL, SITE_TITLE, SITE_DESCRIPTION, "website");
  for (const finding of findings) {
    verifyHead(
      await readFile(new URL(`findings/${finding.id}/index.html`, outputDir), "utf8"),
      findingUrl(finding.id), `${finding.title} | ${SITE_TITLE}`, finding.summary, "article",
    );
  }
  const notFound = headTags(await readFile(new URL("404.html", outputDir), "utf8"));
  assert(notFound.some((tag) => tag.name === "robots" && tag.content === "noindex"));
  assert(!notFound.some((tag) => tag.rel === "canonical" || tag.property === "og:url"));
  assert.equal(await readFile(new URL("rss.xml", outputDir), "utf8"), createRss(findings), "RSSが原本の最新50件と一致しません。");
  assert.equal(await readFile(new URL("sitemap.xml", outputDir), "utf8"), createSitemap(findings), "サイトマップが原本の全記事と一致しません。");
  assert((await readFile(new URL("robots.txt", outputDir), "utf8")).includes(`Sitemap: ${SITE_URL}sitemap.xml`));
  console.log(`${findings.length}件のFindingについて、正式URL・OGP・RSS・サイトマップを確認しました。`);
}

main().catch((error) => {
  console.error("公開用データの検証に失敗しました:", error.message);
  process.exitCode = 1;
});
