import { NewsPayload } from "@/types";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

const LANG_NAMES: Record<string, string> = { en: "English", fr: "French" };

// Article content is immutable once created, so a translation of
// (item.id, targetLang) never goes stale — cache permanently in memory,
// matching the pattern used by the news/station stores.
const globalForCache = global as unknown as { translationCache?: Record<string, NewsPayload> };
const cache: Record<string, NewsPayload> = globalForCache.translationCache || {};
if (process.env.NODE_ENV !== "production") globalForCache.translationCache = cache;

interface TranslatableFields {
  summary: string;
  analysis: string;
  summarized_analysis: string;
  flags: string[];
  claims: string[];
  reasons: string[];
}

async function callOllama(fields: TranslatableFields, targetLang: string): Promise<TranslatableFields | null> {
  const languageName = LANG_NAMES[targetLang] ?? targetLang;
  const prompt = `Translate every string value in this JSON object into ${languageName}. Keep the exact same JSON structure and keys. Do not translate proper nouns like organization or person names. Respond with ONLY the translated JSON, no markdown, no commentary.\n\n${JSON.stringify(fields)}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
      }),
      // Local model on a small "small" GPU-less box can be slow on longer articles.
      // A timeout here must degrade to untranslated text, not fail the request —
      // one slow/unreachable Ollama call must never 500 the whole feed.
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return JSON.parse(data.response);
  } catch {
    return null;
  }
}

export async function translateItem(item: NewsPayload, targetLang: string): Promise<NewsPayload> {
  if (targetLang === "en" || !item.id) return item;

  const cacheKey = `${item.id}:${targetLang}`;
  const cached = cache[cacheKey];
  if (cached) return cached;

  const fields: TranslatableFields = {
    summary: item.summary,
    analysis: item.analysis,
    summarized_analysis: item.summarized_analysis,
    flags: item.flags ?? [],
    claims: (item.sources_used ?? []).map((s) => s.claim_checked),
    reasons: (item.sources_used ?? []).map((s) => s.reason),
  };

  const translated = await callOllama(fields, targetLang);
  if (!translated) return item; // translation failure degrades to original text, not an error

  const result: NewsPayload = {
    ...item,
    summary: translated.summary ?? item.summary,
    // category is intentionally left untouched — it's the grouping/filter
    // key used across Nav/page.tsx/URL params, and display translation for
    // it is handled separately by the small static lookup in lib/i18n.ts
    // (categories are a bounded set of words, not free text worth an LLM call).
    analysis: translated.analysis ?? item.analysis,
    summarized_analysis: translated.summarized_analysis ?? item.summarized_analysis,
    flags: Array.isArray(translated.flags) && translated.flags.length === (item.flags?.length ?? 0)
      ? translated.flags
      : item.flags,
    sources_used: (item.sources_used ?? []).map((s, i) => ({
      ...s,
      claim_checked: translated.claims?.[i] ?? s.claim_checked,
      reason: translated.reasons?.[i] ?? s.reason,
    })),
  };

  cache[cacheKey] = result;
  return result;
}

export async function translateItems(items: NewsPayload[], targetLang: string): Promise<NewsPayload[]> {
  if (targetLang === "en") return items;
  return Promise.all(items.map((item) => translateItem(item, targetLang)));
}
