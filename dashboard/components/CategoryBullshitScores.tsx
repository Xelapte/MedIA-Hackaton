import { useLanguage } from "@/lib/LanguageContext";
import { translateCategory } from "@/lib/i18n";
import { CategoryScore } from "@/lib/bullshitScore";
import BullshitScoreBadge from "./BullshitScoreBadge";

export default function CategoryBullshitScores({ scores }: { scores: CategoryScore[] }) {
  const { lang } = useLanguage();

  if (scores.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scores.map((s) => (
        <div key={s.category} className="rounded-md border border-ink/10 bg-card p-3">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {translateCategory(lang, s.category)}
          </p>
          <BullshitScoreBadge result={s} size="sm" />
        </div>
      ))}
    </div>
  );
}
