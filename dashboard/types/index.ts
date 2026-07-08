export type Verdict = 'True' | 'False' | 'Misleading' | 'Unverifiable';
export type TrustLevel = 'High' | 'Medium' | 'Low' | 'Unverifiable';

export interface Source {
  claim_checked: string;
  source_url: string;
  verdict: Verdict;
}

export interface NewsPayload {
  id?: string;
  timestamp?: number;
  summary: string;
  category: string;
  analysis: string;
  summarized_analysis: string;
  flags: string[];
  sources_used: Source[];
  trust_level: TrustLevel;
  confidence_score: number;
  news_value_importance: number;
}