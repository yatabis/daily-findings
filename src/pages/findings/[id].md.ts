import type { APIRoute } from "astro";
import { getFindings, type Finding } from "../../lib/findings";
import { createFindingMarkdown } from "../../lib/agent-content.mjs";

export async function getStaticPaths() {
  const findings = await getFindings();
  const byId = new Map(findings.map((finding) => [finding.id, finding]));
  return findings.map((finding) => ({
    params: { id: finding.id },
    props: {
      finding,
      related: [...new Set(finding.relatedFindingIds ?? [])]
        .filter((id) => id !== finding.id)
        .map((id) => byId.get(id))
        .filter((item): item is Finding => item !== undefined),
    },
  }));
}

export const GET: APIRoute = ({ props }) => new Response(
  createFindingMarkdown(props.finding, props.related),
  { headers: { "Content-Type": "text/markdown; charset=utf-8" } },
);
