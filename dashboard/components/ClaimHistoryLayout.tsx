"use client";

import { NewsPayload } from "@/types";
import { useLanguage } from "@/lib/LanguageContext";
import { CategoryScore } from "@/lib/bullshitScore";
import ClaimAnalysis from "./ClaimAnalysis";
import CategoryBullshitScores from "./CategoryBullshitScores";
import HistoryRow from "./HistoryRow";

// The 3-pane "History | Claim Analysis | Statistics" layout shared by the
// radio station page and the live interview page — a list of claims to pick
// from, the full breakdown of whichever one is selected, and a by-topic
// score summary for whatever set of claims is being shown.
export default function ClaimHistoryLayout({
  stories,
  selectedId,
  onSelect,
  categoryScores,
}: {
  stories: NewsPayload[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  categoryScores: CategoryScore[];
}) {
  const { t } = useLanguage();
  const selected = stories.find((s) => s.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          {t("radio.history")}
        </h2>
        <div className="flex flex-col gap-2">
          {stories.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              // `id` is optional on NewsPayload's type only because it's
              // absent before insertArticle() assigns one — every story
              // returned by /api/webhook already has one.
              onSelect={() => onSelect(item.id as string)}
            />
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          {t("radio.claimAnalysis")}
        </h2>
        {selected && <ClaimAnalysis item={selected} headingLevel="h2" />}
      </section>

      <aside className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          {t("radio.statistics")}
        </h2>
        {categoryScores.length > 0 && (
          <>
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              {t("bs.byTopic")}
            </p>
            <CategoryBullshitScores scores={categoryScores} className="flex flex-col gap-3" />
          </>
        )}
      </aside>
    </div>
  );
}
