"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ChevronRight, Pause, Play, Radio } from "lucide-react";
import { NewsPayload } from "@/types";
import { RadioStation, countryFlag, getStation } from "@/lib/stations";
import { useLanguage } from "@/lib/LanguageContext";
import { computeBullshitScore, computeBullshitScoresByCategory } from "@/lib/bullshitScore";
import ArticleCard from "@/components/ArticleCard";
import BullshitScoreBadge from "@/components/BullshitScoreBadge";
import CategoryBullshitScores from "@/components/CategoryBullshitScores";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StationDetailPage() {
  const params = useParams<{ id: string }>();
  const { lang, t } = useLanguage();

  // /api/stations reflects the real listener process state, not just the
  // static seed config — needed so this page's "Monitored" badge matches
  // whether a transcription pipeline is actually running (see stationRuntime.ts).
  const { data: stations } = useSWR<RadioStation[]>("/api/stations", fetcher, { fallbackData: [] });
  const station = stations?.find((s) => s.id === params.id) ?? getStation(params.id);

  // keepPreviousData: language is a reading preference, not a filter — this
  // station's story list must never blank out while a new translation loads.
  const { data: items } = useSWR<NewsPayload[]>(`/api/webhook?lang=${lang}`, fetcher, {
    refreshInterval: 5000,
    fallbackData: [],
    keepPreviousData: true,
  });

  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const stationStories = useMemo(
    () => (items ?? []).filter((item) => item.station === params.id),
    [items, params.id]
  );

  const score = useMemo(() => computeBullshitScore(stationStories), [stationStories]);
  const categoryScores = useMemo(() => computeBullshitScoresByCategory(stationStories), [stationStories]);

  if (!station) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">{t("radio.notFound")}</p>
        <Link href="/radio" className="mt-4 inline-block text-accent hover:underline">
          {t("radio.backToRadio")}
        </Link>
      </div>
    );
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-ink/50">
        <Link href="/radio" className="hover:text-ink hover:underline">
          {t("radio.eyebrow")}
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span>{station.country}</span>
      </nav>

      <div className="mb-10 flex flex-col gap-5 rounded-md border border-ink/10 bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="text-4xl" aria-hidden="true">
              {countryFlag(station.countryCode)}
            </span>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                {station.country} · {station.language}
              </p>
              <h1 className="font-serif text-2xl font-bold text-ink md:text-3xl">{station.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ink/50">
                {station.active ? (
                  <>
                    <Radio size={12} className="text-verdict-true" aria-hidden="true" />
                    {t("radio.monitoredNote")}
                  </>
                ) : (
                  t("radio.listenOnlyNote")
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center gap-2 rounded-full border border-accent bg-accent px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-paper transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:ml-auto"
          >
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {playing ? t("radio.pause") : t("radio.listenLive")}
          </button>
          <audio
            ref={audioRef}
            src={station.streamUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        <div className="border-t border-dashed border-ink/15 pt-4">
          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            {t("bs.overall")}
          </p>
          <BullshitScoreBadge result={score} />
        </div>
      </div>

      {categoryScores.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 border-b border-ink/10 pb-2 font-serif text-xl font-bold text-ink">
            {t("bs.byTopic")}
          </h2>
          <CategoryBullshitScores scores={categoryScores} />
        </section>
      )}

      <h2 className="mb-4 border-b border-ink/10 pb-2 font-serif text-xl font-bold text-ink">
        {t("radio.factCheckedHeading")}
      </h2>

      {stationStories.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 py-16 text-center font-mono text-sm text-ink/40">
          {station.active ? t("radio.emptyMonitored") : t("radio.emptyUnmonitored")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stationStories.map((item) => (
            <ArticleCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
