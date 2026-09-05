# Tiny Planet Painter

A from-scratch browser recreation inspired by Oskar Stålberg's **Polygonal Planet Project**. This project does **not** copy the original game's code or art assets; it recreates the core idea with procedural geometry and original WebGL code.

## Play

Because this lives inside the `lordglyth.github.io` repository, the GitHub Pages URL is expected to be:

`https://lordglyth.github.io/planet-clone/`

## Controls

- **Click/tap a triangular tile** to apply the selected tool.
- **Drag** the planet to rotate it.
- **Mouse wheel / pinch** to zoom.
- ⛰️ raises land.
- 💧 makes/lower water.
- 🌲 paints forest and grows tiny procedural trees.
- 🏘️ paints a settlement and adds tiny procedural buildings.
- ❄️ paints snow/ice.
- ⬇️ lowers terrain.
- 🎲 generates a fresh procedural planet.
- 💾 saves the current planet to local browser storage.
- ↩️ restores the local save.

## Tech

- Plain HTML/CSS/JavaScript
- Three.js loaded as an ES module from jsDelivr
- Icosahedron-based triangular world mesh
- Per-face terrain state and deformation
- Procedural cities, trees, stars, atmosphere and terrain colors
- No build step

## Attribution

Concept inspiration: Oskar Stålberg's Polygonal Planet Project, originally described as a study in tilesets.

The implementation in this folder is original and intended as an independent clone/learning project.
