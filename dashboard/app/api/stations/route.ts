import { NextRequest, NextResponse } from "next/server";
import { STATIONS } from "@/lib/stations";
import { isListening, startListener, stopListener } from "@/lib/stationRuntime";

export async function GET() {
  const stations = STATIONS.map((s) => ({
    ...s,
    active: isListening(s.id),
  }));
  return NextResponse.json(stations);
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, active } = await req.json();
    if (typeof id !== "string" || typeof active !== "boolean") {
      return NextResponse.json({ error: "Expected { id: string, active: boolean }" }, { status: 400 });
    }
    if (!STATIONS.some((s) => s.id === id)) {
      return NextResponse.json({ error: "Unknown station id" }, { status: 404 });
    }

    const result = active ? startListener(id) : stopListener(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed to update listener" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, active: isListening(id) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}
