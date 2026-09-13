import { SITE_URL, SITE_TITLE, findingUrl } from "./publication.mjs";

/** 記録中の文字をMarkdownの記法やHTMLとして実行しない。 */
export function markdownText(value) {
  return String(value).replace(/\r\n?/gu, "\n")
    .replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
    .replace(/([\\`*_[\]#|])/gu, "\\$1");
}
const inline = (value) => markdownText(String(value).replace(/\s+/gu, " ").trim());

export function markdownPath(id) {
  findingUrl(id);
  return `/findings/${id}.md`;
}
const markdownUrl = (id) => new URL(markdownPath(id), SITE_URL).href;

function sourceLink(source) {
  const title = inline(source.title);
  try {
    const url = new URL(source.url);
    if (["https:", "http:"].includes(url.protocol)) {
      const href = url.href.replace(/</gu, "%3C").replace(/>/gu, "%3E");
      return `[${title}](<${href}>)`;
    }
  } catch { /* リンクにできない場合も出典名は残す。 */ }
  return title;
}

export function createFindingMarkdown(finding, related = []) {
  const lines = [
    `# ${inline(finding.title)}`, "",
    `記録日: ${inline(finding.date)}`, "",
    `分類: ${inline(finding.status)}`, "",
    `正規URL: ${findingUrl(finding.id)}`, "",
    "## 概要", "", markdownText(finding.summary), "",
  ];
  if (finding.whyItMatters) lines.push("## 所感", "", markdownText(finding.whyItMatters), "");
  if (finding.tags?.length) lines.push(`タグ: ${finding.tags.map(inline).join(", ")}`, "");
  lines.push("## 情報源", "");
  for (const source of finding.sources) {
    const meta = [source.publisher && inline(source.publisher),
      source.publishedAt && `公開日: ${inline(source.publishedAt)}`].filter(Boolean);
    lines.push(`- ${sourceLink(source)}${meta.length ? ` — ${meta.join(" / ")}` : ""}`);
  }
  if (related.length) {
    lines.push("", "## 関連する記録", "");
    for (const item of related) lines.push(`- [${inline(item.title)}](${markdownUrl(item.id)})`);
  }
  return lines.join("\n") + "\n";
}

export function createFindingIndex(findings) {
  const items = [...findings].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return [`# ${SITE_TITLE} — 記録一覧`, "",
    "記録日の新しい順です。各リンクは本文・所感・情報源を含むMarkdown版です。", "",
    ...items.map((f) => `- [${inline(f.title)}](${markdownUrl(f.id)}): ${inline(f.date)} / ${inline(f.status)}${f.tags?.length ? ` / ${f.tags.map(inline).join(", ")}` : ""}`), "",
  ].join("\n");
}

export function createLlmsTxt() {
  return `# ${SITE_TITLE}

> yatabisの関心に沿って、ChatGPTのウォッチタスクが収集したAI・ローカル推論・モデル・ツールの更新と所感を公開するログです。

各記録の概要は参照元の情報の要約、所感はその情報への評価・解釈です。記録日は収集時点の日付であり、情報源の公開日や最終更新日時ではありません。

TRYは試す価値がある候補、WATCHは今すぐ試さないが追う価値があるもの、HOLDは具体的な阻害要因がある保留です。収集時点の関心・環境に基づく分類であり、TRYは実測済みを意味しません。現在の状況や詳しい根拠は、各記録の情報源で確認できます。

## 記録を読む

- [記録一覧（Markdown）](${SITE_URL}index.md): 全記録のタイトル・記録日・分類・タグ。各リンク先に概要・所感・情報源があります。
- [新着RSS](${SITE_URL}rss.xml): 最新50件。概要・所感・分類・情報源を含みます。
- [サイトマップ](${SITE_URL}sitemap.xml): トップと各記録の正規HTML URL。

## 公開元

- [サイト](${SITE_URL}): 人間向けの一覧。
- [原本リポジトリ](https://github.com/yatabis/daily-findings): content/findings/のJSONからHTML・RSS・Markdownを生成しています。
`;
}
