"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Mic, Square, Upload } from "lucide-react";
import { NewsPayload } from "@/types";
import { useLanguage } from "@/lib/LanguageContext";
import ArticleCard from "@/components/ArticleCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
type Mode = "text" | "audio";

export default function FactCheckPage() {
  const { lang, t } = useLanguage();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items } = useSWR<NewsPayload[]>(
    submissionId ? `/api/webhook?lang=${lang}` : null,
    fetcher,
    { refreshInterval: submissionId ? 3000 : 0 }
  );

  const result = useMemo(
    () => items?.find((item) => item.station === submissionId),
    [items, submissionId]
  );

  async function transcribeBlob(blob: Blob) {
    setError(null);
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("factCheck.transcribeError"));
      setText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        transcribeBlob(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError(t("factCheck.micError"));
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) transcribeBlob(file);
    e.target.value = "";
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("factCheck.submitError"));
      setSubmissionId(data.submissionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setText("");
    setSubmissionId(null);
    setError(null);
  }

  const busy = recording || transcribing || submitting;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {t("factCheck.eyebrow")}
      </p>
      <h1 className="mb-2 font-serif text-3xl font-bold text-ink md:text-4xl">{t("factCheck.heading")}</h1>
      <p className="mb-8 max-w-2xl text-ink/70">{t("factCheck.description")}</p>

      {submissionId ? (
        <div className="rounded-md border border-ink/10 bg-card p-6">
          {result ? (
            <>
              <div className="mb-4 flex items-center gap-2 text-verdict-true">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wide">
                  {t("factCheck.ready")}
                </span>
              </div>
              <ArticleCard item={result} size="lg" />
              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/article/${result.id}`}
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  {t("factCheck.viewFull")} <ChevronRight size={14} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-[3px] border border-ink/15 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-accent hover:text-accent"
                >
                  {t("factCheck.submitAnother")}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 size={28} className="animate-spin text-accent" aria-hidden="true" />
              <p className="font-mono text-sm text-ink/60">{t("factCheck.analyzing")}</p>
              <p className="max-w-sm text-xs text-ink/40">{t("factCheck.analyzingNote")}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 inline-flex overflow-hidden rounded-[3px] border border-ink/15 font-mono text-xs font-semibold uppercase tracking-wide">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`px-4 py-2 transition-colors ${mode === "text" ? "bg-accent text-paper" : "text-ink/60 hover:text-ink"}`}
            >
              {t("factCheck.modeText")}
            </button>
            <button
              type="button"
              onClick={() => setMode("audio")}
              className={`px-4 py-2 transition-colors ${mode === "audio" ? "bg-accent text-paper" : "text-ink/60 hover:text-ink"}`}
            >
              {t("factCheck.modeAudio")}
            </button>
          </div>

          {mode === "audio" && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-ink/20 bg-card p-4">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  recording
                    ? "border-verdict-false bg-verdict-false text-paper"
                    : "border-accent text-accent hover:bg-accent hover:text-paper"
                }`}
              >
                {recording ? (
                  <>
                    <Square size={14} aria-hidden="true" /> {t("factCheck.stopRecording")}
                  </>
                ) : (
                  <>
                    <Mic size={14} aria-hidden="true" /> {t("factCheck.startRecording")}
                  </>
                )}
              </button>

              <span className="text-ink/30">{t("factCheck.or")}</span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={recording || transcribing}
                className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-ink/60 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <Upload size={14} aria-hidden="true" /> {t("factCheck.uploadFile")}
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onFileSelected} />

              {transcribing && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-ink/50">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  {t("factCheck.transcribing")}
                </span>
              )}
            </div>
          )}

          <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-wide text-ink/50">
            {mode === "audio" ? t("factCheck.reviewLabel") : t("factCheck.textLabel")}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("factCheck.placeholder")}
            rows={8}
            className="mb-4 w-full resize-y rounded-md border border-ink/15 bg-card p-4 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-verdict-false/30 bg-verdict-false/10 p-3 text-sm text-verdict-false">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || busy}
            className="flex items-center justify-center gap-2 rounded-full border border-accent bg-accent px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wide text-paper transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {t("factCheck.submit")}
          </button>
        </>
      )}
    </div>
  );
}
