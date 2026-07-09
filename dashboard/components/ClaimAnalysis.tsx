"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { NewsPayload, TrustLevel } from "@/types";
import { normalizeTrustLevel, overallVerdict } from "@/lib/verdict";
import { useLanguage } from "@/lib/LanguageContext";
import VerdictBadge from "./VerdictBadge";
import GravityMeter from "./GravityMeter";
import AudioClipPlayer from "./AudioClipPlayer";

const TRUST_STYLES: Record<TrustLevel, string> = {
  High: "text-verdict-true bg-verdict-true/10 border-verdict-true/30",
  Medium: "text-verdict-misleading bg-verdict-misleading/10 border-verdict-misleading/30",
  Low: "text-verdict-false bg-verdict-false/10 border-verdict-false/30",
  Unverifiable: "text-verdict-unverified bg-verdict-unverified/10 border-verdict-unverified/30",
};

// The full breakdown of a single fact-checked claim — verdict, gravity,
// trust/confidence, evidence log, full analysis. Shared between the
// standalone /article/[id] page and the middle "claim analysis" column of
// the 3-pane /radio/[id] layout, so the two never drift apart.
export default function ClaimAnalysis({
  item,
  headingLevel = "h1",
}: {
  item: NewsPayload;
  // The standalone article page is this content's document title (h1); the
  // 3-pane radio layout already has its own page h1 (the station name), so
  // it embeds this as an h2 instead — same visual weight, correct outline.
  headingLevel?: "h1" | "h2";
}) {
  const { t } = useLanguage();
  const verdict = overallVerdict(item);
  const trustLevel = normalizeTrustLevel(item.trust_level);
  const Heading = headingLevel;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={verdict} />
        <GravityMeter level={item.news_value_importance} />
        {item.timestamp && (
          <time
            className="font-mono text-xs uppercase tracking-wide text-ink/50"
            dateTime={new Date(item.timestamp).toISOString()}
          >
            {t("article.filed")} {new Date(item.timestamp).toLocaleString()}
          </time>
        )}
      </div>

      <Heading className="mb-4 font-serif text-3xl font-bold leading-tight text-ink md:text-4xl">
        {item.summarized_analysis}
      </Heading>

      <blockquote className="mb-6 border-l-4 border-accent bg-card py-3 pl-4 pr-3 text-ink/80 italic">
        &ldquo;{item.summary}&rdquo;
      </blockquote>

      {item.audio_clip_id && (
        <div className="mb-8">
          <AudioClipPlayer
            clipId={item.audio_clip_id}
            highlightStart={item.audio_clip_highlight_start}
            highlightEnd={item.audio_clip_highlight_end}
          />
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-md border border-ink/10 bg-card p-4">
        <span
          className={`rounded-[2px] border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide ${TRUST_STYLES[trustLevel]}`}
        >
          {t("article.trust")}: {t(`trust.${trustLevel.toLowerCase()}`)}
        </span>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <span className="text-sm font-medium text-ink/60">{t("article.confidence")}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${item.confidence_score}%` }}
            />
          </div>
          <span className="font-mono text-sm font-bold text-ink">{item.confidence_score}%</span>
        </div>
      </div>

      {item.flags?.length > 0 && (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-verdict-misleading/30 bg-verdict-misleading/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-verdict-misleading" size={18} aria-hidden="true" />
          <ul className="list-inside list-disc space-y-1 text-sm text-verdict-misleading">
            {item.flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {item.sources_used?.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-bold text-ink">{t("article.evidenceLog")}</h2>
          <div className="space-y-2">
            {item.sources_used.map((source, idx) => (
              <div key={idx} className="rounded-md border border-ink/10 bg-card p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex flex-1 items-start gap-2 truncate text-sm font-medium text-ink/80">
                    <span className="shrink-0 font-mono text-xs font-semibold text-accent">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    &ldquo;{source.claim_checked}&rdquo;
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    <VerdictBadge verdict={source.verdict} size="sm" />
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      {t("article.view")} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                </div>
                {source.reason && (
                  <p className="mt-2 pl-7 text-sm text-ink/60">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wide text-ink/40">
                      {t("article.why")}:{" "}
                    </span>
                    {source.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-serif text-lg font-bold text-ink">{t("article.fullAnalysis")}</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{item.analysis}</p>
      </section>

      <section className="rounded-md border border-dashed border-ink/25 bg-card/60 p-4">
        <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          {t("article.methodology")}
        </h2>
        <p className="text-sm leading-relaxed text-ink/60">{t("article.methodologyBody")}</p>
      </section>
    </div>
  );
}
