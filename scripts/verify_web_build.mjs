import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const findingsDirectory = new URL("content/findings/", root);
const outputDirectory = new URL("dist/", root);
const siteUrl = "https://findings.yatabis.dev/";
const ogImageUrl = `${siteUrl}og/default.png`;

function pngDimensions(bytes) {
  assert(bytes.length >= 24, "OGP画像が壊れています。");
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "OGP画像がPNGではありません。");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

async function main() {
  const fileNames = (await readdir(findingsDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const indexHtml = await readFile(new URL("index.html", outputDirectory), "utf8");
  const markdownIndex = await readFile(new URL("index.md", outputDirectory), "utf8");
  const sitemap = await readFile(new URL("sitemap.xml", outputDirectory), "utf8");
  const rss = await readFile(new URL("rss.xml", outputDirectory), "utf8");
  const llms = await readFile(new URL("llms.txt", outputDirectory), "utf8");
  const ids = new Set();

  for (const fileName of fileNames) {
    const finding = JSON.parse(await readFile(new URL(fileName, findingsDirectory), "utf8"));
    assert.equal(typeof finding.id, "string", `${fileName}: IDがありません。`);
    assert.match(finding.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${fileName}: IDが不正です。`);
    assert(!ids.has(finding.id), `FindingのIDが重複しています: ${finding.id}`);
    ids.add(finding.id);

    const href = `/findings/${finding.id}/`;
    assert(indexHtml.includes(`href="${href}"`), `一覧にFindingのリンクがありません: ${finding.id}`);

    const detailHtml = await readFile(new URL(`findings/${finding.id}/index.html`, outputDirectory), "utf8");
    assert(/<article(?:\s|>)/u.test(detailHtml) && /<h1(?:\s|>)/u.test(detailHtml), `個別ページが不完全です: ${finding.id}`);

    const canonical = `${siteUrl}findings/${finding.id}/`;
    assert(detailHtml.includes(canonical), `canonicalがありません: ${finding.id}`);
    assert(detailHtml.includes(ogImageUrl), `OGP画像がありません: ${finding.id}`);
    assert(sitemap.includes(canonical), `サイトマップにFindingがありません: ${finding.id}`);

    const markdownPath = `findings/${finding.id}.md`;
    const markdown = await readFile(new URL(markdownPath, outputDirectory), "utf8");
    assert(markdown.startsWith("# ") && markdown.includes(canonical), `Markdown版が不完全です: ${finding.id}`);
    assert(markdownIndex.includes(`${siteUrl}${markdownPath}`), `Markdown一覧にFindingがありません: ${finding.id}`);
    assert(detailHtml.includes(`/${markdownPath}`), `HTMLからMarkdown版への案内がありません: ${finding.id}`);
  }

  assert.equal(indexHtml.includes('class="empty-state"'), fileNames.length === 0, "一覧の空表示とFindingの件数が一致しません。");
  assert(indexHtml.includes('/index.md'), "トップページからMarkdown一覧への案内がありません。");
  for (const path of ["favicon.ico", "favicon.png", "apple-touch-icon.png", "robots.txt"]) {
    await readFile(new URL(path, outputDirectory));
  }

  const ogImage = await readFile(new URL("og/default.png", outputDirectory));
  assert.deepEqual(pngDimensions(ogImage), [1200, 630], "OGP画像のサイズが違います。");
  assert(indexHtml.includes(ogImageUrl), "トップページにOGP画像がありません。");
  assert(rss.includes("<rss") && rss.includes(siteUrl), "RSSが生成されていません。");
  assert(sitemap.includes("<urlset") && sitemap.includes(siteUrl), "サイトマップが生成されていません。");
  assert(llms.startsWith("# daily-findings") && llms.includes("index.md") && llms.includes("rss.xml") && llms.includes("sitemap.xml"), "llms.txtが不完全です。");

  console.log(`${fileNames.length}件のFindingと主要な公開ファイルの生成を確認しました。`);
}

main().catch((error) => {
  console.error("Webビルドの生成結果を検証できませんでした:", error.message);
  process.exitCode = 1;
});
