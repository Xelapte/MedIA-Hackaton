"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Radio, ScanSearch, Search, ShieldCheck } from "lucide-react";
import { NewsPayload } from "@/types";
import { categoriesFrom } from "@/lib/verdict";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageSelector from "./LanguageSelector";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Nav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const q = searchParams.get("q") ?? "";
  const { lang, t } = useLanguage();

  const { data: items } = useSWR<NewsPayload[]>(`/api/webhook?lang=${lang}`, fetcher, {
    fallbackData: [],
    keepPreviousData: true,
  });
  const categories = categoriesFrom(items ?? []);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4 md:h-16 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ShieldCheck className="text-accent" size={22} aria-hidden="true" />
          <span className="font-serif text-lg font-bold tracking-tight text-ink">Verity</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40 md:inline">
            Verified Wire
          </span>
        </Link>

        <Link
          href="/radio"
          className="flex shrink-0 items-center gap-1.5 rounded-[3px] border border-ink/15 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Radio size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{t("nav.liveRadio")}</span>
        </Link>

        <Link
          href="/fact-check"
          className="flex shrink-0 items-center gap-1.5 rounded-[3px] border border-ink/15 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ScanSearch size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{t("nav.factCheck")}</span>
        </Link>

        <nav aria-label="Categories" className="hidden items-center gap-1 text-sm md:flex">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setParam("category", activeCategory === cat ? null : cat)}
              aria-current={activeCategory === cat ? "page" : undefined}
              className={`border-b-2 px-3 py-1.5 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                activeCategory === cat
                  ? "border-accent text-ink"
                  : "border-transparent text-ink/60 hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden sm:block">
            <span className="sr-only">{t("nav.searchLabel")}</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40"
              size={16}
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setParam("q", e.target.value || null)}
              placeholder={t("nav.searchPlaceholder")}
              className="w-40 rounded-[3px] border border-ink/15 bg-card py-1.5 pl-8 pr-3 font-mono text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent md:w-64"
            />
          </label>
          <LanguageSelector />
        </div>
      </div>

      <nav
        aria-label="Categories"
        className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:hidden"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setParam("category", activeCategory === cat ? null : cat)}
            aria-current={activeCategory === cat ? "page" : undefined}
            className={`shrink-0 border-b-2 pb-1 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "border-accent text-ink"
                : "border-transparent text-ink/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>
    </header>
  );
}
