"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";
import { NewsPayload, TrustLevel } from "@/types";
import { overallVerdict } from "@/lib/verdict";
import VerdictBadge from "@/components/VerdictBadge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TRUST_STYLES: Record<TrustLevel, string> = {
  High: "text-verdict-true bg-verdict-true/10 border-verdict-true/30",
  Medium: "text-verdict-misleading bg-verdict-misleading/10 border-verdict-misleading/30",
  Low: "text-verdict-false bg-verdict-false/10 border-verdict-false/30",
  Unverifiable: "text-verdict-unverified bg-verdict-unverified/10 border-verdict-unverified/30",
};

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: items } = useSWR<NewsPayload[]>("/api/webhook", fetcher, { fallbackData: [] });

  if (!items) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-ink/40">Loading…</div>;
  }

  const item = items.find((i) => i.id === params.id);

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-ink/60">This story isn&apos;t available anymore.</p>
        <Link href="/" className="mt-4 inline-block text-accent hover:underline">
          Back to top stories
        </Link>
      </div>
    );
  }

  const verdict = overallVerdict(item);
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
          Home
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link href={`/?category=${encodeURIComponent(item.category)}`} className="hover:text-ink hover:underline">
          {item.category}
        </Link>
      </nav>

      <div className="mb-4 flex items-center gap-3">
        <VerdictBadge verdict={verdict} />
        {item.timestamp && (
          <time className="text-xs text-ink/50" dateTime={new Date(item.timestamp).toISOString()}>
            {new Date(item.timestamp).toLocaleString()}
          </time>
        )}
      </div>

      <h1 className="mb-4 font-serif text-3xl font-bold leading-tight text-ink md:text-4xl">
        {item.summarized_analysis}
      </h1>

      <blockquote className="mb-6 border-l-4 border-accent bg-white py-3 pl-4 pr-3 text-ink/80 italic">
        &ldquo;{item.summary}&rdquo;
      </blockquote>

      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg border border-black/10 bg-white p-4">
        <span
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${TRUST_STYLES[item.trust_level] ?? TRUST_STYLES.Unverifiable}`}
        >
          Trust Level: {item.trust_level}
        </span>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <span className="text-sm font-medium text-ink/60">Confidence:</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${item.confidence_score}%` }}
            />
          </div>
          <span className="text-sm font-bold text-ink">{item.confidence_score}%</span>
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
          <h2 className="mb-3 font-serif text-lg font-bold text-ink">Traced Sources &amp; Cross-Referenced Evidence</h2>
          <div className="space-y-2">
            {item.sources_used.map((source, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="flex-1 truncate text-sm font-medium text-ink/80">&ldquo;{source.claim_checked}&rdquo;</p>
                <div className="flex shrink-0 items-center gap-3">
                  <VerdictBadge verdict={source.verdict} size="sm" />
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    View <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-serif text-lg font-bold text-ink">Full Analysis</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{item.analysis}</p>
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-4">
        <h2 className="mb-2 font-serif text-base font-bold text-ink">How we reached this verdict</h2>
        <p className="text-sm leading-relaxed text-ink/60">
          Each claim above is traced back to the primary source it came from and cross-referenced against
          independent outlets. The badge shown is the <strong>least favorable</strong> verdict among all sources
          checked — so a single misleading or false source can&apos;t be hidden behind stronger ones. Trust Level
          and Confidence reflect the overall reliability and agreement of the sources checked, not the claim&apos;s
          popularity or recency.
        </p>
      </section>
    </article>
  );
}
