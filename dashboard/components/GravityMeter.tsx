import { useLanguage } from "@/lib/LanguageContext";

// Sequential magnitude encoding (1-10) reusing the existing accent hue —
// deliberately not a verdict color (true/false/misleading are reserved
// status colors, not meant for "how big is this story"). Ascending bar
// heights double as a signal-strength motif, fitting the radio theme, and
// the number/label is always shown as text so the meaning never rides on
// color alone.
const MAX_LEVEL = 10;
const BAR_HEIGHTS = [4, 6, 7, 9, 10, 12, 13, 15, 16, 18];

export default function GravityMeter({
  level,
  size = "md",
}: {
  level: number;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.round(level || 1)));
  const isSmall = size === "sm";

  return (
    <div className="inline-flex items-center gap-1.5" title={`${t("gravity.label")}: ${clamped}/${MAX_LEVEL}`}>
      <div className="flex items-end gap-px" aria-hidden="true">
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={`w-1 rounded-sm ${i < clamped ? "bg-accent" : "bg-ink/10"}`}
            style={{ height: isSmall ? h * 0.7 : h }}
          />
        ))}
      </div>
      <span className={`font-mono uppercase tracking-wide text-ink/50 ${isSmall ? "text-[10px]" : "text-xs"}`}>
        {clamped}/{MAX_LEVEL} {t(`gravity.${clamped}`)}
      </span>
    </div>
  );
}
