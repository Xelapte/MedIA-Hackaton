import { Verdict } from "@/types";

const STYLES: Record<Verdict, string> = {
  True: "bg-verdict-true/10 text-verdict-true border-verdict-true/30",
  False: "bg-verdict-false/10 text-verdict-false border-verdict-false/30",
  Misleading: "bg-verdict-misleading/10 text-verdict-misleading border-verdict-misleading/30",
  Unverifiable: "bg-verdict-unverified/10 text-verdict-unverified border-verdict-unverified/30",
};

const LABELS: Record<Verdict, string> = {
  True: "True",
  False: "False",
  Misleading: "Misleading",
  Unverifiable: "Unverified",
};

export default function VerdictBadge({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border font-semibold uppercase tracking-wide ${STYLES[verdict]} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {LABELS[verdict]}
    </span>
  );
}
