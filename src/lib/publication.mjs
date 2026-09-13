export const SITE_URL = "https://findings.yatabis.dev/";
export const SITE_TITLE = "daily-findings";
export const SITE_DESCRIPTION = "AIやローカル推論などのウォッチから残したFindingのログ。";
export const RSS_LIMIT = 50;

/** XMLの本文・属性と、RSSに含めるHTMLの文字列をエスケープする。 */
export function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/gu, "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

export function findingUrl(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error(`FindingのIDが不正です: ${id}`);
  }
  return new URL(`findings/${id}/`, SITE_URL).href;
}

/** クエリ・フラグメントやプレビューのホスト名を正式URLへ持ち込まない。 */
export function canonicalUrl(pathname) {
  const url = new URL(pathname, SITE_URL);
  if (url.origin !== new URL(SITE_URL).origin) {
    throw new Error("正式URLに別のドメインは指定できません。");
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/") && !url.pathname.split("/").pop().includes(".")) {
    url.pathname += "/";
  }
  return url.href;
}

export function feedFindings(findings) {
  return [...findings]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, RSS_LIMIT);
}

function sourceHtml(source) {
  const title = escapeXml(source.title);
  // フィードリーダーへ実行可能なURLを渡さない。HTTP(S)以外は原題だけを表示する。
  try {
    const url = new URL(source.url);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return `<li><a href="${escapeXml(url.href)}">${title}</a></li>`;
    }
  } catch {
    // リンクにできない情報源も、原題は残す。
  }
  return `<li>${title}</li>`;
}

function findingHtml(finding) {
  const parts = [
    `<p>${escapeXml(finding.status)} · 記録日 ${escapeXml(finding.date)}</p>`,
    `<p>${escapeXml(finding.summary)}</p>`,
  ];
  if (finding.whyItMatters) {
    parts.push(`<h2>所感</h2><p>${escapeXml(finding.whyItMatters)}</p>`);
  }
  parts.push(`<h2>情報源</h2><ul>${finding.sources.map(sourceHtml).join("")}</ul>`);
  return parts.join("");
}

export function createRss(findings) {
  const items = feedFindings(findings).map((finding) => {
    // 原本には日付だけがあるため、記録日のJST 00:00として表す。原記事の公開日時ではない。
    const recordedDate = new Date(`${finding.date}T00:00:00+09:00`);
    if (Number.isNaN(recordedDate.valueOf())) throw new Error(`記録日が不正です: ${finding.date}`);
    return `<item>
<title>${escapeXml(finding.title)}</title>
<link>${escapeXml(findingUrl(finding.id))}</link>
<guid isPermaLink="false">daily-findings:${escapeXml(finding.id)}</guid>
<pubDate>${recordedDate.toUTCString()}</pubDate>
<description>${escapeXml(finding.summary)}</description>
<content:encoded>${escapeXml(findingHtml(finding))}</content:encoded>
${(finding.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n")}
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${escapeXml(SITE_TITLE)}</title>
<link>${SITE_URL}</link>
<description>${escapeXml(SITE_DESCRIPTION)}</description>
<language>ja</language>
<atom:link href="${SITE_URL}rss.xml" rel="self" type="application/rss+xml" />
${items.join("\n")}
</channel>
</rss>\n`;
}

export function createSitemap(findings) {
  const urls = [SITE_URL, ...findings.map((finding) => findingUrl(finding.id)).sort()];
  if (urls.length > 50_000) throw new Error("サイトマップを50,000URL以下に分割する必要があります。");
  // 記録日を更新日へ流用しない。実際の更新日時を管理していないためlastmodは出力しない。
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("\n")}
</urlset>\n`;
}
