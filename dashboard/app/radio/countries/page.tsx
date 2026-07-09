"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { ChevronRight, Map as MapIcon } from "lucide-react";
import { NewsPayload } from "@/types";
import { RadioStation, countryFlag, stationsByCountry } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";
import { computeBullshitScore, scoresByStation } from "@/lib/bullshitScore";
import RadioPlayerBar from "@/components/RadioPlayerBar";
import StationCard from "@/components/StationCard";
import BullshitScoreBadge from "@/components/BullshitScoreBadge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STATIONS_KEY = "/api/stations";

const EMPTY_SCORE: ReturnType<typeof computeBullshitScore> = {
  score: null,
  count: 0,
  trueCount: 0,
  falseCount: 0,
  misleadingCount: 0,
  unverifiableCount: 0,
};

export default function RadioByCountryPage() {
  const { t } = useLanguage();
  const { data: stations } = useSWR<RadioStation[]>(STATIONS_KEY, fetcher, { fallbackData: [] });
  // Same untranslated feed the map view uses — score math only needs
  // verdict/gravity, not translated text.
  const { data: items } = useSWR<NewsPayload[]>("/api/webhook", fetcher, { fallbackData: [] });

  const [current, setCurrent] = useState<RadioStation | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const stationScores = useMemo(() => scoresByStation(items ?? []), [items]);

  const countries = useMemo(() => {
    const grouped = stationsByCountry(stations ?? []);
    return grouped
      .map(([country, countryStations]) => {
        const countryItems = (items ?? []).filter((item) =>
          countryStations.some((s) => s.id === item.station)
        );
        return { country, stations: countryStations, score: computeBullshitScore(countryItems) };
      })
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [stations, items]);

  function scoreFor(stationId: string) {
    return stationScores.get(stationId) ?? EMPTY_SCORE;
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 md:px-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-ink/50">
        <Link href="/radio" className="hover:text-ink hover:underline">
          {t("radio.eyebrow")}
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span>{t("radio.byCountry")}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 font-serif text-3xl font-bold text-ink md:text-4xl">
            {t("radio.byCountryHeading")}
          </h1>
          <p className="max-w-2xl text-ink/70">{t("radio.byCountryDescription")}</p>
        </div>
        <Link
          href="/radio"
          className="flex shrink-0 items-center gap-1.5 rounded-[3px] border border-ink/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MapIcon size={13} aria-hidden="true" />
          {t("radio.viewMap")}
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {countries.map(({ country, stations: countryStations, score }) => (
          <section key={country}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink/10 pb-2">
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-ink">
                <span aria-hidden="true">{countryFlag(countryStations[0].countryCode)}</span>
                {country}
                <span className="font-mono text-xs font-normal uppercase tracking-wide text-ink/40">
                  {t("radio.stationsCount", { count: countryStations.length })}
                </span>
              </h2>
              {score.score !== null && (
                <div className="w-48 shrink-0">
                  <BullshitScoreBadge result={score} size="sm" />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {countryStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  isPlaying={playing && current?.id === station.id}
                  onPlay={() => play(station)}
                  onToggleMonitor={() => toggleMonitor(station)}
                  score={scoreFor(station.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

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
