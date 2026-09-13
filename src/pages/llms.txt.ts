import { createLlmsTxt } from "../lib/agent-content.mjs";

export function GET() {
  return new Response(createLlmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
