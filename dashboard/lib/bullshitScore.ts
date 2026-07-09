import { NewsPayload } from "@/types";
import { normalizeVerdict, overallVerdict } from "./verdict";

export interface BullshitScoreResult {
  // 0-100, higher = more full of it. null = not enough fact-checked
  // stories yet to say anything meaningful.
  score: number | null;
  count: number;
  trueCount: number;
  falseCount: number;
  misleadingCount: number;
  unverifiableCount: number;
}

const MIN_SAMPLE_SIZE = 3;

// Per-source accuracy on a [-1, +1] scale. Unverifiable is deliberately
// excluded from this table — "we found no evidence either way" isn't
// evidence of wrongdoing, so it's handled separately below rather than
// docked like a wrong claim.
const SOURCE_ACCURACY: Record<string, number> = {
  True: 1,
  Misleading: -0.5,
  False: -1,
};

// A story where every single source came back Unverifiable isn't neutral —
// vague, unfalsifiable claims are themselves a mild credibility flag — but
// it's a much smaller penalty than an actually-debunked claim.
const ALL_UNVERIFIABLE_ACCURACY = -0.3;

// A false claim on a huge story should hurt far more than a false claim on
// something trivial ("Important+++ news with Fake information =
// reputation---") — so every story's contribution is scaled by that story's
// gravity (1-10) and by the fact-checker's own confidence in the ruling (a
// shaky 55%-confidence call shouldn't swing the score as hard as a
// 95%-confidence one — confidence_score was already being captured from the
// LLM and shown per-article, but previously thrown away when it came to the
// aggregate grade, which was the main source of "too punitive": one
// borderline call could land with full force). Negative outcomes are then
// weighted twice as heavily as positive ones reward, on the theory that
// broadcasting misinformation is worse than accurate reporting is good —
// asymmetric on purpose, not a bug.
const NEGATIVE_ASYMMETRY = 2;

// A story's accuracy is the average across every one of its checked
// sources, not just the single worst verdict — a claim backed by three True
// sources and one Misleading one is mostly true, not fully misleading. The
// old "worst verdict wins" approach threw away that nuance and is the other
// half of why the score felt too punitive.
function storyAccuracy(item: NewsPayload): number {
  const checked = (item.sources_used ?? [])
    .map((s) => normalizeVerdict(s.verdict))
    .filter((v) => v !== "Unverifiable")
    .map((v) => SOURCE_ACCURACY[v]);
  if (checked.length === 0) return ALL_UNVERIFIABLE_ACCURACY;
  return checked.reduce((sum, v) => sum + v, 0) / checked.length;
}

export function computeBullshitScore(items: NewsPayload[]): BullshitScoreResult {
  let trueCount = 0;
  let falseCount = 0;
  let misleadingCount = 0;
  let unverifiableCount = 0;
  let totalDelta = 0;

  for (const item of items) {
    // Classification for the count fields still uses "worst verdict on this
    // story" — that's a useful, honest signal ("this story had at least one
    // false source in it") distinct from the smoother accuracy score below.
    const verdict = overallVerdict(item);
    if (verdict === "True") trueCount++;
    else if (verdict === "False") falseCount++;
    else if (verdict === "Misleading") misleadingCount++;
    else unverifiableCount++;

    const accuracy = storyAccuracy(item);
    const confidence = Math.min(1, Math.max(0, (item.confidence_score || 0) / 100));
    const gravityWeight = Math.min(10, Math.max(1, item.news_value_importance || 1)) / 10;
    const asymmetry = accuracy < 0 ? NEGATIVE_ASYMMETRY : 1;

    totalDelta += accuracy * asymmetry * confidence * gravityWeight;
  }

  const count = items.length;
  if (count < MIN_SAMPLE_SIZE) {
    return { score: null, count, trueCount, falseCount, misleadingCount, unverifiableCount };
  }

  // avgDelta ranges roughly [-2, +1] per story; map to a 0-100 scale where
  // 0 delta (mixed/neutral record) sits at the midpoint.
  const avgDelta = totalDelta / count;
  const score = Math.round(Math.min(100, Math.max(0, 50 - avgDelta * 25)));

  return { score, count, trueCount, falseCount, misleadingCount, unverifiableCount };
}

export function bullshitRatingKey(score: number): string {
  if (score < 20) return "bs.rating.trustworthy";
  if (score < 40) return "bs.rating.mostlyReliable";
  if (score < 60) return "bs.rating.mixed";
  if (score < 80) return "bs.rating.questionable";
  return "bs.rating.unreliable";
}

export interface CategoryScore extends BullshitScoreResult {
  category: string;
}

// A station can be scrupulous on Sports and reckless on Politics — a single
// blended score hides that entirely. Score each topic independently from
// only that topic's stories, so a station's record on Finance says nothing
// about its record on Immigration.
export function computeBullshitScoresByCategory(items: NewsPayload[]): CategoryScore[] {
  const byCategory = new Map<string, NewsPayload[]>();
  for (const item of items) {
    const category = item.category || "General";
    const list = byCategory.get(category) ?? [];
    list.push(item);
    byCategory.set(category, list);
  }

  const results: CategoryScore[] = [];
  byCategory.forEach((categoryItems, category) => {
    results.push({ category, ...computeBullshitScore(categoryItems) });
  });

  // Worst score first (the most useful signal for a fact-checking tool),
  // then topics still short on data, most-covered first.
  results.sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.score === null && b.score === null) return b.count - a.count;
    return a.score === null ? 1 : -1;
  });

  return results;
}
