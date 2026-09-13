import { SITE_URL, SITE_TITLE, findingUrl } from "./publication.mjs";

function text(value) {
  return String(value)
    .replace(/\r\n?/gu, "\n")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/([\\`*_[\]#|])/gu, "\\$1");
}

const inline = (value) => text(String(value).replace(/\s+/gu, " ").trim());
const markdownUrl = (id) => new URL(`/findings/${id}.md`, SITE_URL).href;

function sourceLine(source) {
  const title = inline(source.title);
  let link = title;
  try {
    const url = new URL(source.url);
    if (url.protocol === "https:" || url.protocol === "http:") {
      link = `[${title}](<${url.href.replace(/</gu, "%3C").replace(/>/gu, "%3E")}>)`;
    }
  } catch {
    // URLとして扱えない場合も出典名は残す。
  }
  const meta = [source.publisher && inline(source.publisher), source.publishedAt && `公開日: ${inline(source.publishedAt)}`].filter(Boolean);
  return `- ${link}${meta.length ? ` — ${meta.join(" / ")}` : ""}`;
}

export function createFindingMarkdown(finding, related = []) {
  const lines = [
    `# ${inline(finding.title)}`,
    "",
    `記録日: ${inline(finding.date)}`,
    `分類: ${inline(finding.status)}`,
    `正規URL: ${findingUrl(finding.id)}`,
    "",
    "## 概要",
    "",
    text(finding.summary),
  ];

  if (finding.whyItMatters) lines.push("", "## 所感", "", text(finding.whyItMatters));
  if (finding.tags?.length) lines.push("", `タグ: ${finding.tags.map(inline).join(", ")}`);

  lines.push("", "## 情報源", "", ...finding.sources.map(sourceLine));

  if (related.length) {
    lines.push("", "## 関連する記録", "", ...related.map((item) => `- [${inline(item.title)}](${markdownUrl(item.id)})`));
  }

  return `${lines.join("\n")}\n`;
}

export function createFindingIndex(findings) {
  const items = [...findings].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return [
    `# ${SITE_TITLE} — 記録一覧`,
    "",
    "記録日の新しい順です。各リンク先に概要・所感・情報源があります。",
    "",
    ...items.map((finding) => `- [${inline(finding.title)}](${markdownUrl(finding.id)}): ${inline(finding.date)} / ${inline(finding.status)}${finding.tags?.length ? ` / ${finding.tags.map(inline).join(", ")}` : ""}`),
    "",
  ].join("\n");
}
