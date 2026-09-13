import { SITE_URL } from "./publication.mjs";

/**
 * @typedef {Object} OgImage
 * @property {string} src /og/配下の配信パス
 * @property {number} width 実画像の幅
 * @property {number} height 実画像の高さ
 * @property {string} alt 画像の内容を表す代替テキスト
 * @property {"image/png"} type
 */

/** @type {Readonly<OgImage>} */
export const DEFAULT_OG_IMAGE = Object.freeze({
  src: "/og/default.png",
  width: 1200,
  height: 630,
  alt: "望遠鏡のマークとdaily-findingsのサイト名",
  type: "image/png",
});

/** ページ別の画像を指定できる。未指定のページには承認済みの共通画像を使う。 */
export function resolveOgImage(image = DEFAULT_OG_IMAGE) {
  if (!image || typeof image.src !== "string" || !image.src.startsWith("/og/")) {
    throw new TypeError("OGP画像は/og/配下の配信パスで指定してください。");
  }
  const url = new URL(image.src, SITE_URL);
  if (url.origin !== new URL(SITE_URL).origin || !url.pathname.startsWith("/og/") || url.search || url.hash) {
    throw new TypeError("OGP画像には正規ドメイン内の画像パスだけを指定できます。");
  }
  for (const dimension of [image.width, image.height]) {
    if (!Number.isSafeInteger(dimension) || dimension <= 0) {
      throw new TypeError("OGP画像の幅と高さには正の整数が必要です。");
    }
  }
  if (typeof image.alt !== "string" || !image.alt.trim()) {
    throw new TypeError("OGP画像の代替テキストが必要です。");
  }
  if (image.type !== "image/png") {
    throw new TypeError("OGP画像の形式が不正です。");
  }
  return { ...image, url: url.href };
}
