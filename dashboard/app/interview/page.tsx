"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { AlertCircle, Mic, Square } from "lucide-react";
import { NewsPayload } from "@/types";
import { useLanguage } from "@/lib/LanguageContext";
import { computeBullshitScore, computeBullshitScoresByCategory } from "@/lib/bullshitScore";
import BullshitScoreBadge from "@/components/BullshitScoreBadge";
import ClaimHistoryLayout from "@/components/ClaimHistoryLayout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// How much audio each transcription+fact-check submission covers. Shorter
// than main.py's radio ingestion loop (which streams continuously via
// ffmpeg) because each chunk here pays for a fresh MediaRecorder segment,
// a transcribe_once.py process spawn, and a network round trip — 15s keeps
// the feed responsive without piling up overlapping in-flight chunks.
const CHUNK_INTERVAL_MS = 15000;

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewPage() {
  const { lang, t } = useLanguage();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stopping a recorder fires onstop asynchronously; this flag (rather than
  // the `recording` state, which a closure could see stale) is what onstop
  // checks to decide whether to line up the next segment.
  const sessionActiveRef = useRef(false);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: items } = useSWR<NewsPayload[]>(sessionId ? `/api/webhook?lang=${lang}` : null, fetcher, {
    refreshInterval: sessionId ? 5000 : 0,
    fallbackData: [],
    keepPreviousData: true,
  });

  const sessionStories = useMemo(
    () => (items ?? []).filter((item) => item.station === sessionId),
    [items, sessionId]
  );

  const score = useMemo(() => computeBullshitScore(sessionStories), [sessionStories]);
  const categoryScores = useMemo(() => computeBullshitScoresByCategory(sessionStories), [sessionStories]);

  // Default to the most recent claim, and keep following new arrivals only
  // while nothing has been explicitly picked — same rule as the radio page,
  // so reading an earlier claim doesn't get yanked out from under you.
  useEffect(() => {
    if (selectedId && sessionStories.some((s) => s.id === selectedId)) return;
    setSelectedId(sessionStories[0]?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStories]);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      if (chunkTimeoutRef.current) clearTimeout(chunkTimeoutRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function processChunk(blob: Blob, currentSessionId: string) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      const transcribeData = await transcribeRes.json();
      // A silent/empty window (a pause, dead air) isn't an error — just
      // nothing to submit this cycle.
      if (!transcribeRes.ok || !transcribeData.text?.trim()) return;

      await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcribeData.text,
          station: currentSessionId,
          stationName: "Live Interview",
        }),
      });
    } catch {
      // Best-effort: one lost chunk shouldn't interrupt the session or
      // surface a scary error mid-interview — the next chunk tries again.
    }
  }

  function scheduleNextChunk(currentSessionId: string) {
    if (!streamRef.current) return;
    const recorder = new MediaRecorder(streamRef.current);
    const localChunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(localChunks, { type: recorder.mimeType });
      processChunk(blob, currentSessionId);
      if (sessionActiveRef.current) scheduleNextChunk(currentSessionId);
    };
    recorder.start();
    recorderRef.current = recorder;
    chunkTimeoutRef.current = setTimeout(() => {
      // Stopping and immediately starting a fresh MediaRecorder (rather
      // than using `start(timeslice)`) guarantees every chunk is a
      // self-contained, decodable WebM file — timesliced chunks after the
      // first are often just container fragments that a standalone Whisper
      // pass can't open.
      if (recorder.state !== "inactive") recorder.stop();
    }, CHUNK_INTERVAL_MS);
  }

  async function startSession() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      sessionActiveRef.current = true;
      const newSessionId = `interview-${crypto.randomUUID()}`;
      setSessionId(newSessionId);
      setSelectedId(undefined);
      setRecording(true);
      setElapsed(0);
      elapsedIntervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      scheduleNextChunk(newSessionId);
    } catch {
      setError(t("factCheck.micError"));
    }
  }

  function stopSession() {
    sessionActiveRef.current = false;
    setRecording(false);
    if (chunkTimeoutRef.current) clearTimeout(chunkTimeoutRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6 md:py-10">
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {t("interview.eyebrow")}
      </p>
      <h1 className="mb-2 font-serif text-3xl font-bold text-ink md:text-4xl">{t("interview.heading")}</h1>
      <p className="mb-6 max-w-2xl text-ink/70">{t("interview.description")}</p>

      <div className="mb-8 flex flex-col gap-5 rounded-md border border-ink/10 bg-card p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {recording ? (
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-verdict-false">
              <span className="h-2 w-2 animate-pulse rounded-full bg-verdict-false" aria-hidden="true" />
              {t("interview.live")}
            </span>
          ) : sessionId ? (
            <span className="font-mono text-xs font-semibold uppercase tracking-wide text-ink/40">
              {t("interview.ended")}
            </span>
          ) : null}
          {sessionId && (
            <span className="font-mono text-xs text-ink/50">
              {t("interview.sessionTime")}: {formatElapsed(elapsed)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={recording ? stopSession : startSession}
          className={`flex items-center justify-center gap-2 rounded-full border px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:ml-auto ${
            recording
              ? "border-verdict-false bg-verdict-false text-paper hover:bg-verdict-false/90"
              : "border-accent bg-accent text-paper hover:bg-accent-hover"
          }`}
        >
          {recording ? (
            <>
              <Square size={16} aria-hidden="true" /> {t("interview.stop")}
            </>
          ) : (
            <>
              <Mic size={16} aria-hidden="true" /> {sessionId ? t("interview.startNew") : t("interview.start")}
            </>
          )}
        </button>

        {sessionId && (
          <div className="border-t border-dashed border-ink/15 pt-4 sm:w-64 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
              {t("bs.overall")}
            </p>
            <BullshitScoreBadge result={score} />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-verdict-false/30 bg-verdict-false/10 p-3 text-sm text-verdict-false">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {!sessionId ? (
        <div className="rounded-md border border-dashed border-ink/20 py-16 text-center font-mono text-sm text-ink/40">
          {t("interview.emptyIdle")}
        </div>
      ) : sessionStories.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 py-16 text-center font-mono text-sm text-ink/40">
          {t("radio.emptyMonitored")}
        </div>
      ) : (
        <ClaimHistoryLayout
          stories={sessionStories}
          selectedId={selectedId}
          onSelect={setSelectedId}
          categoryScores={categoryScores}
        />
      )}
    </div>
  );
}
