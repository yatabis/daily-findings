import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
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

export function headTags(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1];
  assert(head, "HTMLにheadがありません。");
  return [...head.matchAll(/<(?:meta|link)\b(?:[^<>"']|"[^"]*"|'[^']*')*>/giu)].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(([, key, value]) => [key, decode(value)])),
  );
}

function verifyIconLinks(tags, url) {
  for (const [rel, href, sizes] of [
    ["icon", "/favicon.ico", "16x16 32x32 48x48"],
    ["icon", "/favicon.png", "48x48"],
    ["apple-touch-icon", "/apple-touch-icon.png", "180x180"],
  ]) {
    const matches = tags.filter((tag) => tag.rel === rel && tag.href === href);
    assert.equal(matches.length, 1, `${url}: ${href}のリンクが一意ではありません。`);
    assert.equal(matches[0].sizes, sizes, `${url}: ${href}のサイズ指定が違います。`);
  }
}

function verifyPng(bytes, size, name) {
  assert(bytes.length >= 33, `${name}: PNGが短すぎます。`);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${name}: PNGではありません。`);
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR");
  assert.equal(bytes.readUInt32BE(16), size, `${name}: 幅が違います。`);
  assert.equal(bytes.readUInt32BE(20), size, `${name}: 高さが違います。`);
}

async function verifyIconFiles() {
  // 原本と生成物の一致も確認し、public配下のコピー漏れを検出する。
  const assets = new Map();
  for (const name of ["favicon.ico", "favicon.png", "apple-touch-icon.png"]) {
    const source = await readFile(new URL(`public/${name}`, root));
    const output = await readFile(new URL(name, outputDir));
    assert(output.equals(source), `${name}: 配信用ファイルが原本と一致しません。`);
    assets.set(name, output);
  }
  verifyPng(assets.get("favicon.png"), 48, "favicon.png");
  verifyPng(assets.get("apple-touch-icon.png"), 180, "apple-touch-icon.png");
  const ico = assets.get("favicon.ico");
  assert(ico.length >= 54, "favicon.ico: ディレクトリが不完全です。");
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert(offset >= 54 && offset + length <= ico.length, "favicon.ico: 画像の位置が不正です。");
    verifyPng(ico.subarray(offset, offset + length), size, `favicon.icoの${size}px画像`);
  }
}

function verifyHead(html, url, title, description, type) {
  const tags = headTags(html);
  verifyIconLinks(tags, url);
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
  await verifyIconFiles();
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
  verifyIconLinks(notFound, "/404.html");
  assert(notFound.some((tag) => tag.name === "robots" && tag.content === "noindex"));
  assert(!notFound.some((tag) => tag.rel === "canonical" || tag.property === "og:url"));
  assert.equal(await readFile(new URL("rss.xml", outputDir), "utf8"), createRss(findings), "RSSが原本の最新50件と一致しません。");
  assert.equal(await readFile(new URL("sitemap.xml", outputDir), "utf8"), createSitemap(findings), "サイトマップが原本の全記事と一致しません。");
  assert((await readFile(new URL("robots.txt", outputDir), "utf8")).includes(`Sitemap: ${SITE_URL}sitemap.xml`));
  console.log(`${findings.length}件のFindingについて、正式URL・OGP・RSS・サイトマップ・アイコンを確認しました。`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("公開用データの検証に失敗しました:", error.message);
    process.exitCode = 1;
  });
}
