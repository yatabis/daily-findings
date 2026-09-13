import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { headTags } from "./verify_publication.mjs";
import { createLlmsTxt, createFindingIndex, createFindingMarkdown, markdownPath } from "../src/lib/agent-content.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
const source = new URL("content/findings/", root);
const read = (path) => readFile(new URL(path, output), "utf8");

function verifyMetadata(html, markdown) {
  const tags = headTags(html);
  assert(tags.some((t) => t.rel === "alternate" && t.type === "text/markdown" && t.href === markdown));
  assert(tags.some((t) => t.rel === "describedby" && t.href === "/llms.txt"));
}

async function main() {
  const files = (await readdir(source)).filter((name) => name.endsWith(".json"));
  const findings = await Promise.all(files.map(async (name) => JSON.parse(await readFile(new URL(name, source), "utf8"))));
  const byId = new Map(findings.map((f) => [f.id, f]));
  verifyMetadata(await read("index.html"), "/index.md");
  assert.equal(await read("llms.txt"), createLlmsTxt());
  assert.equal(await read("index.md"), createFindingIndex(findings));
  for (const finding of findings) {
    const related = [...new Set(finding.relatedFindingIds ?? [])].filter((id) => id !== finding.id).map((id) => byId.get(id)).filter(Boolean);
    const path = markdownPath(finding.id);
    assert.equal(await read(path.slice(1)), createFindingMarkdown(finding, related), `${finding.id}: Markdownが原本と一致しません。`);
    verifyMetadata(await read(`findings/${finding.id}/index.html`), path);
  }
  assert.equal(await read("_headers"), await readFile(new URL("public/_headers", root), "utf8"));
  console.log(`${findings.length}件のMarkdownとllms.txtを確認しました。`);
}

main().catch((error) => {
  console.error("AI向け公開データの検証に失敗しました:", error.message);
  process.exitCode = 1;
});
