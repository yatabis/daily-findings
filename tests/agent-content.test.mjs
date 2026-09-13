import assert from "node:assert/strict";
import test from "node:test";
import { createFindingMarkdown, createFindingIndex, createLlmsTxt, markdownPath } from "../src/lib/agent-content.mjs";

const finding = {
  id: "test-finding", date: "2026-09-13", status: "WATCH", title: "試験の記録",
  summary: "Vec<KVCache>とA&Bを比較。", whyItMatters: "まだ検証していない。", tags: ["MLX"],
  sources: [{ title: "根拠 [原文]", url: "https://example.com/a(b)?q=x&v=2", publisher: "公開元", publishedAt: "2026-09-10" }],
};

test("Markdownは概要・所感・記録日と出典の公開日を分けて残す", () => {
  const md = createFindingMarkdown(finding);
  for (const value of ["# 試験の記録", "記録日: 2026-09-13", "分類: WATCH", "## 概要", "## 所感", "タグ: MLX", "公開日: 2026-09-10", "公開元", "https://findings.yatabis.dev/findings/test-finding/"]) assert(md.includes(value), value);
});
test("HTMLやMarkdownの記号を生のタグやリンクとして流さない", () => {
  const md = createFindingMarkdown(finding);
  assert(md.includes("Vec&lt;KVCache&gt;とA&amp;B"));
  assert(md.includes("[根拠 \\[原文\\]](<https://example.com/a(b)?q=x&v=2>)"));
  assert(!createFindingMarkdown({ ...finding, summary: "<script>alert(1)</script>" }).includes("<script>"));
});
test("HTTP(S)以外の出典は原題だけ残す", () => {
  const md = createFindingMarkdown({ ...finding, sources: [{title: "危険なURL", url: "javascript:alert(1)"}] });
  assert(md.includes("危険なURL")); assert(!md.includes("javascript:"));
});
test("省略可能な項目がない記録と、関連する記録を扱う", () => {
  const md = createFindingMarkdown({ ...finding, whyItMatters: undefined, tags: [] }, [{ ...finding, id: "related", title: "関連項目" }]);
  assert(!md.includes("## 所感")); assert(!md.includes("タグ:"));
  assert(md.includes("[関連項目](https://findings.yatabis.dev/findings/related.md)"));
});
test("記録一覧は全件を新しい順に並べ、0件も扱う", () => {
  const old = { ...finding, id: "older", date: "2026-09-12" };
  const index = createFindingIndex([old, finding]);
  assert(index.indexOf("test-finding.md") < index.indexOf("older.md"));
  assert(createFindingIndex([]).startsWith("# daily-findings"));
});
test("IDのパスへの混入を拒否する", () => {
  assert.equal(markdownPath(finding.id), "/findings/test-finding.md");
  assert.throws(() => markdownPath("../secret"));
});
test("llms.txtは短い案内として読み口と評価の前提を示す", () => {
  const text = createLlmsTxt();
  assert(text.startsWith("# daily-findings\n\n> "));
  for (const value of ["index.md", "rss.xml", "sitemap.xml", "TRYは実測済みを意味しません", "ChatGPT"]) assert(text.includes(value));
  assert(text.length < 2000);
});
