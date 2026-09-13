import { defineConfig } from "astro/config";
import { SITE_URL } from "./src/lib/publication.mjs";

export default defineConfig({
  site: SITE_URL,
  output: "static",
});
