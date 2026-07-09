"use client";

import { Pause, Play, Radio, X } from "lucide-react";
import { RadioStation, countryFlag } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";

export default function RadioPlayerBar({
  station,
  playing,
  onTogglePlay,
  onClose,
}: {
  station: RadioStation;
  playing: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? t("radio.pause") : t("radio.listenLive")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-accent text-paper transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" className="ml-0.5" />}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-lg leading-none" aria-hidden="true">
            {countryFlag(station.countryCode)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{station.name}</p>
            <p className="flex items-center gap-1 truncate font-mono text-[10px] uppercase tracking-wide text-ink/50">
              {playing && (
                <Radio size={11} className="animate-pulse text-verdict-false" aria-hidden="true" />
              )}
              {playing ? t("player.liveNow") : t("player.paused")} · {station.language}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Stop and close player"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
