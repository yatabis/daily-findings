import { getFindings } from "../lib/findings";
import { createSitemap } from "../lib/publication.mjs";

export async function GET() {
  return new Response(createSitemap(await getFindings()), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
