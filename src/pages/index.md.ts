import { getFindings } from "../lib/findings";
import { createFindingIndex } from "../lib/agent-content.mjs";

export async function GET() {
  return new Response(createFindingIndex(await getFindings()), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
