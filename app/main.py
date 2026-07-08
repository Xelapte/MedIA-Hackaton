import subprocess
import numpy as np
from faster_whisper import WhisperModel
import requests
import time
from datetime import datetime, timezone

# --- Configuration ---
STREAM_URL = "http://direct.franceinfo.fr/live/franceinfo-midfi.mp3" 
# Replace this with your n8n webhook URL (make sure it's a POST webhook)
N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/01e87e3f-162c-477c-a364-ff4020cfa302"
MODEL_SIZE = "small" 
SAMPLE_RATE = 16000  

# Buffer settings
CHUNK_DURATION = 60        # Audio processed per Whisper inference
WEBHOOK_INTERVAL = 5       # Send to n8n every 60 seconds

def send_to_n8n(text_buffer):
    """Sends the accumulated text buffer to n8n via Webhook."""
    if not text_buffer.strip():
        return

    payload = {
        "source": "franceinfo_radio",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": WEBHOOK_INTERVAL,
        "transcription": text_buffer,
        "language": "fr"
    }
    
    try:
        # n8n expects application/json by default for Webhook nodes [web:47, web:54]
        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
        print(f"\n[n8n] Successfully pushed {len(text_buffer)} characters.")
    except Exception as e:
        print(f"\n[n8n Error] Failed to send payload: {e}")

def main():
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8") 
    
    command = [
        'ffmpeg', '-i', STREAM_URL, '-f', 's16le', '-acodec', 'pcm_s16le',
        '-ar', str(SAMPLE_RATE), '-ac', '1', '-loglevel', 'quiet', '-'
    ]
    chunk_bytes = SAMPLE_RATE * 2 * CHUNK_DURATION

    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, bufsize=10**8)
        print("Listening and transcribing... (Will send to n8n every 60s)")
        
        current_buffer = ""
        last_send_time = time.time()

        while True:
            in_bytes = process.stdout.read(chunk_bytes)
            if not in_bytes:
                break
                
            audio_int16 = np.frombuffer(in_bytes, np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0
            
            segments, _ = model.transcribe(audio_float32, beam_size=5, language="fr", condition_on_previous_text=False)
            
            # Append new text to our buffer
            for segment in segments:
                text = segment.text.strip()
                if text:
                    print(f"- {text}")
                    current_buffer += f"{text} "
            
            # Check if it's time to send the batch to n8n
            current_time = time.time()
            if current_time - last_send_time >= WEBHOOK_INTERVAL:
                send_to_n8n(current_buffer)
                
                # Reset buffer and timer
                current_buffer = ""
                last_send_time = current_time

    except KeyboardInterrupt:
        print("\nStopping...")
        # Send whatever is left in the buffer on exit
        if current_buffer:
            send_to_n8n(current_buffer)
    finally:
        if 'process' in locals():
            process.terminate()

if __name__ == "__main__":
    main()