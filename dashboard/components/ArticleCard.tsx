import Link from "next/link";
import { NewsPayload } from "@/types";
import { overallVerdict } from "@/lib/verdict";
import { countryFlag, getStation } from "@/lib/stations";
import { translateCategory } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import VerdictBadge from "./VerdictBadge";
import GravityMeter from "./GravityMeter";

export default function ArticleCard({
  item,
  size = "md",
}: {
  item: NewsPayload;
  size?: "md" | "lg";
}) {
  const { lang, t } = useLanguage();
  const verdict = overallVerdict(item);
  const isLarge = size === "lg";
  const sourceCount = item.sources_used?.length ?? 0;
  const station = item.station ? getStation(item.station) : undefined;

  return (
    <Link
      href={`/article/${item.id}`}
      className="group block rounded-md border border-ink/10 bg-card p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {translateCategory(lang, item.category)}
        </span>
        <VerdictBadge verdict={verdict} size="sm" />
      </div>

      <h3
        className={`font-serif font-semibold leading-snug text-ink group-hover:underline ${
          isLarge ? "text-2xl md:text-3xl" : "text-lg"
        }`}
      >
        {item.summarized_analysis || item.summary}
      </h3>

      <p className={`mt-2 text-ink/70 ${isLarge ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}>
        {item.summary}
      </p>

      <div className="mt-3">
        <GravityMeter level={item.news_value_importance} size="sm" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-dashed border-ink/15 pt-3 font-mono text-[11px] text-ink/50">
        <span>{item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</span>
        <span className="flex items-center gap-2">
          {station && (
            <span className="flex items-center gap-1" title={station.name}>
              <span aria-hidden="true">{countryFlag(station.countryCode)}</span>
              {station.name}
            </span>
          )}
          <span>
            {sourceCount === 1
              ? t("card.sourcesChecked", { count: sourceCount })
              : t("card.sourcesCheckedPlural", { count: sourceCount })}
          </span>
        </span>
      </div>
    </Link>
  );
}
