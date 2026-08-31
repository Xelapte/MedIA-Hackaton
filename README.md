# Verity — Live-Radio Fact-Checking Dashboard

Built at the **MedIA hackathon**. Verity listens to live radio streams from around the world, transcribes them as they air, and fact-checks the news claims in real time — surfacing the result on a public dashboard with a per-station credibility score.

## What it does

- **Live ingestion**: pulls live audio from **37 radio stations across 13 countries** and transcribes it in real time with `faster-whisper`.
- **Claim extraction & fact-checking**: an n8n workflow feeds each transcript segment to an LLM agent that splits it into discrete news items (filtering out ads, sports, weather), then a second agent fact-checks each claim against live web search.
- **Credibility scoring**: a "Bullshit Score" is computed per station and per topic — weighted so a false claim on a high-importance story hurts the score far more than an error on a trivial one, and scaled by the fact-checker's own confidence.
- **Interactive dashboard**: a Next.js app with a world map of stations, a live feed per station, and a detail page per article showing the full evidence log (each source, with a one-line reasoning for its verdict) and a synced audio clip of the original broadcast moment.
- **Submit your own claim**: a `/fact-check` page lets anyone paste text, record audio, or upload a file to run the same fact-checking pipeline on demand.
- **Bilingual**: every article is generated in English and French, with on-demand LLM translation cached per article.

## Architecture

```
Radio stream --ffmpeg--> faster-whisper (transcription)
                              |
                              v
                    n8n workflow (Docker)
              AI Agent 1: split transcript into news items
              AI Agent 2: fact-check each item via web search
                              |
                              v
                 POST /api/webhook  -->  Next.js dashboard
                                          - world map + station list
                                          - per-station live feed
                                          - per-article evidence log
                                          - synced audio playback
```

## Tech stack

`TypeScript` · `Next.js` · `Python` · `n8n` (workflow orchestration) · `faster-whisper` (speech-to-text) · `Ollama` (local LLM translation) · `Brave Search` (fact-check evidence) · `Docker`

## Team

Built by [Alex Huang](https://github.com/Xelapte) with AI pair-programming support.
