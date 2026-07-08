import { NextRequest, NextResponse } from "next/server";
import { NewsPayload } from "@/types";

const globalForStore = global as unknown as { newsStore: NewsPayload[] };
const newsStore = globalForStore.newsStore || [];
if (process.env.NODE_ENV !== "production") globalForStore.newsStore = newsStore;

export async function POST(req: NextRequest) {
  try {
    const payload: NewsPayload = await req.json();
    const newItem = { ...payload, id: crypto.randomUUID(), timestamp: Date.now() };
    
    newsStore.unshift(newItem);
    if (newsStore.length > 100) newsStore.pop();

    return NextResponse.json({ success: true, id: newItem.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(newsStore);
}