"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { NewsPayload } from "@/types";
import ArticleCard from "@/components/ArticleCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HomePage() {
  return (
    <Suspense fallback={<EmptyState message="Loading verified stories…" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { data: items } = useSWR<NewsPayload[]>("/api/webhook", fetcher, {
    refreshInterval: 5000,
    fallbackData: [],
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

  const eyebrow = q ? `Results for "${q}"` : activeCategory ? activeCategory : "Top Stories";
  const heading = activeCategory ? `${activeCategory} News` : q ? "Search Results" : "Verified, in real time";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
      <h1 className="mb-8 font-serif text-3xl font-bold text-ink md:text-4xl">{heading}</h1>

      {sorted.length === 0 && (
        <EmptyState
          message={
            isFiltering
              ? "No stories match your filters."
              : "Listening for incoming stories… send a POST request to /api/webhook."
          }
        />
      )}

      {topStory && (
        <section className="mb-10">
          <ArticleCard item={topStory} size="lg" />
        </section>
      )}

      {!isFiltering ? (
        Array.from(byCategory.entries()).map(([category, categoryItems]) => (
          <section key={category} className="mb-10">
            <h2 className="mb-4 border-b border-black/10 pb-2 font-serif text-xl font-bold text-ink">
              {category}
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
    <div className="rounded-xl border border-dashed border-black/15 py-24 text-center text-ink/40">
      {message}
    </div>
  );
}
