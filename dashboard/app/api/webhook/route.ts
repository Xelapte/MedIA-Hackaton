import { NextRequest, NextResponse } from "next/server";
import { NewsPayload, Source } from "@/types";
import { translateItems } from "@/lib/translate";

const globalForStore = global as unknown as { newsStore: NewsPayload[] };
const newsStore = globalForStore.newsStore || [];
if (process.env.NODE_ENV !== "production") globalForStore.newsStore = newsStore;

// The n8n fact-checking LLM occasionally drifts from the agreed JSON
// contract (missing fields, renamed keys, or a totally different shape when
// a transcript chunk covers several related claims at once). This is an
// external boundary, so normalize defensively instead of trusting the shape
// — a malformed payload should degrade to a readable card, never a blank one.
function normalizePayload(raw: Record<string, unknown>): NewsPayload {
  // Some responses nest multiple facts under a top-level "claims" array
  // instead of the flat "sources_used" list the schema asks for. Flatten it.
  let sourcesUsed = raw.sources_used;
  if ((!Array.isArray(sourcesUsed) || sourcesUsed.length === 0) && Array.isArray(raw.claims)) {
    // Nested claims[].sources_used entries often only carry {url, verdict} —
    // the claim text itself lives one level up, on claims[i].claim. Carry it
    // down as a fallback so claim_checked is never blank.
    sourcesUsed = (raw.claims as Record<string, unknown>[]).flatMap((c) =>
      Array.isArray(c.sources_used) && c.sources_used.length > 0
        ? (c.sources_used as Record<string, unknown>[]).map((s) => ({
            claim_checked: s.claim_checked ?? s.claim ?? c.claim,
            source_url: s.source_url ?? s.url,
            verdict: s.verdict ?? c.verdict,
            reason: s.reason ?? c.reason,
          }))
        : [{ claim_checked: c.claim, verdict: c.verdict, reason: c.reason }]
    );
  }
  const normalizedSources: Source[] = (Array.isArray(sourcesUsed) ? sourcesUsed : []).map(
    (s: Record<string, unknown>) => ({
      claim_checked: String(s.claim_checked ?? s.claim ?? ""),
      // Seen in the wild: the model naming this field "url" instead of "source_url".
      source_url: String(s.source_url ?? s.url ?? ""),
      verdict: String(s.verdict ?? "Unverifiable"),
      // Seen in the wild: the model naming this field "explanation" instead of "reason".
      reason: String(s.reason ?? s.explanation ?? ""),
    })
  );

  const summarizedAnalysis =
    (raw.summarized_analysis as string) ||
    (raw.summary as string) ||
    (raw.analysis as string)?.slice(0, 160) ||
    "Untitled story";

  return {
    summary: (raw.summary as string) || summarizedAnalysis,
    category: (raw.category as string) || "General",
    analysis: (raw.analysis as string) || "",
    summarized_analysis: summarizedAnalysis,
    flags: Array.isArray(raw.flags) ? raw.flags : [],
    sources_used: normalizedSources,
    trust_level: (raw.trust_level as string) || "Unverifiable",
    confidence_score: typeof raw.confidence_score === "number" ? raw.confidence_score : 0,
    news_value_importance: typeof raw.news_value_importance === "number" ? raw.news_value_importance : 1,
    station: raw.station as string | undefined,
    audio_clip_id: raw.audio_clip_id as string | undefined,
    audio_clip_highlight_start:
      typeof raw.audio_clip_highlight_start === "number" ? raw.audio_clip_highlight_start : undefined,
    audio_clip_highlight_end:
      typeof raw.audio_clip_highlight_end === "number" ? raw.audio_clip_highlight_end : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const payload = normalizePayload(raw);
    const newItem = { ...payload, id: crypto.randomUUID(), timestamp: Date.now() };

    newsStore.unshift(newItem);
    if (newsStore.length > 100) newsStore.pop();

    return NextResponse.json({ success: true, id: newItem.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") ?? "en";
  const items = await translateItems(newsStore, lang);
  return NextResponse.json(items);
}
