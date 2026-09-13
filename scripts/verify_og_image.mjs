import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { headTags } from "./verify_publication.mjs";
import { SITE_URL } from "../src/lib/publication.mjs";
import { DEFAULT_OG_IMAGE } from "../src/lib/og-image.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
const approvedSha256 = "e001073202874f5283be04b6026305be5a6c8fd88babcb3580969714d0ebcd96";

function pngDimensions(bytes) {
  assert(bytes.length >= 33 && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", "OGP画像がPNGではありません。");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

function uniqueTag(tags, attribute, key) {
  const matches = tags.filter((tag) => tag[attribute] === key);
  assert.equal(matches.length, 1, `${key}が一意ではありません。`);
  return matches[0].content;
}

async function main() {
  const source = await readFile(new URL("public/og/default.png", root));
  const served = await readFile(new URL("og/default.png", output));
  assert.equal(createHash("sha256").update(source).digest("hex"), approvedSha256, "承認済みOGP画像とハッシュが一致しません。");
  assert(source.equals(served), "OGP画像のコピー結果が原本と一致しません。");
  assert.deepEqual(pngDimensions(served), [DEFAULT_OG_IMAGE.width, DEFAULT_OG_IMAGE.height]);

  let count = 0;
  for (const file of await htmlFiles(output)) {
    const tags = headTags(await readFile(file, "utf8"));
    if (file.pathname.endsWith("/404.html")) {
      assert(!tags.some((tag) => tag.property === "og:image" || tag.name === "twitter:image"));
      continue;
    }
    const image = uniqueTag(tags, "property", "og:image");
    const url = new URL(image);
    assert.equal(url.origin, new URL(SITE_URL).origin);
    assert(url.pathname.startsWith("/og/") && !url.search && !url.hash);
    const bytes = await readFile(new URL(`.${url.pathname}`, output));
    const [width, height] = pngDimensions(bytes);
    assert.equal(uniqueTag(tags, "property", "og:image:width"), String(width));
    assert.equal(uniqueTag(tags, "property", "og:image:height"), String(height));
    assert.equal(uniqueTag(tags, "property", "og:image:type"), "image/png");
    const alt = uniqueTag(tags, "property", "og:image:alt");
    assert(alt.trim());
    assert.equal(uniqueTag(tags, "name", "twitter:card"), "summary_large_image");
    assert.equal(uniqueTag(tags, "name", "twitter:image"), image);
    assert.equal(uniqueTag(tags, "name", "twitter:image:alt"), alt);
    assert.equal(uniqueTag(tags, "name", "twitter:title"), uniqueTag(tags, "property", "og:title"));
    assert.equal(uniqueTag(tags, "name", "twitter:description"), uniqueTag(tags, "property", "og:description"));
    count++;
  }
  assert(count > 0);
  console.log(`${count}ページのOGP画像指定と承認画像の一致を確認しました。`);
}
main().catch((error) => {
  console.error("OGP画像の検証に失敗しました:", error.message);
  process.exitCode = 1;
});
