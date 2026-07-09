import { Verdict } from "@/types";
import { normalizeVerdict } from "@/lib/verdict";
import { useLanguage } from "@/lib/LanguageContext";

const STYLES: Record<Verdict, string> = {
  True: "border-verdict-true text-verdict-true outline-verdict-true/30",
  False: "border-verdict-false text-verdict-false outline-verdict-false/30",
  Misleading: "border-verdict-misleading text-verdict-misleading outline-verdict-misleading/30",
  Unverifiable: "border-verdict-unverified text-verdict-unverified outline-verdict-unverified/30",
};

const LABEL_KEYS: Record<Verdict, string> = {
  True: "verdict.true",
  False: "verdict.false",
  Misleading: "verdict.misleading",
  Unverifiable: "verdict.unverifiable",
};

/**
 * Every claim gets stamped, not tagged — the badge is styled like a rubber
 * ink stamp (double ruled border, slight rotation) rather than a status pill.
 */
export default function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict | string;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const normalized = normalizeVerdict(verdict);
  return (
    <span
      className={`-rotate-2 inline-flex items-center justify-center whitespace-nowrap rounded-[2px] border-2 bg-card font-mono font-semibold uppercase tracking-[0.14em] outline outline-1 outline-offset-[3px] ${
        STYLES[normalized]
      } ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"}`}
    >
      {t(LABEL_KEYS[normalized])}
    </span>
  );
}
