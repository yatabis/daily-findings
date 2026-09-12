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

test("正式URLは末尾スラッシュを統一し、クエリとフラグメントを除く", () => {
  assert.equal(canonicalUrl("/"), SITE_URL);
  assert.equal(canonicalUrl("/findings/example-finding?utm_source=test#part"), findingUrl(finding.id));
  assert.throws(() => canonicalUrl("https://other.example/"));
  assert.throws(() => findingUrl("../wrong"));
});

test("XMLとHTMLへ入力された記号を文字列として渡す", () => {
  assert.equal(escapeXml(`<>&"'`), "&lt;&gt;&amp;&quot;&apos;");
  assert.equal(escapeXml("a\u0001b"), "ab");
  const xml = createRss([finding]);
  assert(xml.includes("日本語の更新 &amp; 比較"));
  assert(!xml.includes("<script>"));
  assert(xml.includes("&amp;lt;script&amp;gt;"));
  assert(xml.includes("a=1&amp;amp;b=2"));
  assert(xml.includes("所感"));
  assert(xml.includes("情報源"));
});

test("RSSの識別子は内容編集や再ビルドで変化しない", () => {
  const guid = (xml) => xml.match(/<guid[^>]*>([^<]*)<\/guid>/u)?.[1];
  assert.equal(guid(createRss([finding])), guid(createRss([{ ...finding, title: "変更後" }])));
  assert.equal(guid(createRss([finding])), "daily-findings:example-finding");
  assert.equal(createRss([finding]), createRss([finding]));
});

test("記録日をJST基準で表し、原記事の公開日やビルド時刻を使わない", () => {
  assert(createRss([finding]).includes("<pubDate>Sat, 12 Sep 2026 15:00:00 GMT</pubDate>"));
  assert(!createRss([finding]).includes("lastBuildDate"));
});

test("RSSは新しい順の最新50件で、同日の順番も一定", () => {
  const rows = Array.from({ length: RSS_LIMIT + 3 }, (_, i) => ({
    ...finding, id: `finding-${String(i).padStart(3, "0")}`,
    date: i === 0 ? "2026-09-12" : "2026-09-13",
  })).reverse();
  assert.equal(feedFindings(rows).length, RSS_LIMIT);
  assert.equal(feedFindings(rows)[0].id, "finding-001");
  assert.equal((createRss(rows).match(/<item>/gu) ?? []).length, RSS_LIMIT);
  assert.equal(rows.length, RSS_LIMIT + 3);
});

test("情報源の実行可能なURLはフィードのリンクにしない", () => {
  const xml = createRss([{ ...finding, sources: [{ title: "原題", url: "javascript:alert(1)" }] }]);
  assert(!xml.includes("javascript:"));
  assert(xml.includes("原題"));
});

test("サイトマップはトップと全記事のみで、未確認の更新日時を出さない", () => {
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
