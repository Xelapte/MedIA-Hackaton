import { NextRequest, NextResponse } from "next/server";

// Reuses the exact production webhook main.py already posts to — no new
// n8n workflow needed. Each submission gets a unique "station" id so the
// client can poll /api/webhook and know precisely when *this* submission's
// result has landed, without touching any real radio station's feed.
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/01e87e3f-162c-477c-a364-ff4020cfa302";

export async function POST(req: NextRequest) {
  try {
    const { text, language, station, stationName } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // A caller can pass a persistent `station` id (e.g. a live interview
    // session) so every chunk it submits groups under the same id instead of
    // each getting its own throwaway one — same mechanism a radio station
    // uses to accumulate a running history.
    const submissionId = typeof station === "string" && station ? station : `manual-${crypto.randomUUID()}`;
    const payload = {
      source: "manual_submission",
      station: submissionId,
      station_name: typeof stationName === "string" && stationName ? stationName : "Manual Submission",
      country: "N/A",
      timestamp: new Date().toISOString(),
      duration_seconds: 0,
      transcription: text,
      language: language || "auto",
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `n8n webhook returned ${response.status}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, submissionId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
