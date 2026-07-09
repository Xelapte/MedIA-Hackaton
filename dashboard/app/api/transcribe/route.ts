import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

const APP_DIR = path.resolve(process.cwd(), "..", "app");
const VENV_PYTHON = path.join(APP_DIR, ".venv", "bin", "python");

interface TranscribeResult {
  text: string;
  language: string;
  duration_seconds: number;
}

function runTranscription(audioPath: string): Promise<TranscribeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(VENV_PYTHON, ["transcribe_once.py", audioPath], { cwd: APP_DIR });
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Transcription timed out"));
    }, 120000);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `transcribe_once.py exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`Could not parse transcription output: ${stdout}`));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  const tmpPath = path.join(os.tmpdir(), `factcheck-upload-${randomUUID()}`);
  await fs.writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));

  try {
    const result = await runTranscription(tmpPath);
    if (!result.text.trim()) {
      return NextResponse.json(
        { error: "No speech detected in the audio — try a clearer recording." },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
