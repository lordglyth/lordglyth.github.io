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

## Best way to use your local Ollama model

GitHub Pages can run the visual sandbox, but browsers can restrict requests from a public HTTPS page to services on your PC. The included companion server avoids that problem.

1. Install/run Ollama and make sure you have at least one model (`ollama list`).
2. Clone/download this folder to the computer running Ollama.
3. Double-click **`start_local.bat`** on Windows, or run `python local_server.py`.
4. The game opens at `http://127.0.0.1:8765/`.
5. In **LOCAL AI**, keep **Local companion server (recommended)** selected and press **Connect**.
6. Pick any installed Ollama model. Auto AI will rotate NPC decisions through the model; **Think now** forces the selected NPC to decide immediately.

The server uses Python's standard library only. By default it proxies to `http://127.0.0.1:11434`. Override that with the `OLLAMA_URL` environment variable if needed.

## Direct Ollama mode

The UI also includes a **Direct Ollama URL** mode. This can work when the browser is allowed to call your Ollama endpoint directly and Ollama's allowed origins are configured for the page origin. The companion-server mode is less fiddly and keeps the LLM traffic local.

## How local AI is used

NPC prompts include compact world state: needs, current actions, goals, memories, relationships, inventory, research/tech and recent world events. The model returns structured JSON describing a thought, next action, optional speech/target, memory changes and need/mood deltas. Player influence prompts go through a separate world-director request so a single typed intervention can ripple through multiple NPCs.

The local model never needs a cloud API key.
