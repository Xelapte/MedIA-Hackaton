import Link from "next/link";
import { NewsPayload } from "@/types";
import { overallVerdict } from "@/lib/verdict";
import VerdictBadge from "./VerdictBadge";

export default function ArticleCard({
  item,
  size = "md",
}: {
  item: NewsPayload;
  size?: "md" | "lg";
}) {
  const verdict = overallVerdict(item);
  const isLarge = size === "lg";
  const sourceCount = item.sources_used?.length ?? 0;

  return (
    <Link
      href={`/article/${item.id}`}
      className="group block rounded-xl border border-black/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          {item.category}
        </span>
        <VerdictBadge verdict={verdict} size="sm" />
      </div>

      <h3
        className={`font-serif font-bold leading-snug text-ink group-hover:underline ${
          isLarge ? "text-2xl md:text-3xl" : "text-lg"
        }`}
      >
        {item.summarized_analysis || item.summary}
      </h3>

      <p className={`mt-2 text-ink/70 ${isLarge ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}>
        {item.summary}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-ink/50">
        <span>{item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</span>
        <span>
          {sourceCount} source{sourceCount === 1 ? "" : "s"} checked
        </span>
      </div>
    </Link>
  );
}
