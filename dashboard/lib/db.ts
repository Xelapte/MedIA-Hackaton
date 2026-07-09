import Database from "better-sqlite3";
import path from "path";
import { NewsPayload } from "@/types";

// One connection per process, reused across hot-reloaded module instances in
// dev (same pattern as the old global-scoped in-memory array it replaces).
const globalForDb = global as unknown as { sqliteDb?: Database.Database };

const DB_PATH = path.join(process.cwd(), "data", "articles.db");

function getDb(): Database.Database {
  if (globalForDb.sqliteDb) return globalForDb.sqliteDb;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      station TEXT,
      audio_clip_id TEXT,
      audio_clip_highlight_start REAL,
      audio_clip_highlight_end REAL,
      summary TEXT NOT NULL,
      category TEXT NOT NULL,
      analysis TEXT NOT NULL,
      summarized_analysis TEXT NOT NULL,
      flags TEXT NOT NULL,
      sources_used TEXT NOT NULL,
      trust_level TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      news_value_importance REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_articles_timestamp ON articles (timestamp DESC);
  `);

  if (process.env.NODE_ENV !== "production") globalForDb.sqliteDb = db;
  return db;
}

// Same 100-article cap the in-memory store used, now trimmed by age instead
// of array length so it stays correct regardless of insert order.
const MAX_ARTICLES = 100;

export function insertArticle(article: Required<Pick<NewsPayload, "id" | "timestamp">> & NewsPayload) {
  const db = getDb();
  db.prepare(
    `INSERT INTO articles (
      id, timestamp, station, audio_clip_id, audio_clip_highlight_start, audio_clip_highlight_end,
      summary, category, analysis, summarized_analysis, flags, sources_used,
      trust_level, confidence_score, news_value_importance
    ) VALUES (
      @id, @timestamp, @station, @audio_clip_id, @audio_clip_highlight_start, @audio_clip_highlight_end,
      @summary, @category, @analysis, @summarized_analysis, @flags, @sources_used,
      @trust_level, @confidence_score, @news_value_importance
    )`
  ).run({
    id: article.id,
    timestamp: article.timestamp,
    station: article.station ?? null,
    audio_clip_id: article.audio_clip_id ?? null,
    audio_clip_highlight_start: article.audio_clip_highlight_start ?? null,
    audio_clip_highlight_end: article.audio_clip_highlight_end ?? null,
    summary: article.summary,
    category: article.category,
    analysis: article.analysis,
    summarized_analysis: article.summarized_analysis,
    flags: JSON.stringify(article.flags),
    sources_used: JSON.stringify(article.sources_used),
    trust_level: article.trust_level,
    confidence_score: article.confidence_score,
    news_value_importance: article.news_value_importance,
  });

  db.prepare(
    `DELETE FROM articles WHERE id NOT IN (
      SELECT id FROM articles ORDER BY timestamp DESC LIMIT ?
    )`
  ).run(MAX_ARTICLES);
}

interface ArticleRow {
  id: string;
  timestamp: number;
  station: string | null;
  audio_clip_id: string | null;
  audio_clip_highlight_start: number | null;
  audio_clip_highlight_end: number | null;
  summary: string;
  category: string;
  analysis: string;
  summarized_analysis: string;
  flags: string;
  sources_used: string;
  trust_level: string;
  confidence_score: number;
  news_value_importance: number;
}

function rowToArticle(row: ArticleRow): NewsPayload {
  return {
    id: row.id,
    timestamp: row.timestamp,
    station: row.station ?? undefined,
    audio_clip_id: row.audio_clip_id ?? undefined,
    audio_clip_highlight_start: row.audio_clip_highlight_start ?? undefined,
    audio_clip_highlight_end: row.audio_clip_highlight_end ?? undefined,
    summary: row.summary,
    category: row.category,
    analysis: row.analysis,
    summarized_analysis: row.summarized_analysis,
    flags: JSON.parse(row.flags),
    sources_used: JSON.parse(row.sources_used),
    trust_level: row.trust_level,
    confidence_score: row.confidence_score,
    news_value_importance: row.news_value_importance,
  };
}

export function getAllArticles(): NewsPayload[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM articles ORDER BY timestamp DESC`).all() as ArticleRow[];
  return rows.map(rowToArticle);
}
