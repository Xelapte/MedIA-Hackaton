import { NewsPayload, Verdict } from "@/types";

const VERDICT_PRIORITY: Verdict[] = ["False", "Misleading", "Unverifiable", "True"];

/**
 * An article carries multiple source-level verdicts. Surface the least
 * favorable one on the card so a single misleading source can't hide behind
 * otherwise-true ones.
 */
export function overallVerdict(item: Pick<NewsPayload, "sources_used">): Verdict {
  const verdicts = item.sources_used?.map((s) => s.verdict) ?? [];
  if (verdicts.length === 0) return "Unverifiable";
  for (const v of VERDICT_PRIORITY) {
    if (verdicts.includes(v)) return v;
  }
  return "Unverifiable";
}

export const DEFAULT_CATEGORIES = ["Politics", "Health", "Technology", "Global"];

export function categoriesFrom(items: NewsPayload[]): string[] {
  const seen = new Set(items.map((i) => i.category).filter(Boolean));
  return seen.size > 0 ? Array.from(seen) : DEFAULT_CATEGORIES;
}
