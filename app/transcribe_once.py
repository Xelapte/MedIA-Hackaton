import argparse
import json
import sys

from faster_whisper import WhisperModel

MODEL_SIZE = "small"


def main():
    parser = argparse.ArgumentParser(description="Transcribe a single audio file and print JSON to stdout.")
    parser.add_argument("audio_path")
    parser.add_argument("--language", default=None, help="Force a language (ISO 639-1). Omit to auto-detect.")
    args = parser.parse_args()

    try:
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        segments, info = model.transcribe(args.audio_path, beam_size=5, language=args.language)
        text = " ".join(segment.text.strip() for segment in segments).strip()
        print(json.dumps({
            "text": text,
            "language": info.language,
            "duration_seconds": round(info.duration, 1),
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
