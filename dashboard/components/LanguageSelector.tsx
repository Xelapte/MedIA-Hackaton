"use client";

import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Select language"
      className="flex shrink-0 items-center overflow-hidden rounded-[3px] border border-ink/15 font-mono text-xs font-semibold uppercase tracking-wide"
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            lang === code ? "bg-accent text-paper" : "text-ink/60 hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
