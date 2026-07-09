import argparse
import json
import os
import subprocess
import wave
from collections import deque

import numpy as np
from faster_whisper import WhisperModel
import requests
import time
from datetime import datetime, timezone

# --- Configuration ---
STATIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "dashboard", "lib", "stations.json")
AUDIO_CLIPS_DIR = os.path.join(os.path.dirname(__file__), "audio_clips")
# Replace this with your n8n webhook URL (make sure it's a POST webhook).
# Use /webhook/... (production path) while the workflow is Active — the
# /webhook-test/... path only listens while the editor is in "test" mode
# and otherwise 404s.
N8N_WEBHOOK_URL = "http://localhost:5678/webhook/01e87e3f-162c-477c-a364-ff4020cfa302"
MODEL_SIZE = "small"
SAMPLE_RATE = 16000

# Buffer settings
CHUNK_DURATION = 60        # Audio processed per Whisper inference
WEBHOOK_INTERVAL = 5       # Send to n8n every 60 seconds
MAX_CLIPS_PER_STATION = 30 # ~5.8MB per clip (3 chunks of 16kHz mono s16le) -> ~175MB/station cap


def load_station(station_id):
    """Look up a station's stream URL/metadata from the shared config that
    also powers the dashboard's /radio pages, so both sides stay in sync."""
    with open(STATIONS_PATH, "r", encoding="utf-8") as f:
        stations = json.load(f)
    for station in stations:
        if station["id"] == station_id:
            return station
    available = ", ".join(s["id"] for s in stations)
    raise SystemExit(f"Unknown station id '{station_id}'. Available: {available}")


def chunk_duration_seconds(pcm_bytes):
    return len(pcm_bytes) / (SAMPLE_RATE * 2)  # 2 bytes per s16le sample


def write_wav(path, pcm_bytes):
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_bytes)


def cleanup_old_clips(station_dir):
    files = sorted(
        (f for f in os.listdir(station_dir) if f.endswith(".wav")),
        key=lambda f: os.path.getmtime(os.path.join(station_dir, f)),
    )
    while len(files) > MAX_CLIPS_PER_STATION:
        oldest = files.pop(0)
        try:
            os.remove(os.path.join(station_dir, oldest))
        except OSError:
            pass


def finalize_clip(station_id, history):
    """Writes a ~3 minute WAV clip (1 chunk of padding either side of the
    target chunk, where available) so a fact-checked claim can be listened
    to in its original broadcast context, not just read as text.

    `history` is a list of (chunk_id, pcm_bytes) tuples, oldest first:
      - 3 entries: target is the middle one, padded before AND after.
      - 2 entries: target is the first one (stream just started, no "before"
        padding exists yet) — padded after only.
    """
    station_dir = os.path.join(AUDIO_CLIPS_DIR, station_id)
    os.makedirs(station_dir, exist_ok=True)

    if len(history) == 3:
        target_id = history[1][0]
        combined = history[0][1] + history[1][1] + history[2][1]
        highlight_start = chunk_duration_seconds(history[0][1])
        highlight_end = highlight_start + chunk_duration_seconds(history[1][1])
    else:
        target_id = history[0][0]
        combined = history[0][1] + history[1][1]
        highlight_start = 0.0
        highlight_end = chunk_duration_seconds(history[0][1])

    write_wav(os.path.join(station_dir, f"{target_id}.wav"), combined)
    cleanup_old_clips(station_dir)


def send_to_n8n(webhook_url, station, text_buffer, clip_id=None, highlight_start=None, highlight_end=None):
    """Sends the accumulated text buffer to n8n via Webhook."""
    if not text_buffer.strip():
        return

    payload = {
        "source": station["id"],
        "station": station["id"],
        "station_name": station["name"],
        "country": station["country"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": WEBHOOK_INTERVAL,
        "transcription": text_buffer,
        "language": station["language"],
        "audio_clip_id": clip_id,
        "audio_clip_highlight_start": highlight_start,
        "audio_clip_highlight_end": highlight_end,
    }

    try:
        # n8n expects application/json by default for Webhook nodes [web:47, web:54]
        response = requests.post(webhook_url, json=payload, timeout=5)
        if response.ok:
            print(f"\n[n8n] Successfully pushed {len(text_buffer)} characters.")
        else:
            print(f"\n[n8n Error] Webhook returned {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"\n[n8n Error] Failed to send payload: {e}")


def main():
    parser = argparse.ArgumentParser(description="Transcribe a live radio stream and forward it to n8n.")
    parser.add_argument(
        "--station",
        default="fr-franceinfo",
        help="Station id from dashboard/lib/stations.json (default: fr-franceinfo). "
        "Run one instance of this script per station you want monitored.",
    )
    parser.add_argument("--webhook-url", default=N8N_WEBHOOK_URL, help="n8n webhook URL to POST transcriptions to.")
    args = parser.parse_args()

    station = load_station(args.station)

    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

    command = [
        'ffmpeg', '-i', station["streamUrl"], '-f', 's16le', '-acodec', 'pcm_s16le',
        '-ar', str(SAMPLE_RATE), '-ac', '1', '-loglevel', 'quiet', '-'
    ]
    chunk_bytes = SAMPLE_RATE * 2 * CHUNK_DURATION
    # The dashboard's fact-check feed for this station groups articles by the
    # `station` id sent in this payload, so it must match dashboard/lib/stations.json.
    whisper_language = {"French": "fr", "English": "en", "German": "de", "Spanish": "es",
                         "Italian": "it", "Dutch": "nl", "Portuguese": "pt", "Korean": "ko"}.get(station["language"], "en")

    # Sliding window of the last up-to-3 raw audio chunks, used to assemble
    # a ~3 minute clip around whichever chunk a claim came from. A clip for
    # chunk N is only finalized once chunk N+1 has been read, so audio
    # becomes listenable ~1 chunk (60s) after its article first appears —
    # in practice that's well within the fact-check pipeline's own latency.
    chunk_history = deque(maxlen=3)

    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, bufsize=10**8)
        print(f"Listening to {station['name']} ({station['country']})... (Will send to n8n every {WEBHOOK_INTERVAL}s)")

        current_buffer = ""
        current_clip_id = None
        current_highlight_start = None
        current_highlight_end = None
        last_send_time = time.time()

        while True:
            in_bytes = process.stdout.read(chunk_bytes)
            if not in_bytes:
                break

            chunk_id = f"{station['id']}-{int(time.time())}"
            prev_duration = chunk_duration_seconds(chunk_history[-1][1]) if chunk_history else 0.0
            chunk_history.append((chunk_id, in_bytes))

            current_clip_id = chunk_id
            current_highlight_start = prev_duration
            current_highlight_end = prev_duration + chunk_duration_seconds(in_bytes)

            audio_int16 = np.frombuffer(in_bytes, np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0

            segments, _ = model.transcribe(
                audio_float32, beam_size=5, language=whisper_language, condition_on_previous_text=False
            )

            # Append new text to our buffer
            for segment in segments:
                text = segment.text.strip()
                if text:
                    print(f"- {text}")
                    current_buffer += f"{text} "

            # Check if it's time to send the batch to n8n
            current_time = time.time()
            if current_time - last_send_time >= WEBHOOK_INTERVAL:
                send_to_n8n(
                    args.webhook_url, station, current_buffer,
                    clip_id=current_clip_id,
                    highlight_start=current_highlight_start,
                    highlight_end=current_highlight_end,
                )

                # Reset buffer and timer
                current_buffer = ""
                last_send_time = current_time

            # Now that we have a chunk after it, the previous chunk's clip
            # can be finalized with both "before" and "after" padding.
            if len(chunk_history) == 3:
                finalize_clip(station["id"], list(chunk_history))
            elif len(chunk_history) == 2:
                # Bootstrap: the very first chunk gets "after"-only padding
                # since there's nothing before it yet.
                finalize_clip(station["id"], [chunk_history[0], chunk_history[1]])

    except KeyboardInterrupt:
        print("\nStopping...")
        # Send whatever is left in the buffer on exit
        if current_buffer:
            send_to_n8n(
                args.webhook_url, station, current_buffer,
                clip_id=current_clip_id,
                highlight_start=current_highlight_start,
                highlight_end=current_highlight_end,
            )
    finally:
        if 'process' in locals():
            process.terminate()


if __name__ == "__main__":
    main()
