import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AUDIO_CLIPS_DIR = path.resolve(process.cwd(), "..", "app", "audio_clips");

function findClipPath(clipId: string): string | null {
  // main.py builds clip ids as "{station_id}-{unix_timestamp}" — station ids
  // can themselves contain hyphens, so the station id is everything before
  // the LAST hyphen, not the first.
  const lastDash = clipId.lastIndexOf("-");
  if (lastDash === -1) return null;
  const stationId = clipId.slice(0, lastDash);
  const candidate = path.join(AUDIO_CLIPS_DIR, stationId, `${clipId}.wav`);
  return fs.existsSync(candidate) ? candidate : null;
}

export async function GET(req: NextRequest, { params }: { params: { clipId: string } }) {
  // Validate before any filesystem access — clip ids are only ever
  // alphanumeric/hyphen (station id + unix timestamp), so anything else is
  // rejected outright rather than risking path traversal.
  if (!/^[a-zA-Z0-9_-]+$/.test(params.clipId)) {
    return NextResponse.json({ error: "Invalid clip id" }, { status: 400 });
  }

  const filePath = findClipPath(params.clipId);
  if (!filePath) {
    return NextResponse.json({ error: "Clip not found or not ready yet" }, { status: 404 });
  }

  const fileSize = fs.statSync(filePath).size;
  const range = req.headers.get("range");

  if (!range) {
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const match = range.match(/bytes=(\d*)-(\d*)/);
  const start = match?.[1] ? parseInt(match[1], 10) : 0;
  const end = match?.[2] ? parseInt(match[2], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  const buffer = Buffer.alloc(chunkSize);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buffer, 0, chunkSize, start);
  fs.closeSync(fd);

  return new NextResponse(buffer, {
    status: 206,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
