import { NewsPayload, TrustLevel, Verdict } from "@/types";

const VERDICT_PRIORITY: Verdict[] = ["False", "Misleading", "Unverifiable", "True"];

/**
 * The fact-checking LLM is instructed to return one of the four exact enum
 * values, but sometimes pads it with an explanation (e.g. "False (opened in
 * 1998, not 2012)"). Normalize by prefix match so display doesn't break when
 * the wire format drifts from the contract.
 */
export function normalizeVerdict(raw: string): Verdict {
  const lower = raw.toLowerCase().trim();
  if (lower.startsWith("false")) return "False";
  if (lower.startsWith("true")) return "True";
  if (lower.startsWith("mislead")) return "Misleading";
  return "Unverifiable";
}

/**
 * An article carries multiple source-level verdicts. Surface the least
 * favorable one on the card so a single misleading source can't hide behind
 * otherwise-true ones.
 */
export function overallVerdict(item: Pick<NewsPayload, "sources_used">): Verdict {
  const verdicts = item.sources_used?.map((s) => normalizeVerdict(s.verdict)) ?? [];
  if (verdicts.length === 0) return "Unverifiable";
  for (const v of VERDICT_PRIORITY) {
    if (verdicts.includes(v)) return v;
  }
  return "Unverifiable";
}

/** Same drift-tolerance as normalizeVerdict, for the article-level trust_level field. */
export function normalizeTrustLevel(raw: string): TrustLevel {
  const lower = raw.toLowerCase().trim();
  if (lower.startsWith("high")) return "High";
  if (lower.startsWith("medium")) return "Medium";
  if (lower.startsWith("low")) return "Low";
  return "Unverifiable";
}

export const DEFAULT_CATEGORIES = ["Politics", "Health", "Technology", "Global"];

export function categoriesFrom(items: NewsPayload[]): string[] {
  const seen = new Set(items.map((i) => i.category).filter(Boolean));
  return seen.size > 0 ? Array.from(seen) : DEFAULT_CATEGORIES;
}
