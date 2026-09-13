import { getFindings } from "../lib/findings";
import { createRss } from "../lib/publication.mjs";

export async function GET() {
  return new Response(createRss(await getFindings()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
