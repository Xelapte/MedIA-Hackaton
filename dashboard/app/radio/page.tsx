"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { ChevronRight, Pause, Play, X } from "lucide-react";
import { NewsPayload } from "@/types";
import { RadioStation, countryFlag, stationsByCountry } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";
import { computeBullshitScore } from "@/lib/bullshitScore";
import RadioPlayerBar from "@/components/RadioPlayerBar";
import BullshitScoreBadge from "@/components/BullshitScoreBadge";
import WorldMapStations from "@/components/WorldMapStations";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STATIONS_KEY = "/api/stations";

// Rough on-screen footprint of the popup card, used to keep it inside the
// viewport instead of letting it spill off the edge when a dot near the
// border of the map is clicked.
const POPUP_WIDTH = 280;
const POPUP_HEIGHT = 230;

export default function RadioIndexPage() {
  const { t } = useLanguage();
  const { data: stations } = useSWR<RadioStation[]>(STATIONS_KEY, fetcher, { fallbackData: [] });
  // Score computation only needs verdict/gravity, not translated text, so
  // this deliberately fetches the untranslated (fast, uncached-Ollama) feed.
  const { data: items } = useSWR<NewsPayload[]>("/api/webhook", fetcher, { fallbackData: [] });
  const [current, setCurrent] = useState<RadioStation | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [popup, setPopup] = useState<{ station: RadioStation; x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popup) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPopup(null);
    }
    function onPointerDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null);
    }
    document.addEventListener("keydown", onKeyDown);
    // Listen on the capture phase so this runs before the map dot's own
    // onClick — otherwise clicking a *different* dot would close the popup
    // here and immediately reopen it, which is fine, but capture keeps the
    // ordering deterministic and avoids a flash of no-popup in between.
    document.addEventListener("mousedown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [popup]);

  const scoresByStation = useMemo(() => {
    const map = new Map<string, NewsPayload[]>();
    for (const item of items ?? []) {
      if (!item.station) continue;
      const list = map.get(item.station) ?? [];
      list.push(item);
      map.set(item.station, list);
    }
    const scores = new Map<string, ReturnType<typeof computeBullshitScore>>();
    map.forEach((stationItems, stationId) => {
      scores.set(stationId, computeBullshitScore(stationItems));
    });
    return scores;
  }, [items]);

  function scoreFor(stationId: string) {
    return (
      scoresByStation.get(stationId) ?? {
        score: null,
        count: 0,
        trueCount: 0,
        falseCount: 0,
        misleadingCount: 0,
        unverifiableCount: 0,
      }
    );
  }

  function play(station: RadioStation) {
    setCurrent(station);
    setPlaying(true);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function close() {
    setCurrent(null);
    setPlaying(false);
  }

  async function toggleMonitor(station: RadioStation) {
    const next = stations?.map((s) => (s.id === station.id ? { ...s, active: !s.active } : s)) ?? [];
    mutate(STATIONS_KEY, next, false);
    await fetch("/api/stations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: station.id, active: !station.active }),
    });
    mutate(STATIONS_KEY);
  }

  function selectOnMap(station: RadioStation, e: React.MouseEvent) {
    const x = Math.min(Math.max(e.clientX, 12), window.innerWidth - POPUP_WIDTH - 12);
    const y = Math.min(Math.max(e.clientY, 12), window.innerHeight - POPUP_HEIGHT - 12);
    setPopup({ station, x, y });
  }

  // Keep the popup's station data (active flag, etc.) fresh if it changes
  // underneath it (e.g. monitoring toggled from the sidebar list while the
  // popup for that same station is open), and close it if the station
  // disappears from the feed entirely.
  useEffect(() => {
    if (!popup) return;
    const fresh = stations?.find((s) => s.id === popup.station.id);
    if (!fresh) {
      setPopup(null);
    } else if (fresh.active !== popup.station.active) {
      setPopup((p) => (p ? { ...p, station: fresh } : p));
    }
  }, [stations, popup]);

  const grouped = stationsByCountry(stations ?? []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 md:px-6 md:py-10">
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {t("radio.eyebrow")}
      </p>
      <h1 className="mb-2 font-serif text-3xl font-bold text-ink md:text-4xl">{t("radio.heading")}</h1>
      <p className="mb-6 max-w-2xl text-ink/70">{t("radio.description", { count: grouped.length })}</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <WorldMapStations
          stations={stations ?? []}
          selectedId={popup?.station.id}
          onSelect={selectOnMap}
          className="h-[420px] rounded-md border border-ink/10 shadow-sm md:h-[480px] lg:h-[640px]"
        />

        <aside className="lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
            {t("radio.allStations")}
          </h2>
          {grouped.map(([country, countryStations]) => (
            <div key={country} className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink/70">
                <span aria-hidden="true">{countryFlag(countryStations[0].countryCode)}</span>
                {country}
              </p>
              <div className="flex flex-col gap-2">
                {countryStations.map((station) => (
                  <StationRow
                    key={station.id}
                    station={station}
                    isPlaying={playing && current?.id === station.id}
                    onPlay={() => play(station)}
                    onToggleMonitor={() => toggleMonitor(station)}
                  />
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {popup && (
        <div
          ref={popupRef}
          className="fixed z-40 animate-fade-in"
          style={{ left: popup.x, top: popup.y, width: POPUP_WIDTH }}
        >
          <StationCard
            station={popup.station}
            isPlaying={playing && current?.id === popup.station.id}
            onPlay={() => play(popup.station)}
            onToggleMonitor={() => toggleMonitor(popup.station)}
            score={scoreFor(popup.station.id)}
            onClose={() => setPopup(null)}
            elevated
          />
        </div>
      )}

      {current && (
        <>
          <audio
            ref={audioRef}
            src={current.streamUrl}
            autoPlay
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <RadioPlayerBar station={current} playing={playing} onTogglePlay={togglePlay} onClose={close} />
        </>
      )}
    </div>
  );
}

function StationCard({
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

function StationRow({
  station,
  isPlaying,
  onPlay,
  onToggleMonitor,
}: {
  station: RadioStation;
  isPlaying: boolean;
  onPlay: () => void;
  onToggleMonitor: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-card px-3 py-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${station.active ? "bg-verdict-true" : "bg-ink/30"}`}
        aria-hidden="true"
      />
      <Link href={`/radio/${station.id}`} className="min-w-0 flex-1 focus:outline-none">
        <p className="truncate text-sm font-medium text-ink hover:underline">{station.name}</p>
      </Link>
      <button
        type="button"
        onClick={onToggleMonitor}
        aria-pressed={station.active}
        className={`shrink-0 font-mono text-[9px] font-semibold uppercase tracking-wide ${
          station.active ? "text-verdict-true" : "text-ink/35 hover:text-ink/60"
        }`}
      >
        {station.active ? t("radio.monitored") : t("radio.listenOnly")}
      </button>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Listen to ${station.name}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isPlaying
            ? "border-accent bg-accent text-paper"
            : "border-ink/15 text-ink/60 hover:border-accent hover:text-accent"
        }`}
      >
        {isPlaying ? <Pause size={10} aria-hidden="true" /> : <Play size={10} aria-hidden="true" className="ml-0.5" />}
      </button>
    </div>
  );
}
