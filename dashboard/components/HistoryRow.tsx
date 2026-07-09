import { NewsPayload } from "@/types";
import { normalizeVerdict, overallVerdict } from "@/lib/verdict";

const VERDICT_DOT: Record<string, string> = {
  True: "bg-verdict-true",
  False: "bg-verdict-false",
  Misleading: "bg-verdict-misleading",
  Unverifiable: "bg-verdict-unverified",
};

// A single claim in the scrolling "history" column shared by the radio
// station page and the live interview page — click to load it into the
// claim analysis panel next to it.
export default function HistoryRow({
  item,
  selected,
  onSelect,
}: {
  item: NewsPayload;
  selected: boolean;
  onSelect: () => void;
}) {
  const verdict = overallVerdict(item);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1.5 rounded-md border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        selected ? "border-accent bg-accent/5" : "border-ink/10 bg-card hover:border-ink/25"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${VERDICT_DOT[normalizeVerdict(verdict)]}`}
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/40">{item.category}</span>
        {item.timestamp && (
          <time className="ml-auto shrink-0 font-mono text-[10px] text-ink/35">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-medium text-ink/85">{item.summarized_analysis}</p>
    </button>
  );
}
