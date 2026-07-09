"use client";

import Link from "next/link";
import { ChevronRight, Pause, Play, X } from "lucide-react";
import { RadioStation } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";
import { computeBullshitScore } from "@/lib/bullshitScore";
import BullshitScoreBadge from "./BullshitScoreBadge";

export default function StationCard({
  station,
  isPlaying,
  onPlay,
  onToggleMonitor,
  score,
  onClose,
  elevated,
}: {
  station: RadioStation;
  isPlaying: boolean;
  onPlay: () => void;
  onToggleMonitor: () => void;
  score: ReturnType<typeof computeBullshitScore>;
  onClose?: () => void;
  elevated?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={`group flex flex-col gap-3 rounded-md border border-ink/10 bg-card p-4 transition-shadow ${
        elevated ? "shadow-xl" : "shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/radio/${station.id}`} className="min-w-0 flex-1 focus:outline-none">
          <p className="truncate font-serif text-base font-semibold text-ink group-hover:underline">
            {station.name}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink/50">{station.language}</p>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Listen to ${station.name}`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isPlaying
                ? "border-accent bg-accent text-paper"
                : "border-ink/15 text-ink/60 hover:border-accent hover:text-accent"
            }`}
          >
            {isPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" className="ml-0.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("radio.close")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/40 hover:text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <BullshitScoreBadge result={score} size="sm" />

      <div className="flex items-center justify-between border-t border-dashed border-ink/15 pt-3">
        <button
          type="button"
          onClick={onToggleMonitor}
          aria-pressed={station.active}
          className={`rounded-[2px] border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            station.active
              ? "border-verdict-true text-verdict-true"
              : "border-ink/15 text-ink/40 hover:border-ink/30 hover:text-ink/60"
          }`}
        >
          {station.active ? t("radio.monitored") : t("radio.listenOnly")}
        </button>
        <Link
          href={`/radio/${station.id}`}
          className="flex items-center gap-0.5 text-xs text-accent hover:underline"
        >
          {t("radio.details")} <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
