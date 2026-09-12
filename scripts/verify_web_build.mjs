import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const findingsDirectory = new URL("content/findings/", root);
const outputDirectory = new URL("dist/", root);

async function main() {
  // Astro側とは独立に原本を読み、読み込み漏れを検出する。
  const fileNames = (await readdir(findingsDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const indexHtml = await readFile(new URL("index.html", outputDirectory), "utf8");
  const ids = new Set();

  for (const fileName of fileNames) {
    const finding = JSON.parse(
      await readFile(new URL(fileName, findingsDirectory), "utf8"),
    );
    assert.equal(typeof finding.id, "string", `${fileName}: IDがありません。`);
    assert.match(finding.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${fileName}: IDが不正です。`);
    assert(!ids.has(finding.id), `FindingのIDが重複しています: ${finding.id}`);
    ids.add(finding.id);

    const href = `/findings/${finding.id}/`;
    assert(
      indexHtml.includes(`href="${href}"`),
      `一覧にFindingのリンクがありません: ${finding.id}`,
    );
    const detailHtml = await readFile(
      new URL(`findings/${finding.id}/index.html`, outputDirectory),
      "utf8",
    );
    assert(
      /<article(?:\s|>)/u.test(detailHtml) && /<h1(?:\s|>)/u.test(detailHtml),
      `Findingの個別ページに本文または見出しがありません: ${finding.id}`,
    );
  }

  assert.equal(
    indexHtml.includes('class="empty-state"'),
    fileNames.length === 0,
    "一覧の空表示とFindingの件数が一致しません。",
  );
  console.log(`${fileNames.length}件のFindingについて、一覧リンクと個別ページの生成を確認しました。`);
}

main().catch((error) => {
  console.error("Web UIの生成結果を検証できませんでした:", error.message);
  process.exitCode = 1;
});
