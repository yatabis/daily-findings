import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_OG_IMAGE, resolveOgImage } from "../src/lib/og-image.mjs";

test("画像未指定なら承認済みの共通OGPと正規URLを使う", () => {
  const image = resolveOgImage();
  assert.equal(image.url, "https://findings.yatabis.dev/og/default.png");
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(image.type, "image/png");
  assert(image.alt.includes("望遠鏡"));
});

test("ページ別画像は寸法と代替テキストを含めて差し替えられる", () => {
  const image = resolveOgImage({ src: "/og/findings/example.png", width: 1000, height: 525, alt: "記事のタイトル", type: "image/png" });
  assert.equal(image.url, "https://findings.yatabis.dev/og/findings/example.png");
  assert.equal(image.width, 1000);
  assert.equal(image.height, 525);
  assert.equal(image.alt, "記事のタイトル");
});

test("画像URLへ外部ホストやプレビューのホストを持ち込まない", () => {
  for (const src of ["https://example.com/a.png", "//example.com/a.png", "javascript:alert(1)", "/og/../../a.png", "/og/a.png?q=1", "/og/a.png#x"]) {
    assert.throws(() => resolveOgImage({ ...DEFAULT_OG_IMAGE, src }));
  }
});

test("実画像の寸法を省略したり不正な数値にしたりできない", () => {
  for (const width of [undefined, 0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => resolveOgImage({ ...DEFAULT_OG_IMAGE, width }));
  }
  assert.throws(() => resolveOgImage({ ...DEFAULT_OG_IMAGE, height: 0 }));
});

test("形式と代替テキストを検証する", () => {
  assert.throws(() => resolveOgImage({ ...DEFAULT_OG_IMAGE, type: "text/html" }));
  assert.throws(() => resolveOgImage({ ...DEFAULT_OG_IMAGE, alt: " " }));
});

test("共通設定と呼び出し側の画像情報を変更しない", () => {
  const original = { ...DEFAULT_OG_IMAGE };
  resolveOgImage(original);
  assert.deepEqual(original, DEFAULT_OG_IMAGE);
  assert(Object.isFrozen(DEFAULT_OG_IMAGE));
});
