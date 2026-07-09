"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ChevronRight } from "lucide-react";
import { NewsPayload } from "@/types";
import { overallVerdict } from "@/lib/verdict";
import { countryFlag, getStation } from "@/lib/stations";
import { translateCategory } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import ClaimAnalysis from "@/components/ClaimAnalysis";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

      <ClaimAnalysis item={item} />
    </article>
  );
}
