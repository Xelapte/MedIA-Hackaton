import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { STATIONS } from "./stations";

const APP_DIR = path.resolve(process.cwd(), "..", "app");
const VENV_PYTHON = path.join(APP_DIR, ".venv", "bin", "python");
const PYTHON_BIN = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3";

interface ListenerEntry {
  process: ChildProcess;
  startedAt: number;
  logs: string[];
}

const globalForListeners = global as unknown as {
  stationListeners?: Record<string, ListenerEntry>;
  stationCleanupRegistered?: boolean;
};
const listeners: Record<string, ListenerEntry> = globalForListeners.stationListeners || {};
if (process.env.NODE_ENV !== "production") globalForListeners.stationListeners = listeners;

const MAX_LOG_LINES = 40;

function pushLog(id: string, line: string) {
  const entry = listeners[id];
  if (entry) entry.logs.push(line), entry.logs.length > MAX_LOG_LINES && entry.logs.shift();
}

export function isListening(id: string): boolean {
  return Boolean(listeners[id]);
}

export function listenerLogs(id: string): string[] {
  return listeners[id]?.logs ?? [];
}

export function startListener(id: string): { ok: boolean; error?: string } {
  if (listeners[id]) return { ok: true };
  if (!STATIONS.some((s) => s.id === id)) return { ok: false, error: "Unknown station id" };

  console.log(`[stationRuntime] spawning ${PYTHON_BIN} -u main.py --station ${id} (cwd=${APP_DIR})`);
  const child = spawn(PYTHON_BIN, ["-u", "main.py", "--station", id], {
    cwd: APP_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  listeners[id] = { process: child, startedAt: Date.now(), logs: [] };

  child.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) if (line.trim()) pushLog(id, line);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) if (line.trim()) pushLog(id, `[stderr] ${line}`);
  });
  child.on("exit", (code, signal) => {
    console.log(`[stationRuntime] ${id} exited (code=${code}, signal=${signal})`);
    delete listeners[id];
  });
  child.on("error", (err) => {
    console.log(`[stationRuntime] ${id} spawn error: ${err.message}`);
    pushLog(id, `[spawn error] ${err.message}`);
    delete listeners[id];
  });

  return { ok: true };
}

export function stopListener(id: string): { ok: boolean; error?: string } {
  listeners[id]?.process.kill("SIGINT");
  delete listeners[id];
  return { ok: true };
}

// Whisper + ffmpeg child processes survive their Node parent by default
// (POSIX reparents orphans to init) — kill them explicitly when the
// dashboard dev server itself is stopped, so a `Ctrl+C` doesn't leave
// invisible listeners burning CPU and API quota in the background.
if (!globalForListeners.stationCleanupRegistered) {
  const cleanup = () => {
    for (const id of Object.keys(listeners)) listeners[id].process.kill("SIGINT");
  };
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  globalForListeners.stationCleanupRegistered = true;
}
