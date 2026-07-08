"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Search, ShieldCheck } from "lucide-react";
import { NewsPayload } from "@/types";
import { categoriesFrom } from "@/lib/verdict";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Nav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const q = searchParams.get("q") ?? "";

  const { data: items } = useSWR<NewsPayload[]>("/api/webhook", fetcher, { fallbackData: [] });
  const categories = categoriesFrom(items ?? []);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 md:h-16 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ShieldCheck className="text-accent" size={22} aria-hidden="true" />
          <span className="font-serif text-lg font-bold tracking-tight text-ink">Verity</span>
        </Link>

        <nav aria-label="Categories" className="hidden items-center gap-1 text-sm md:flex">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setParam("category", activeCategory === cat ? null : cat)}
              aria-current={activeCategory === cat ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                activeCategory === cat ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search articles</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40"
              size={16}
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setParam("q", e.target.value || null)}
              placeholder="Search articles"
              className="w-40 rounded-full border border-black/10 bg-white py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent md:w-64"
            />
          </label>
        </div>
      </div>

      <nav
        aria-label="Categories"
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:hidden"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setParam("category", activeCategory === cat ? null : cat)}
            aria-current={activeCategory === cat ? "page" : undefined}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "border-ink bg-ink text-paper"
                : "border-black/10 text-ink/70 hover:bg-ink/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>
    </header>
  );
}
