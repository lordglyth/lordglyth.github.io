# Dicyanin Vision

Dicyanin Vision is a browser-local, deterministic image-processing app that simulates a dramatic indigo/violet/cyan “dicyanin goggle” aesthetic. It is an artistic spectral visualization, not a scientific model of human vision.

## Features

- Drag-and-drop local images: PNG, JPG/JPEG, WEBP, BMP
- Side-by-side Original / Dicyanin View
- Luminance-dependent spectral color mapping rather than a flat tint
- Shadow revelation with local-detail recovery
- Sobel edge analysis and multi-layer violet/cyan aura fields
- Highlight bloom, spectral haze, chromatic edge separation, and texture reaction
- Historical, Spectral, Extreme Spectral, Darkroom, and Aura View presets
- Optional subject-saliency aura boost and simulated two-lens goggle overlay
- Full-resolution export, comparison export, clipboard copy, fullscreen compare slider
- Optional live camera mode with screenshot and canvas recording
- No API keys, cloud processing, telemetry, accounts, or image uploads
- Service worker caches the application for offline reuse after the first successful load

## Run locally

Because camera access and service workers require a secure context, use localhost instead of opening the HTML file directly:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/dicyanin-vision/` if serving from the repository root, or `http://localhost:8080/` if serving from this directory.

Static image processing still works in most modern browsers when `index.html` is opened directly, but camera/PWA features may be restricted.

## Processing pipeline

1. Decode and draw source image
2. Compute luminance
3. Compute local luminance average and high-frequency detail
4. Compute shadow/highlight masks
5. Compute Sobel edge map
6. Apply luminance-dependent indigo/violet/cyan tone mapping
7. Recover shadow micro-detail
8. Generate multi-radius aura fields from significant edges
9. Add highlight bloom
10. Add subtle edge-based chromatic displacement
11. React to fine texture using local high-frequency detail
12. Add low-contrast spectral haze
13. Apply exposure and contrast
14. Optionally render simulated goggle lenses

## Privacy

Image pixels remain in the browser. There are no network calls in the image-processing pipeline. The only network activity during normal hosted use is loading the static application files themselves.
