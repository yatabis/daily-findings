import assert from "node:assert/strict";
import test from "node:test";
import {
  SITE_URL, RSS_LIMIT, canonicalUrl, findingUrl, escapeXml,
  createRss, createSitemap, feedFindings,
} from "../src/lib/publication.mjs";

const finding = {
  id: "example-finding", date: "2026-09-13", title: "日本語の更新 & 比較",
  summary: "<script>alert(1)</script> と & の扱い。",
  whyItMatters: '「検証」を残す。"引用"と\'記号\'。', status: "WATCH",
  tags: ["MLX", "A&B"], sources: [
    { title: "公式 & 資料", url: "https://example.com/?a=1&b=2" },
  ],
};

test("正式URLを正規化し、不正なIDを拒否する", () => {
  assert.equal(canonicalUrl("/"), SITE_URL);
  assert.equal(canonicalUrl("/findings/example-finding?utm_source=test#part"), findingUrl(finding.id));
  assert.throws(() => canonicalUrl("https://other.example/"));
  assert.throws(() => findingUrl("../wrong"));
});

test("RSSでは入力文字列を安全にエスケープする", () => {
  assert.equal(escapeXml(`<>&"'`), "&lt;&gt;&amp;&quot;&apos;");
  const xml = createRss([finding]);
  assert(xml.includes("日本語の更新 &amp; 比較"));
  assert(!xml.includes("<script>"));
  assert(xml.includes("所感"));
  assert(xml.includes("情報源"));
});

test("RSSのGUIDは本文編集で変わらない", () => {
  const guid = (xml) => xml.match(/<guid[^>]*>([^<]*)<\/guid>/u)?.[1];
  assert.equal(guid(createRss([finding])), "daily-findings:example-finding");
  assert.equal(guid(createRss([finding])), guid(createRss([{ ...finding, title: "変更後" }])));
});

test("RSSの日付は記録日のJST基準で表す", () => {
  const xml = createRss([finding]);
  assert(xml.includes("<pubDate>Sat, 12 Sep 2026 15:00:00 GMT</pubDate>"));
  assert(!xml.includes("lastBuildDate"));
});

test("RSSは新しい順の最新50件に限定する", () => {
  const rows = Array.from({ length: RSS_LIMIT + 3 }, (_, i) => ({
    ...finding, id: `finding-${String(i).padStart(3, "0")}`,
    date: i === 0 ? "2026-09-12" : "2026-09-13",
  })).reverse();
  assert.equal(feedFindings(rows).length, RSS_LIMIT);
  assert.equal(feedFindings(rows)[0].id, "finding-001");
  assert.equal((createRss(rows).match(/<item>/gu) ?? []).length, RSS_LIMIT);
});

test("同じ記録日では追加時刻の新しいFindingを先に並べる", () => {
  const rows = [
    { ...finding, id: "legacy" },
    { ...finding, id: "older", createdAt: "2026-09-13T01:00:00Z" },
    { ...finding, id: "newer", createdAt: "2026-09-13T02:00:00Z" },
  ];
  assert.deepEqual(feedFindings(rows).map((item) => item.id), ["newer", "older", "legacy"]);
});

test("HTTP(S)以外の情報源URLはRSSにリンクとして出さない", () => {
  const xml = createRss([{ ...finding, sources: [{ title: "原題", url: "javascript:alert(1)" }] }]);
  assert(!xml.includes("javascript:"));
  assert(xml.includes("原題"));
});

test("サイトマップはトップと全Findingだけを含む", () => {
  const xml = createSitemap([finding]);
  assert.equal((xml.match(/<loc>/gu) ?? []).length, 2);
  assert(xml.includes(`<loc>${findingUrl(finding.id)}</loc>`));
  assert(!xml.includes("404"));
  assert(!xml.includes("lastmod"));
  assert(!xml.includes("rss.xml"));
});

test("0件でもRSSとサイトマップを生成できる", () => {
  assert(createRss([]).includes("<channel>"));
  assert(!createRss([]).includes("<item>"));
  assert.equal((createSitemap([]).match(/<loc>/gu) ?? []).length, 1);
});
