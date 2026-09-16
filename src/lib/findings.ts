import { compareFindingRecency, findingRecordDate } from "./publication.mjs";

export type FindingStatus = "TRY" | "WATCH" | "HOLD";

export interface FindingSource {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
}

export interface Finding {
  id: string;
  recordedAt?: string;
  date?: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  status: FindingStatus;
  tags?: string[];
  relatedFindingIds?: string[];
  sources: FindingSource[];
}

// ビルド後のモジュール位置ではなく、プロジェクトルートを基準に取り込む。
const findingModules = import.meta.glob<Finding>("/content/findings/*.json", {
  eager: true,
  import: "default",
});

export async function getFindings(): Promise<Finding[]> {
  return Object.values(findingModules).sort(compareFindingRecency);
}

export async function getFinding(id: string): Promise<Finding | undefined> {
  const findings = await getFindings();
  return findings.find((finding) => finding.id === id);
}

export function getFindingDate(finding: Finding): string {
  return findingRecordDate(finding);
}

export function formatFindingDate(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${date}T00:00:00+09:00`));
}
