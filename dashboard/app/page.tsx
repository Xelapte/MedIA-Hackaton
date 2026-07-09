"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { NewsPayload } from "@/types";
import ArticleCard from "@/components/ArticleCard";
import { useLanguage } from "@/lib/LanguageContext";
import { translateCategory } from "@/lib/i18n";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  return (
    <Suspense fallback={<EmptyStateFallback />}>
      <HomeContent />
    </Suspense>
  );
}

function EmptyStateFallback() {
  const { t } = useLanguage();
  return <EmptyState message={t("home.loading")} />;
}

function HomeContent() {
  const { lang, t } = useLanguage();
  // keepPreviousData: language is a reading preference, not a filter — the
  // article list must never blank out just because the SWR key changed
  // from ?lang=en to ?lang=fr while the new translation is still loading.
  const { data: items } = useSWR<NewsPayload[]>(`/api/webhook?lang=${lang}`, fetcher, {
    refreshInterval: 5000,
    fallbackData: [],
    keepPreviousData: true,
  });

  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const filtered = useMemo(() => {
    return (items ?? []).filter((item) => {
      if (activeCategory && item.category !== activeCategory) return false;
      if (q) {
        const haystack = `${item.summary} ${item.summarized_analysis} ${item.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, activeCategory, q]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          (b.news_value_importance ?? 0) - (a.news_value_importance ?? 0) ||
          (b.timestamp ?? 0) - (a.timestamp ?? 0)
      ),
    [filtered]
  );

  const isFiltering = Boolean(activeCategory || q);
  const topStory = isFiltering ? undefined : sorted[0];
  const rest = isFiltering ? sorted : sorted.slice(1);

  const byCategory = useMemo(() => {
    const map = new Map<string, NewsPayload[]>();
    for (const item of rest) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [rest]);

  const eyebrow = q
    ? t("home.eyebrowSearch", { q })
    : activeCategory
      ? translateCategory(lang, activeCategory)
      : t("home.eyebrowTop");
  const heading = activeCategory
    ? t("home.headingCategory", { category: translateCategory(lang, activeCategory) })
    : q
      ? t("home.headingSearch")
      : t("home.headingDefault");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <section className="mb-10 border-b border-ink/10 pb-8">
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {t("home.heroEyebrow")}
        </p>
        <h1 className="mb-3 max-w-2xl font-serif text-4xl font-bold leading-tight text-ink md:text-5xl">
          {t("home.heroHeading")}
        </h1>
        <p className="max-w-2xl text-ink/70">{t("home.heroDescription")}</p>
      </section>

      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h2 className="mb-8 font-serif text-3xl font-bold text-ink md:text-4xl">{heading}</h2>

      {sorted.length === 0 && (
        <EmptyState message={isFiltering ? t("home.emptyFiltered") : t("home.emptyDefault")} />
      )}

      {topStory && (
        <section className="mb-10">
          <ArticleCard item={topStory} size="lg" />
        </section>
      )}

      {!isFiltering ? (
        Array.from(byCategory.entries()).map(([category, categoryItems]) => (
          <section key={category} className="mb-10">
            <h2 className="mb-4 border-b border-ink/10 pb-2 font-serif text-xl font-bold text-ink">
              {translateCategory(lang, category)}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categoryItems.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <ArticleCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-ink/20 py-24 text-center font-mono text-sm text-ink/40">
      {message}
    </div>
  );
}
