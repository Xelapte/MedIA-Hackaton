# Handoff — MedIA / Verity

Live-radio fact-checking dashboard. Radio audio → Whisper transcription → n8n
(LLM claim extraction + fact-check) → Next.js dashboard.

## Architecture

```
app/main.py  --station <id>            Next.js dashboard (dashboard/)
  ffmpeg pulls stream                    /radio             world map + station list, players, Bullshit Score
  faster-whisper transcribes             /radio/[id]         per-station live feed + per-topic scores
  rolling audio buffer -> .wav clips     /article/[id]       full fact-check + audio playback
  POST → n8n webhook                     /fact-check         submit your own text/audio to check
       │                                 /api/webhook        article store (GET/POST)
       ▼                                 /api/stations       listener control (GET/PATCH)
n8n (docker, :5678)                      /api/transcribe     one-shot audio -> text (for /fact-check)
  AI Agent      → splits transcript      /api/audio-clip/    streams a clip (HTTP Range support)
                  into news items,           │
                  filters ads/sports/         │ spawns/kills
                  weather                     │ (child_process)
  AI Agent1     → fact-checks each item       ▼
                  via Brave Search        app/main.py processes (one per
  HTTP Request  → POST                    active station)
    dashboard:4000/api/webhook
```

Everything is in-memory (no database). Restarting the dashboard dev server
clears the article store and kills any listener processes it spawned — you
have to re-toggle stations on afterward (see "Known issues").

## Running it

```bash
# 1. Dashboard (pinned to port 4000 — 3000 is taken by the open-webui container)
cd dashboard && npm run dev

# 2. n8n, Ollama, SearXNG, open-webui — already running via docker
docker ps   # n8n :5678, ollama :11434, open-webui :3000, searxng (internal)

# 3. Radio listeners — NOT auto-started on boot. Either:
#    a) toggle a station on at http://localhost:4000/radio (spawns it for you), or
#    b) run manually:
cd app && .venv/bin/python -u main.py --station fr-franceinfo
```

Station ids/streams live in `dashboard/lib/stations.json` (37 stations, 13
countries) — shared source of truth read by both the dashboard and
`main.py`.

**⚠️ This repo lives on a Windows-mounted path (`/mnt/c/...`) under WSL2,
where file-change events (inotify) don't propagate reliably.** Next.js's dev
server will silently keep serving old code after you edit a file — no error,
no recompile log line, it just doesn't pick up the change. This bit us hard
this session (spent a long debugging detour chasing a "the LLM won't comply
with the prompt" theory before realizing the dev server was serving
pre-edit code the whole time). **After editing any file under `dashboard/`,
kill and restart `npm run dev`** (`pkill -f "next dev -p 4000"` then
`npm run dev` again) before trusting what you see in the browser or via
curl. `app/main.py` doesn't have this problem — it's a fresh Python process
each time a station is spawned, so it always reads the current file.

If you hit `npm run build` failing with `PageNotFoundError` for a route that
clearly exists on disk: it's a stale `.next` cache, not a real error —
`rm -rf dashboard/.next` and rebuild. This has come up repeatedly.

## What's implemented

- **Multi-station radio**: `/radio` (browse + play + toggle monitoring),
  `/radio/[id]` (live player + that station's fact-checked feed). Toggling
  "Monitored" in the UI genuinely spawns/kills a `main.py` process
  (`dashboard/lib/stationRuntime.ts`) — it's not a fake flag.
- **World map on `/radio`** (`dashboard/components/WorldMapStations.tsx`,
  via `react-simple-maps` + `world-atlas`, bundled topojson — no runtime
  fetch): a dark, teal-toned "radar" map sitting as a normal card
  (`420px`/`480px` tall) beside the station list, not full-bleed — an
  earlier full-viewport-height version was walked back because it felt
  disconnected from the rest of the site and hijacked page scroll. Dots are
  colored by monitoring state (green/glowing = monitored, muted warm-gray =
  listen-only, same hue families as `verdict-true`/`ink` elsewhere in the
  app, not an unrelated cyan/blue palette). Same-city stations (e.g. 3 Paris
  stations) are jittered into a small ring in the *rendering* only — the
  underlying `lat`/`lng` in `stations.json` is the true city coordinate.
  Click a dot → a floating popup reuses the same card styling as the
  sidebar list, clamped to stay inside the viewport. Zoom/pan via
  `ZoomableGroup`: **scroll-wheel zoom requires Ctrl/Cmd** and pinch-zoom
  requires two fingers — deliberately, because the default behavior
  hijacked normal page scrolling the moment your cursor was over the map
  (see `filterZoomEvent` in `WorldMapStations.tsx`). Marker radius is
  compensated by `1/zoom` so dots don't balloon at high zoom.
- **Language selector (EN/FR)** — a *reading preference, not a filter*.
  Every article is always returned in both languages; `lang` only controls
  which text `/api/webhook?lang=` renders. Translation runs on-demand
  through local Ollama (`llama3.2`, free) and is cached permanently per
  article+language in `dashboard/lib/translate.ts`. First view in French:
  ~15-20s (CPU-only model); every view after: instant. `category` and
  verdict/trust enums are NOT LLM-translated (they're filter/status keys —
  static lookup instead, so URLs and badge logic never break). All SWR
  fetches keyed on `lang` use `keepPreviousData: true` so switching language
  never blanks the list while a translation is in flight (this was a real
  bug — fixed).
- **News Gravity Level**: `news_value_importance`, on a **1-10** scale.
  Signal-bar meter on article cards and the detail page.
- **Bullshit Score**: per-station credibility score (`dashboard/lib/bullshitScore.ts`),
  weighted so a false claim on a high-gravity story hurts far more than one
  on a trivial story (asymmetric: False stronger penalty than True's
  reward). Shown as an **overall** score on `/radio/[id]` plus an
  **independent score per topic**.
- **Evidence Log with per-source reasoning** (`/article/[id]`): each source
  under "Evidence Log" now shows a `reason` line — 1-2 sentences on *why*
  that specific source proves the claim true/false/misleading, not just the
  verdict badge. This required n8n prompt changes (AI Agent1's system
  message now mandates a `reason` key per `sources_used` entry, with a
  worked few-shot example — plain instruction-only wording wasn't reliably
  followed by Mistral, the few-shot example was what actually got
  compliance), plus `reason` threaded through `types/index.ts`,
  `/api/webhook`'s `normalizePayload`, `lib/translate.ts` (so it translates
  into French too), and the article page UI. Verified end-to-end with a
  real broadcast.
- **Fact-check submission page** (`/fact-check`): paste text, record via
  mic, or upload an audio file. Audio goes through a one-shot transcription
  script (`app/transcribe_once.py`, wrapped by `/api/transcribe`); either
  path POSTs to `/api/fact-check`, which reuses the **exact same production
  n8n webhook** `main.py` posts to — tagging the submission with a unique
  `manual-<uuid>` "station" id so the client can poll `/api/webhook` and
  know precisely when that submission's result has landed.
- **Audio clip playback** (article detail page) — **verified end-to-end
  this session**. `main.py` keeps a rolling buffer of raw audio and writes
  a ~3 minute `.wav` clip (1 min padding before/after) for every chunk that
  produces a fact-checked claim, saved to
  `app/audio_clips/<station>/<clip_id>.wav`. The clip id and highlight
  start/end flow through n8n and land on the `NewsPayload`, served via
  `/api/audio-clip/[clipId]` (HTTP Range support, so the browser can seek).
  `AudioClipPlayer.tsx` renders a custom scrubber with a persistent
  highlighted band (in red — `bg-verdict-false/40` — reusing the palette's
  existing red rather than inventing a new color) marking the exact moment.
  Confirmed live: a real France Info clip was written to disk, served
  correctly (both full `200` and Range `206` requests), and the article
  payload's `audio_clip_id`/`highlight_start`/`highlight_end` matched the
  file on disk.
- **Korean stations**: `kr-ytn-radio` (YTN Radio, Korea's dedicated 24h news
  channel — the best fit for this app), `kr-tbn-gyeongin` (TBN traffic/news),
  `kr-obs-radio` (OBS Radio, Gyeonggi). Deliberately *not* KBS/MBC/SBS —
  their public stream URLs are now signed with short-lived expiring tokens
  (hours), unsuitable for a static config; these three use stable, unsigned
  official mountpoints instead, cross-checked against the Radio Browser
  community database. `main.py`'s `whisper_language` map needed a
  `"Korean": "ko"` entry too — without it, Korean audio would silently get
  transcribed as if it were English. Verified live: a real YTN broadcast
  produced a coherent, correctly-transcribed Korean political news article.

## Known issues / things to watch

- **WSL dev-server hot-reload doesn't work reliably** — see the ⚠️ under
  "Running it". This is the single most time-costly gotcha in this repo;
  read it before debugging anything that "should have changed but didn't."
- **No auto-start on boot.** Dashboard restart kills all listener processes
  it spawned and empties the article store. Re-toggle stations afterward.
- **Ollama translation is slow on first view** (~15-20s, CPU-only
  `llama3.2:3B`). Cached after that.
- **LLM output isn't a strict enum.** The n8n fact-check prompt asks for
  `verdict: "True"/"False"/...` but Mistral sometimes pads it, and — as
  found this session with the `reason` field — plain textual instructions
  in the prompt aren't always enough; a concrete few-shot example in the
  schema was what got reliable compliance. `dashboard/lib/verdict.ts`
  (`normalizeVerdict`/`normalizeTrustLevel`) and `/api/webhook`'s
  `normalizePayload()` still defensively handle drift regardless.
- **`n8n/workflow.json` was re-exported this session and is now current**
  with the live workflow (it had drifted stale in earlier sessions). If you
  edit the workflow live via the n8n API/CLI again, remember to re-export:
  `docker exec n8n n8n export:workflow --id=JP7XZxJxHEPSaC3i --output=/tmp/wf.json`,
  `docker cp` it out, trim to the repo's field set. Note also: `n8n
  import:workflow` deactivates the workflow as a side effect, and
  `n8n publish:workflow` only takes effect after `docker restart n8n`.
- **Mistral + Brave Search costs**: every checkable claim triggers 2 LLM
  calls, **per active station**. Watch usage if on a metered plan.
- **`main.py`'s webhook URL must be the production path** (`/webhook/...`),
  not `/webhook-test/...`.
- **Audio clip disk usage**: capped at 30 clips/station (~175MB/station) via
  `MAX_CLIPS_PER_STATION` in `main.py`, cleaned up opportunistically.
- **The very last chunk before a listener is stopped never gets an audio
  clip** (it needs the *next* chunk to arrive to know its "after" padding,
  which never comes). Minor, not worth fixing for the hackathon.

## Config / where things live

| What | Where |
|---|---|
| Station list (id, country, lat/lng, stream URL, language) | `dashboard/lib/stations.json` |
| World map component | `dashboard/components/WorldMapStations.tsx` |
| n8n workflow reference copy (now current, see above) | `n8n/workflow.json` |
| n8n docker config | `n8n/docker-compose.yml`, `n8n/.env` |
| Radio ingestion script | `app/main.py` (venv at `app/.venv`) |
| One-shot transcription (for `/fact-check` audio uploads) | `app/transcribe_once.py` |
| Audio clips on disk | `app/audio_clips/<station_id>/<clip_id>.wav` |
| i18n dictionary | `dashboard/lib/i18n.ts` |
| Listener process manager | `dashboard/lib/stationRuntime.ts` |
| Translation cache/client | `dashboard/lib/translate.ts` |
| Bullshit Score logic | `dashboard/lib/bullshitScore.ts` |

## Ideas for next steps

- Persist the article store (currently in-memory, lost on restart) — SQLite
  or similar would be a small lift.
- Auto-start previously-active stations when the dashboard boots.
- Add more languages beyond EN/FR (the i18n dictionary and translation
  pipeline are already generic — just add entries to `LANGUAGES` in
  `lib/i18n.ts` and a matching dictionary block).
- Consider whether `/radio` station-list cards should show per-topic
  Bullshit Score too, or stay overall-only (currently overall-only by
  design, to keep cards compact — full breakdown lives on `/radio/[id]`).
- The world map's zoom-in default center ([12, 22]) and scale (175) are
  tuned for the current station spread (Europe-heavy); revisit if station
  coverage shifts significantly (e.g. many more Asia/Americas stations).
