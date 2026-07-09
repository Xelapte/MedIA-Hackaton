"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import { NewsPayload, TrustLevel } from "@/types";
import { normalizeTrustLevel, overallVerdict } from "@/lib/verdict";
import { countryFlag, getStation } from "@/lib/stations";
import { translateCategory } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import VerdictBadge from "@/components/VerdictBadge";
import GravityMeter from "@/components/GravityMeter";
import AudioClipPlayer from "@/components/AudioClipPlayer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TRUST_STYLES: Record<TrustLevel, string> = {
  High: "text-verdict-true bg-verdict-true/10 border-verdict-true/30",
  Medium: "text-verdict-misleading bg-verdict-misleading/10 border-verdict-misleading/30",
  Low: "text-verdict-false bg-verdict-false/10 border-verdict-false/30",
  Unverifiable: "text-verdict-unverified bg-verdict-unverified/10 border-verdict-unverified/30",
};

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const { lang, t } = useLanguage();
  // keepPreviousData: switching language changes the SWR cache key
  // (?lang=en -> ?lang=fr); without this, the list would blank out to
  // fallbackData while the new translation is in flight, which reads as
  // articles being filtered out. Language is a reading preference, not a
  // filter — every article stays visible through the switch, just updating
  // its text in place once translated.
  const { data: items } = useSWR<NewsPayload[]>(`/api/webhook?lang=${lang}`, fetcher, {
    fallbackData: [],
    keepPreviousData: true,
  });

  if (!items) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/40">{t("article.loading")}</div>;
  }

  const item = items.find((i) => i.id === params.id);

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">{t("article.notFound")}</p>
        <Link href="/" className="mt-4 inline-block text-accent hover:underline">
          {t("article.backToTop")}
        </Link>
      </div>
    );
  }

  const verdict = overallVerdict(item);
  const trustLevel = normalizeTrustLevel(item.trust_level);
  const station = item.station ? getStation(item.station) : undefined;
  const claimReviewJsonLd = {
    "@context": "https://schema.org",
    "@type": "ClaimReview",
    datePublished: item.timestamp ? new Date(item.timestamp).toISOString() : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    claimReviewed: item.summary,
    itemReviewed: {
      "@type": "Claim",
      author: { "@type": "Organization", name: "Various sources" },
    },
    author: {
      "@type": "Organization",
      name: "Verity",
    },
    reviewRating: {
      "@type": "Rating",
      alternateName: verdict,
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(claimReviewJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-ink/50">
        <Link href="/" className="hover:text-ink hover:underline">
          {t("article.home")}
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href={`/?category=${encodeURIComponent(item.category)}`} className="hover:text-ink hover:underline">
          {translateCategory(lang, item.category)}
        </Link>
        {station && (
          <>
            <ChevronRight size={14} aria-hidden="true" />
            <Link href={`/radio/${station.id}`} className="flex items-center gap-1 hover:text-ink hover:underline">
              <span aria-hidden="true">{countryFlag(station.countryCode)}</span>
              {station.name}
            </Link>
          </>
        )}
      </nav>

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

      <h1 className="mb-4 font-serif text-3xl font-bold leading-tight text-ink md:text-4xl">
        {item.summarized_analysis}
      </h1>

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
    </article>
  );
}
