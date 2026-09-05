# Tiny Planet: NPC Chaos Lab

A from-scratch browser planet sandbox: sculpt a tiny procedural world, seed it with autonomous NPCs, then watch what happens when you interfere.

The planet painter is inspired by the *kind* of tactile tiny-world interaction seen in Oskar Stålberg's Polygonal Planet Project. The NPC simulation adds independently implemented emergent-life mechanics inspired by **Life of an NPC**: goals, agendas, conversations, object/resource behavior, survival needs, memories, relationships, player overrides, research/tech progression, sandbox spawning, and LLM-driven decisions. No code or assets from either project are included.

## Features

- Procedural low-poly spherical planet with land, water, forest, settlements and snow.
- Paint/raise/lower terrain directly on the globe.
- Autonomous NPC population with health, hunger, mood, jobs, traits, goals and inventories.
- NPC agendas, short/long memories, relationships, conversations, gathering, crafting, construction and death.
- Settlement expansion plus research progress and civilization tech levels.
- **Influence console**: inject rumors, disasters, festivals, scarcity, relics, commands or whatever chaos you type.
- NPC inspector: edit goals/name, force actions, inspect inventory/agenda/relationships/memories.
- View modes: whole planet, closer settlement view, follow selected NPC, and world chronicle.
- Sandbox mode and NPC creation.
- Browser-local save/load.
- Local LLM support through Ollama, with a deterministic built-in simulation fallback when Ollama is disconnected.
- **Soji Core** system/world profile injected into Ollama decisions for persistent canon, autonomous non-yes-men NPCs, memory/relationship continuity and strict player agency.
- **Mobile-first control dock**: Tools, NPC, Influence, Soji and View open as thumb-friendly bottom sheets while leaving the planet visible.
- Mobile safe-area support, 44px+ touch targets, landscape handling, scrollable quick events and full-screen mobile Chronicle mode.

## Best way to use your local Ollama model

GitHub Pages can run the visual sandbox, but browsers can restrict requests from a public HTTPS page to services on your PC. The included companion server avoids that problem.

1. Install/run Ollama and make sure you have at least one model (`ollama list`).
2. Clone/download this folder to the computer running Ollama.
3. Optional: copy `.env.example` to `.env` and change local settings.
4. Double-click **`start_local.bat`** on Windows, or run `python local_server.py`.
5. The game opens at `http://127.0.0.1:8765/`.
6. In **LOCAL AI · SOJI CORE**, keep **Local companion server (recommended)** selected and press **Connect**.
7. Pick any installed Ollama model. Auto AI rotates NPC decisions through the model; **Think now** forces the selected NPC to decide immediately.

The server uses Python's standard library only. By default it proxies to `http://127.0.0.1:11434`. It loads `.env` itself, so no extra package is needed. The real `.env` is gitignored.

## Soji Core

`soji_profile.json` follows the Soji Worlds wrapper convention and carries the world/system behavior for this simulation. `soji_client.js` injects the profile for browser/direct requests, while `local_server.py` injects it for proxied requests. Both mark the prompt with `[SOJI CORE]` so it is not duplicated.

The profile keeps NPCs autonomous and distinct, preserves stable identities/canon/memories/relationships, limits NPC knowledge to what they plausibly know, keeps consequences persistent, and does not decide the player's thoughts, feelings, dialogue, choices or physical actions. Default temperature is `0.84`.

See **`SOJI.md`** for the exact setup and environment variables.

## Direct Ollama mode

The UI also includes a **Direct Ollama URL** mode. This can work when the browser is allowed to call your Ollama endpoint directly and Ollama's allowed origins are configured for the page origin. `soji_client.js` still injects Soji Core into `/api/chat` and `/api/generate` calls in this mode.

## How local AI is used

NPC prompts include compact world state: needs, current actions, goals, memories, relationships, inventory, research/tech and recent world events. The model returns structured JSON describing a thought, next action, optional speech/target, memory changes and need/mood deltas. Player influence prompts go through a separate world-director request so a single typed intervention can ripple through multiple NPCs.

The local model never needs a cloud API key.
