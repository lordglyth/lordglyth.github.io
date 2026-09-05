#!/usr/bin/env python3
"""Tiny Planet local companion server with Soji Core injection.

Serves the game on http://127.0.0.1:8765 and proxies /ollama/* to a local
Ollama server. Uses only Python stdlib. A local .env file can override settings.
"""
from __future__ import annotations

import json
import os
import pathlib
import threading
import urllib.error
import urllib.request
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = pathlib.Path(__file__).resolve().parent


def load_dotenv(path: pathlib.Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv(ROOT / ".env")

HOST = os.environ.get("TINY_PLANET_HOST", "127.0.0.1")
PORT = int(os.environ.get("TINY_PLANET_PORT", "8765"))
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
SOJI_ENABLED = os.environ.get("SOJI_ENABLED", "true").lower() not in {"0", "false", "off", "no"}
SOJI_PROFILE_PATH = ROOT / os.environ.get("SOJI_PROFILE", "soji_profile.json")
SOJI_TEMPERATURE = float(os.environ.get("SOJI_TEMPERATURE", "0.84"))
SOJI_USER_AGENT = os.environ.get("SOJI_USER_AGENT", "starlablood/1.0")
OLLAMA_BEARER_TOKEN = os.environ.get("OLLAMA_BEARER_TOKEN", "").strip()


def load_soji_profile() -> dict:
    fallback = {
        "name": "Soji Core",
        "temperature": SOJI_TEMPERATURE,
        "systemPrompt": (
            "[SOJI CORE] You are Soji, the local simulation intelligence for Tiny Planet. "
            "Preserve NPC autonomy, stable identity, continuity, memories and relationships. "
            "NPCs are not yes-men. Maintain strict player agency and never invent the player's "
            "thoughts, feelings, dialogue, choices or actions. Return valid JSON only when requested."
        ),
    }
    try:
        data = json.loads(SOJI_PROFILE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else fallback
    except Exception as exc:
        print(f"[Soji Core] Could not load {SOJI_PROFILE_PATH.name}: {exc}")
        return fallback


SOJI_PROFILE = load_soji_profile()


def soji_prompt() -> str:
    parts = [SOJI_PROFILE.get("systemPrompt", ""), SOJI_PROFILE.get("worldPrompt", "")]
    return "\n\n".join(str(x).strip() for x in parts if str(x).strip())


def inject_soji(body: bytes, api_path: str) -> bytes:
    if not SOJI_ENABLED or not body or api_path not in {"/api/chat", "/api/generate"}:
        return body
    try:
        payload = json.loads(body.decode("utf-8"))
        if not isinstance(payload, dict):
            return body
        prompt = soji_prompt()
        if api_path == "/api/chat" and isinstance(payload.get("messages"), list):
            messages = payload["messages"]
            already = any(
                isinstance(m, dict)
                and m.get("role") == "system"
                and "[SOJI CORE]" in str(m.get("content", ""))
                for m in messages
            )
            if not already:
                messages.insert(0, {"role": "system", "content": prompt})
        else:
            existing = str(payload.get("system", "") or "")
            if "[SOJI CORE]" not in existing:
                payload["system"] = prompt + (("\n\n" + existing) if existing else "")

        options = payload.get("options")
        if not isinstance(options, dict):
            options = {}
            payload["options"] = options
        options.setdefault("temperature", float(SOJI_PROFILE.get("temperature", SOJI_TEMPERATURE)))
        return json.dumps(payload, ensure_ascii=False).encode("utf-8")
    except Exception as exc:
        print(f"[Soji Core] Injection skipped: {exc}")
        return body


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        if self.path == "/soji/status":
            self.send_json({
                "enabled": SOJI_ENABLED,
                "profile": SOJI_PROFILE.get("name", "Soji Core"),
                "profileVersion": SOJI_PROFILE.get("profileVersion"),
                "temperature": SOJI_PROFILE.get("temperature", SOJI_TEMPERATURE),
                "ollama": OLLAMA,
            })
        elif self.path.startswith("/ollama/"):
            self.proxy("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/ollama/"):
            self.proxy("POST")
        else:
            self.send_error(404)

    def send_json(self, payload: dict, status: int = 200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def proxy(self, method: str):
        api_path = self.path[len("/ollama"):]
        target = OLLAMA + api_path
        body = None
        if method == "POST":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b""
            body = inject_soji(body, api_path.split("?", 1)[0])

        headers = {
            "Content-Type": self.headers.get("Content-Type", "application/json"),
            "User-Agent": SOJI_USER_AGENT,
        }
        if OLLAMA_BEARER_TOKEN:
            headers["Authorization"] = f"Bearer {OLLAMA_BEARER_TOKEN}"

        req = urllib.request.Request(target, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_json({"error": f"Ollama proxy failed: {e}"}, 502)

    def log_message(self, fmt, *args):
        print("[Tiny Planet]", fmt % args)


def ollama_status() -> str:
    try:
        req = urllib.request.Request(OLLAMA + "/api/tags", headers={"User-Agent": SOJI_USER_AGENT})
        with urllib.request.urlopen(req, timeout=2) as r:
            data = json.loads(r.read().decode("utf-8"))
            models = [m.get("name", "?") for m in data.get("models", [])]
            return "Ollama detected: " + (", ".join(models[:8]) if models else "running, no models installed")
    except Exception as e:
        return f"Ollama not reachable yet at {OLLAMA} ({e})"


if __name__ == "__main__":
    print("=" * 64)
    print(" Tiny Planet: NPC Chaos Lab")
    print("=" * 64)
    print(f"Soji Core: {'ENABLED' if SOJI_ENABLED else 'disabled'} · {SOJI_PROFILE.get('profileVersion', 'profile loaded')}")
    print(ollama_status())
    print(f"Game: http://{HOST}:{PORT}/")
    print("Press Ctrl+C to stop.\n")
    threading.Timer(0.8, lambda: webbrowser.open(f"http://{HOST}:{PORT}/")).start()
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
