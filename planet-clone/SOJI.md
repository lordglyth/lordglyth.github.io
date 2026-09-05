# Soji Core in Tiny Planet

Tiny Planet now carries a local-first Soji profile instead of treating Ollama as a generic text box.

## What is injected

`soji_profile.json` contains the simulation rules used for NPC/world LLM calls:

- persistent character identity and canon
- autonomous NPC motives and non-yes-men behavior
- short/long memory continuity
- persistent relationships and consequences
- limited NPC knowledge rather than omniscience
- strict player agency: Soji does not invent the player's thoughts, feelings, dialogue, choices or actions
- immersive English behavior with a default temperature of `0.84`
- world intervention is treated as an event NPCs interpret, not an automatic command they must obey

The profile uses the Soji Worlds wrapper convention (`format: sojiworld`, `version: 1`) and keeps behavioral material in `systemPrompt` / `worldPrompt`.

## Local Ollama path

The recommended path is:

`browser -> local_server.py -> Ollama`

`local_server.py` loads `.env`, loads `soji_profile.json`, and injects Soji Core into `/api/chat` and `/api/generate` requests before forwarding them to Ollama. It also exposes `/soji/status` for quick local inspection.

`soji_client.js` performs the same marked injection in the browser, so Direct Ollama mode also receives the Soji Core prompt. Both injectors check for `[SOJI CORE]` to avoid duplicating the prompt.

## Environment

Copy `.env.example` to `.env` for local overrides. `.env` is ignored by git.

Useful keys:

- `OLLAMA_URL=http://127.0.0.1:11434`
- `SOJI_ENABLED=true`
- `SOJI_PROFILE=soji_profile.json`
- `SOJI_TEMPERATURE=0.84`
- `SOJI_USER_AGENT=starlablood/1.0`
- `OLLAMA_BEARER_TOKEN=` (optional for compatible endpoints that need it)

This project does not embed private account secrets in the repository.
