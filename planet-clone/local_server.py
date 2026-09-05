#!/usr/bin/env python3
"""Tiny Planet local companion server.

Serves the game on http://127.0.0.1:8765 and proxies /ollama/* to a local
Ollama server (default http://127.0.0.1:11434). Uses only Python stdlib.
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
HOST = os.environ.get("TINY_PLANET_HOST", "127.0.0.1")
PORT = int(os.environ.get("TINY_PLANET_PORT", "8765"))
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")

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
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/ollama/"):
            self.proxy("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/ollama/"):
            self.proxy("POST")
        else:
            self.send_error(404)

    def proxy(self, method: str):
        target = OLLAMA + self.path[len("/ollama"):]
        body = None
        if method == "POST":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length) if length else b""
        req = urllib.request.Request(
            target,
            data=body,
            method=method,
            headers={"Content-Type": self.headers.get("Content-Type", "application/json")},
        )
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
            data = json.dumps({"error": f"Ollama proxy failed: {e}"}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("[Tiny Planet]", fmt % args)


def ollama_status() -> str:
    try:
        with urllib.request.urlopen(OLLAMA + "/api/tags", timeout=2) as r:
            data = json.loads(r.read().decode("utf-8"))
            models = [m.get("name", "?") for m in data.get("models", [])]
            return "Ollama detected: " + (", ".join(models[:8]) if models else "running, no models installed")
    except Exception as e:
        return f"Ollama not reachable yet at {OLLAMA} ({e})"


if __name__ == "__main__":
    print("=" * 64)
    print(" Tiny Planet: NPC Chaos Lab")
    print("=" * 64)
    print(ollama_status())
    print(f"Game: http://{HOST}:{PORT}/")
    print("Press Ctrl+C to stop.\n")
    threading.Timer(0.8, lambda: webbrowser.open(f"http://{HOST}:{PORT}/")).start()
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
