import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export type FindingStatus = "TRY" | "WATCH" | "HOLD";

export interface FindingSource {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
}

export interface Finding {
  id: string;
  date: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  status: FindingStatus;
  tags?: string[];
  relatedFindingIds?: string[];
  sources: FindingSource[];
}

const findingsDirectory = fileURLToPath(
  new URL("../../content/findings/", import.meta.url),
);

export async function getFindings(): Promise<Finding[]> {
  let fileNames: string[];

  try {
    fileNames = await readdir(findingsDirectory);
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return [];
    }
    throw error;
  }

  const findings = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map(async (fileName) => {
        const raw = await readFile(`${findingsDirectory}${fileName}`, "utf8");
        return JSON.parse(raw) as Finding;
      }),
  );

  return findings.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : a.title.localeCompare(b.title, "ja");
  });
}

export async function getFinding(id: string): Promise<Finding | undefined> {
  const findings = await getFindings();
  return findings.find((finding) => finding.id === id);
}

export function formatFindingDate(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function isMissingDirectoryError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
