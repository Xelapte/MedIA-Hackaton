export type Verdict = 'True' | 'False' | 'Misleading' | 'Unverifiable';
export type TrustLevel = 'High' | 'Medium' | 'Low' | 'Unverifiable';

export interface Source {
  claim_checked: string;
  source_url: string;
  // The fact-checking LLM is instructed to emit one of the Verdict enum
  // values, but the wire payload isn't validated — treat as raw text and
  // normalize at render time (see lib/verdict.ts#normalizeVerdict).
  verdict: string;
  // Why this specific source proves the claim true/false/misleading — not
  // the full article-level analysis, just this one source's role in the verdict.
  reason: string;
}

export interface NewsPayload {
  id?: string;
  timestamp?: number;
  station?: string;
  // Reference to the ~3 minute broadcast clip this claim was pulled from
  // (see app/audio_clips/ and /api/audio-clip/[clipId]). highlight_start/end
  // mark where the transcribed chunk sits within that clip, in seconds.
  audio_clip_id?: string;
  audio_clip_highlight_start?: number;
  audio_clip_highlight_end?: number;
  summary: string;
  category: string;
  analysis: string;
  summarized_analysis: string;
  flags: string[];
  sources_used: Source[];
  // Same caveat as Source.verdict — raw LLM text, normalize before display.
  trust_level: string;
  confidence_score: number;
  news_value_importance: number;
}