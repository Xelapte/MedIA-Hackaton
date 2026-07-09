import { useLanguage } from "@/lib/LanguageContext";
import { BullshitScoreResult, bullshitRatingKey } from "@/lib/bullshitScore";

// Unlike GravityMeter (a separate "how big is this story" axis, deliberately
// kept off verdict colors), this score IS an aggregate of truthfulness — so
// reusing the verdict-true/misleading/false ramp here is the correct color
// job, not a reused status color for an unrelated series.
function bandColor(score: number): string {
  if (score < 20) return "bg-verdict-true";
  if (score < 40) return "bg-verdict-true/70";
  if (score < 60) return "bg-verdict-misleading";
  if (score < 80) return "bg-verdict-misleading/80";
  return "bg-verdict-false";
}

function bandTextColor(score: number): string {
  if (score < 40) return "text-verdict-true";
  if (score < 60) return "text-verdict-misleading";
  return "text-verdict-false";
}

export default function BullshitScoreBadge({
  result,
  size = "md",
}: {
  result: BullshitScoreResult;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const isSmall = size === "sm";

  if (result.score === null) {
    return (
      <span className={`font-mono uppercase tracking-wide text-ink/40 ${isSmall ? "text-[10px]" : "text-xs"}`}>
        {t("bs.label")}: {t("bs.notEnoughData")}
      </span>
    );
  }

  const { score } = result;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className={`font-mono font-semibold uppercase tracking-wide text-ink/60 ${isSmall ? "text-[10px]" : "text-xs"}`}>
          {t("bs.label")}
        </span>
        <span className={`font-mono font-bold ${bandTextColor(score)} ${isSmall ? "text-[11px]" : "text-sm"}`}>
          {score}/100 · {t(bullshitRatingKey(score))}
        </span>
      </div>
      <div className={`overflow-hidden rounded-full bg-ink/10 ${isSmall ? "h-1.5" : "h-2"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${bandColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {!isSmall && (
        <span className="font-mono text-[10px] text-ink/40">{t("bs.basedOn", { count: result.count })}</span>
      )}
    </div>
  );
}
