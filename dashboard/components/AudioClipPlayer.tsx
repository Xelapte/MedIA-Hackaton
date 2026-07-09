"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioClipPlayer({
  clipId,
  highlightStart,
  highlightEnd,
}: {
  clipId: string;
  highlightStart?: number;
  highlightEnd?: number;
}) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  }

  function jumpToHighlight() {
    if (!audioRef.current || highlightStart === undefined) return;
    audioRef.current.currentTime = highlightStart;
    audioRef.current.play();
  }

  if (unavailable) {
    return <p className="font-mono text-xs text-ink/40">{t("audio.notAvailable")}</p>;
  }

  const highlightLeftPct = duration && highlightStart !== undefined ? (highlightStart / duration) * 100 : 0;
  const highlightWidthPct =
    duration && highlightStart !== undefined && highlightEnd !== undefined
      ? ((highlightEnd - highlightStart) / duration) * 100
      : 0;
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-md border border-ink/10 bg-card p-4">
      <audio
        ref={audioRef}
        src={`/api/audio-clip/${clipId}`}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setUnavailable(true)}
      />

      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          {t("audio.label")}
        </p>
        {highlightStart !== undefined && (
          <button
            type="button"
            onClick={jumpToHighlight}
            className="font-mono text-[10px] font-semibold uppercase tracking-wide text-accent hover:underline"
          >
            {t("audio.jumpToMoment")}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t("radio.pause") : t("radio.listenLive")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} className="ml-0.5" aria-hidden="true" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative h-2 cursor-pointer rounded-full bg-ink/10" onClick={seek}>
            {/* Highlighted region: where in this clip the claim was actually
                said — a persistent band, not overwritten by playback progress,
                so it stays visible as a landmark on the scrubber. Red to flag
                it as "the moment under scrutiny", distinct from the accent color. */}
            {highlightWidthPct > 0 && (
              <div
                className="absolute inset-y-0 rounded-full bg-verdict-false/40"
                style={{ left: `${highlightLeftPct}%`, width: `${highlightWidthPct}%` }}
              />
            )}
            {/* Playhead */}
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink"
              style={{ left: `${progressPct}%` }}
            />
          </div>
        </div>

        <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink/40">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
