(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const originalCanvas = $('originalCanvas');
  const processedCanvas = $('processedCanvas');
  const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
  const processedCtx = processedCanvas.getContext('2d', { willReadFrequently: true });
  const fileInput = $('fileInput');
  const dropZone = $('dropZone');
  const dropHint = $('dropHint');
  const viewerGrid = $('viewerGrid');
  const controlsHost = $('controls');
  const presetSelect = $('presetSelect');

  const source = {
    image: null,
    name: '',
    width: 0,
    height: 0,
    previewScale: 1,
  };

  const controlSpec = [
    ['intensity', 'Dicyanin Intensity', 0, 100, 78],
    ['shadow', 'Shadow Revelation', 0, 100, 58],
    ['aura', 'Aura Strength', 0, 100, 52],
    ['auraRadius', 'Aura Radius', 0, 100, 46],
    ['auraLayers', 'Aura Layers', 1, 4, 3],
    ['separation', 'Spectral Separation', 0, 100, 24],
    ['bloom', 'Spectral Bloom', 0, 100, 46],
    ['haze', 'Spectral Haze', 0, 100, 30],
    ['indigo', 'Indigo Depth', 0, 100, 78],
    ['violet', 'Violet Strength', 0, 100, 70],
    ['cyan', 'Cyan Strength', 0, 100, 46],
    ['exposure', 'Exposure', -50, 50, 0],
    ['contrast', 'Contrast', -50, 50, 12],
    ['texture', 'Texture Detail', 0, 100, 36],
    ['vignette', 'Vignette', 0, 100, 18],
  ];

  const defaults = Object.fromEntries(controlSpec.map(([key, , , , value]) => [key, value]));
  const settings = { ...defaults, subjectAura: true, showGoggles: false };

  const presets = {
    historical: { intensity: 78, shadow: 44, aura: 15, auraRadius: 34, auraLayers: 2, separation: 8, bloom: 16, haze: 12, indigo: 94, violet: 55, cyan: 20, exposure: -12, contrast: 18, texture: 22, vignette: 34 },
    spectral: { intensity: 78, shadow: 58, aura: 52, auraRadius: 46, auraLayers: 3, separation: 24, bloom: 46, haze: 30, indigo: 78, violet: 70, cyan: 46, exposure: 0, contrast: 12, texture: 36, vignette: 18 },
    extreme: { intensity: 96, shadow: 84, aura: 88, auraRadius: 64, auraLayers: 4, separation: 58, bloom: 78, haze: 56, indigo: 82, violet: 92, cyan: 76, exposure: 5, contrast: 22, texture: 62, vignette: 24 },
    darkroom: { intensity: 92, shadow: 34, aura: 38, auraRadius: 48, auraLayers: 3, separation: 15, bloom: 28, haze: 10, indigo: 100, violet: 48, cyan: 18, exposure: -32, contrast: 32, texture: 26, vignette: 52 },
    aura: { intensity: 58, shadow: 55, aura: 92, auraRadius: 70, auraLayers: 4, separation: 35, bloom: 34, haze: 32, indigo: 58, violet: 84, cyan: 72, exposure: -5, contrast: 8, texture: 34, vignette: 18 },
  };

  let renderTimer = 0;
  let isRendering = false;
  let pendingRender = false;
  let toastTimer = 0;
  let cameraStream = null;
  let cameraLoop = 0;
  let recorder = null;
  let recordedChunks = [];
  let cameraLastFpsTime = 0;
  let cameraFrames = 0;

  function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) {
    const t = clamp((x - a) / Math.max(1e-6, b - a));
    return t * t * (3 - 2 * t);
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function buildControls() {
    controlsHost.innerHTML = '';
    for (const [key, label, min, max, value] of controlSpec) {
      const wrap = document.createElement('div');
      wrap.className = 'control';
      wrap.innerHTML = `
        <div class="control-head"><span>${label}</span><span class="control-value" id="value-${key}">${value}</span></div>
        <input id="control-${key}" type="range" min="${min}" max="${max}" step="1" value="${value}" aria-label="${label}">
      `;
      controlsHost.appendChild(wrap);
      const input = wrap.querySelector('input');
      input.addEventListener('input', () => {
        settings[key] = Number(input.value);
        $(`value-${key}`).textContent = input.value;
        scheduleRender();
      });
    }
  }

  function syncControls() {
    for (const [key] of controlSpec) {
      const el = $(`control-${key}`);
      if (!el) continue;
      el.value = settings[key];
      $(`value-${key}`).textContent = settings[key];
    }
    $('subjectAura').checked = settings.subjectAura;
    $('showGoggles').checked = settings.showGoggles;
  }

  function applyPreset(name) {
    Object.assign(settings, presets[name] || presets.spectral);
    syncControls();
    scheduleRender(true);
  }

  async function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('Choose an image file.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      source.image = bitmap;
      source.name = file.name;
      source.width = bitmap.width;
      source.height = bitmap.height;
      source.previewScale = Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
      renderOriginalPreview();
      dropHint.hidden = true;
      viewerGrid.hidden = false;
      $('sourceInfo').textContent = `${bitmap.width} × ${bitmap.height}`;
      await renderPreview(true);
    } catch (error) {
      console.error(error);
      toast('This browser could not decode that image.');
    }
  }

  function renderOriginalPreview() {
    const w = Math.max(1, Math.round(source.width * source.previewScale));
    const h = Math.max(1, Math.round(source.height * source.previewScale));
    originalCanvas.width = w;
    originalCanvas.height = h;
    originalCtx.clearRect(0, 0, w, h);
    originalCtx.drawImage(source.image, 0, 0, w, h);
  }

  function scheduleRender(immediate = false) {
    if (!source.image) return;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderPreview(), immediate ? 0 : 60);
  }

  async function renderPreview(force = false) {
    if (!source.image) return;
    if (isRendering && !force) {
      pendingRender = true;
      return;
    }
    isRendering = true;
    const start = performance.now();
    try {
      const w = originalCanvas.width;
      const h = originalCanvas.height;
      const input = originalCtx.getImageData(0, 0, w, h);
      const output = processImageData(input, w, h, settings);
      processedCanvas.width = w;
      processedCanvas.height = h;
      processedCtx.putImageData(output, 0, 0);
      if (settings.showGoggles) applyGoggles(processedCanvas);
      const ms = Math.round(performance.now() - start);
      $('renderInfo').textContent = `${ms} ms preview`;
    } catch (error) {
      console.error(error);
      toast('Render failed. Try a smaller image or reset the controls.');
    } finally {
      isRendering = false;
      if (pendingRender) {
        pendingRender = false;
        scheduleRender(true);
      }
    }
  }

  function luminanceFromImageData(imageData, count) {
    const lum = new Float32Array(count);
    const d = imageData.data;
    for (let i = 0, p = 0; i < count; i++, p += 4) {
      lum[i] = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255;
    }
    return lum;
  }

  function blurGray(src, w, h, radius) {
    radius = Math.max(1, Math.min(80, Math.round(radius)));
    if (radius <= 1) return new Float32Array(src);
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const window = radius * 2 + 1;

    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;
      for (let x = -radius; x <= radius; x++) sum += src[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / window;
        sum -= src[row + clamp(x - radius, 0, w - 1)];
        sum += src[row + clamp(x + radius + 1, 0, w - 1)];
      }
    }

    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += tmp[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / window;
        sum -= tmp[clamp(y - radius, 0, h - 1) * w + x];
        sum += tmp[clamp(y + radius + 1, 0, h - 1) * w + x];
      }
    }
    return out;
  }

  function sobelEdges(lum, w, h) {
    const edge = new Float32Array(lum.length);
    let maxEdge = 1e-6;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const a = lum[i - w - 1], b = lum[i - w], c = lum[i - w + 1];
        const d = lum[i - 1], f = lum[i + 1];
        const g = lum[i + w - 1], hh = lum[i + w], j = lum[i + w + 1];
        const gx = -a + c - 2 * d + 2 * f - g + j;
        const gy = -a - 2 * b - c + g + 2 * hh + j;
        const m = Math.sqrt(gx * gx + gy * gy);
        edge[i] = m;
        if (m > maxEdge) maxEdge = m;
      }
    }
    const scale = 1 / Math.max(0.35, maxEdge * 0.72);
    for (let i = 0; i < edge.length; i++) edge[i] = clamp(edge[i] * scale);
    return edge;
  }

  function paletteColor(l, settings) {
    const intensity = settings.intensity / 100;
    const indigo = settings.indigo / 100;
    const violet = settings.violet / 100;
    const cyan = settings.cyan / 100;
    const stops = [
      [0.00, [2, 3, 13]],
      [0.13, [8 + 12 * indigo, 8, 28 + 48 * indigo]],
      [0.34, [23 + 23 * violet, 14, 68 + 72 * violet]],
      [0.57, [69 + 45 * violet, 45 + 20 * cyan, 128 + 65 * violet]],
      [0.78, [88 + 45 * cyan, 98 + 70 * cyan, 174 + 55 * violet]],
      [1.00, [208 + 35 * cyan, 220 + 25 * cyan, 255]],
    ];
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (l >= stops[i][0] && l <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = smoothstep(a[0], b[0], l);
    return [
      lerp(a[1][0], b[1][0], t) * intensity,
      lerp(a[1][1], b[1][1], t) * intensity,
      lerp(a[1][2], b[1][2], t) * intensity,
    ];
  }

  function processImageData(imageData, w, h, s) {
    const count = w * h;
    const src = imageData.data;
    const lum = luminanceFromImageData(imageData, count);
    const localRadius = Math.max(2, Math.round(Math.min(w, h) / 180));
    const localAvg = blurGray(lum, w, h, localRadius);
    const edges = sobelEdges(lum, w, h);

    const edgeSignificant = new Float32Array(count);
    const saliency = new Float32Array(count);
    for (let y = 0; y < h; y++) {
      const ny = (y / Math.max(1, h - 1)) * 2 - 1;
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const nx = (x / Math.max(1, w - 1)) * 2 - 1;
        const center = Math.exp(-(nx * nx + ny * ny) * 1.35);
        const detail = Math.abs(lum[i] - localAvg[i]);
        const meaningful = smoothstep(0.08, 0.34, edges[i]) * (0.55 + detail * 3.0);
        saliency[i] = clamp(center * 0.6 + meaningful * 0.7);
        edgeSignificant[i] = clamp(meaningful * (s.subjectAura ? (0.85 + saliency[i] * 0.65) : 1));
      }
    }

    const auraRadiusPx = Math.max(1, (s.auraRadius / 100) * Math.min(w, h) * 0.025);
    const auraFields = [];
    const layers = Math.round(s.auraLayers);
    const radii = [Math.max(1, auraRadiusPx * 0.28), Math.max(2, auraRadiusPx * 0.72), Math.max(3, auraRadiusPx * 1.5), Math.max(4, auraRadiusPx * 2.4)];
    for (let i = 0; i < layers; i++) auraFields.push(blurGray(edgeSignificant, w, h, radii[i]));

    const highlight = new Float32Array(count);
    const lowContrast = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      highlight[i] = smoothstep(0.68, 0.98, lum[i]);
      const detail = Math.abs(lum[i] - localAvg[i]);
      lowContrast[i] = clamp((1 - smoothstep(0.01, 0.12, detail)) * (0.3 + 0.7 * smoothstep(0.08, 0.8, lum[i])));
    }
    const bloom1 = blurGray(highlight, w, h, Math.max(2, Math.min(w, h) * 0.005));
    const bloom2 = blurGray(highlight, w, h, Math.max(3, Math.min(w, h) * 0.016));
    const hazeField = blurGray(lowContrast, w, h, Math.max(3, Math.min(w, h) * 0.012));

    const out = new ImageData(w, h);
    const dst = out.data;
    const auraStrength = s.aura / 100;
    const bloomStrength = s.bloom / 100;
    const hazeStrength = s.haze / 100;
    const shadowStrength = s.shadow / 100;
    const textureStrength = s.texture / 100;
    const sepStrength = s.separation / 100;
    const exposureMul = Math.pow(2, s.exposure / 50);
    const contrast = 1 + s.contrast / 50;
    const intensity = s.intensity / 100;
    const sepPx = Math.max(1, Math.round(sepStrength * Math.min(7, Math.min(w, h) / 90)));

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const p = i * 4;
        let l = lum[i];
        const localDetail = l - localAvg[i];
        const shadowMask = 1 - smoothstep(0.10, 0.52, l);
        const recovered = localDetail * shadowMask * shadowStrength * 2.2;
        const mappedL = clamp(l + recovered + shadowMask * shadowStrength * 0.045);
        const spectral = paletteColor(mappedL, s);

        const srcR = src[p], srcG = src[p + 1], srcB = src[p + 2];
        const srcGray = (srcR + srcG + srcB) / 3;
        const chromaR = srcR - srcGray, chromaG = srcG - srcGray, chromaB = srcB - srcGray;
        const preserveChroma = 0.10 * (1 - intensity * 0.55);

        let r = spectral[0] + chromaR * preserveChroma;
        let g = spectral[1] + chromaG * preserveChroma;
        let b = spectral[2] + chromaB * preserveChroma;

        const tex = localDetail * textureStrength * (0.45 + edges[i] * 0.8) * 150;
        r += tex * 0.45;
        g += tex * 0.62;
        b += tex * 1.05;

        if (layers > 0) {
          const f0 = auraFields[0][i] * auraStrength;
          r += f0 * 155 * (s.violet / 100);
          g += f0 * 55;
          b += f0 * 255;
        }
        if (layers > 1) {
          const f1 = auraFields[1][i] * auraStrength;
          r += f1 * 65;
          g += f1 * 175 * (s.cyan / 100);
          b += f1 * 220;
        }
        if (layers > 2) {
          const f2 = auraFields[2][i] * auraStrength;
          r += f2 * 75 * (s.violet / 100);
          g += f2 * 40;
          b += f2 * 145;
        }
        if (layers > 3) {
          const f3 = auraFields[3][i] * auraStrength;
          r += f3 * 25;
          g += f3 * 70 * (s.cyan / 100);
          b += f3 * 105;
        }

        const bloom = (bloom1[i] * 0.75 + bloom2[i] * 0.45) * bloomStrength;
        r += bloom * 130;
        g += bloom * 160;
        b += bloom * 245;

        const haze = hazeField[i] * hazeStrength * (0.55 + shadowMask * 0.45);
        r += haze * 22;
        g += haze * 34;
        b += haze * 88;

        if (sepStrength > 0.01) {
          const left = y * w + clamp(x - sepPx, 0, w - 1);
          const right = y * w + clamp(x + sepPx, 0, w - 1);
          const eL = edgeSignificant[left];
          const eR = edgeSignificant[right];
          r += eL * sepStrength * 95;
          g += eR * sepStrength * 75;
          b += (eL + eR) * sepStrength * 85;
        }

        r *= exposureMul; g *= exposureMul; b *= exposureMul;
        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

        const vig = s.vignette / 100;
        if (vig > 0) {
          const nx = (x / Math.max(1, w - 1)) * 2 - 1;
          const ny = (y / Math.max(1, h - 1)) * 2 - 1;
          const dist = clamp((nx * nx + ny * ny) * 0.5);
          const v = 1 - smoothstep(0.25, 1, dist) * vig * 0.72;
          r *= v; g *= v; b *= v;
        }

        dst[p] = clamp(r, 0, 255);
        dst[p + 1] = clamp(g, 0, 255);
        dst[p + 2] = clamp(b, 0, 255);
        dst[p + 3] = src[p + 3];
      }
    }
    return out;
  }

  function applyGoggles(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const snap = document.createElement('canvas');
    snap.width = w; snap.height = h;
    snap.getContext('2d').drawImage(canvas, 0, 0);
    const r = Math.min(w * 0.245, h * 0.44);
    const gap = Math.max(6, r * 0.08);
    const centers = [[w / 2 - r - gap / 2, h / 2], [w / 2 + r + gap / 2, h / 2]];

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    centers.forEach(([cx, cy], idx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const scale = 1.018;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(snap, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const grad = ctx.createRadialGradient(cx - r * .2, cy - r * .25, r * .12, cx, cy, r);
      grad.addColorStop(0, 'rgba(86,54,180,.05)');
      grad.addColorStop(.72, 'rgba(25,12,88,.12)');
      grad.addColorStop(1, 'rgba(0,0,18,.48)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const shine = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      shine.addColorStop(.22, 'rgba(255,255,255,.10)');
      shine.addColorStop(.31, 'rgba(255,255,255,0)');
      shine.addColorStop(.68, 'rgba(118,199,255,.06)');
      ctx.fillStyle = shine;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(3, r * .045);
      ctx.strokeStyle = 'rgba(12,8,22,.92)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * .965, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, r * .01);
      ctx.strokeStyle = 'rgba(126,101,205,.42)';
      ctx.stroke();
      for (let n = 0; n < 5; n++) {
        const angle = (n * 2.13 + idx) % (Math.PI * 2);
        const rr = r * (0.25 + ((n * 37) % 55) / 100);
        const dx = cx + Math.cos(angle) * rr;
        const dy = cy + Math.sin(angle) * rr;
        ctx.fillStyle = `rgba(255,255,255,${0.018 + n * 0.004})`;
        ctx.fillRect(dx, dy, Math.max(1, r * .006), Math.max(1, r * .006));
      }
      ctx.restore();
    });
  }

  async function renderFullResolution(includeGoggles = settings.showGoggles) {
    if (!source.image) throw new Error('No source image');
    const work = document.createElement('canvas');
    work.width = source.width;
    work.height = source.height;
    const ctx = work.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source.image, 0, 0);
    const input = ctx.getImageData(0, 0, work.width, work.height);
    const output = processImageData(input, work.width, work.height, settings);
    ctx.putImageData(output, 0, 0);
    if (includeGoggles) applyGoggles(work);
    return work;
  }

  function canvasBlob(canvas, type = 'image/png', quality = .95) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode image')), type, quality));
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function outputBaseName() {
    return (source.name || 'image').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '_');
  }

  async function saveImage() {
    if (!source.image) return toast('Load an image first.');
    toast('Rendering full resolution…');
    try {
      const canvas = await renderFullResolution();
      const blob = await canvasBlob(canvas, 'image/png');
      downloadBlob(blob, `${outputBaseName()}_dicyanin.png`);
      toast('Saved full-resolution PNG.');
    } catch (error) {
      console.error(error);
      toast('Could not export the full-resolution image.');
    }
  }

  async function exportComparison() {
    if (!source.image) return toast('Load an image first.');
    toast('Rendering comparison…');
    try {
      const processed = await renderFullResolution();
      const gap = Math.max(4, Math.round(source.width * .008));
      const labelH = Math.max(38, Math.round(source.height * .055));
      const out = document.createElement('canvas');
      out.width = source.width * 2 + gap;
      out.height = source.height + labelH;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#080611';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(source.image, 0, labelH, source.width, source.height);
      ctx.drawImage(processed, source.width + gap, labelH);
      ctx.fillStyle = '#f2efff';
      ctx.font = `600 ${Math.max(16, Math.round(labelH * .42))}px system-ui,sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText('ORIGINAL', 12, labelH / 2);
      ctx.fillText('DICYANIN VISION', source.width + gap + 12, labelH / 2);
      const blob = await canvasBlob(out, 'image/png');
      downloadBlob(blob, `${outputBaseName()}_comparison.png`);
      toast('Saved comparison PNG.');
    } catch (error) {
      console.error(error);
      toast('Could not export comparison.');
    }
  }

  async function copyImage() {
    if (!source.image) return toast('Load an image first.');
    if (!navigator.clipboard || !window.ClipboardItem) return toast('Image clipboard is not supported in this browser.');
    try {
      const canvas = await renderFullResolution();
      const blob = await canvasBlob(canvas, 'image/png');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Copied image to clipboard.');
    } catch (error) {
      console.error(error);
      toast('Clipboard permission was denied or unavailable.');
    }
  }

  function openCompare() {
    if (!source.image) return toast('Load an image first.');
    const overlay = $('compareOverlay');
    const po = $('compareProcessed');
    const oo = $('compareOriginal');
    po.width = processedCanvas.width; po.height = processedCanvas.height;
    oo.width = originalCanvas.width; oo.height = originalCanvas.height;
    po.getContext('2d').drawImage(processedCanvas, 0, 0);
    oo.getContext('2d').drawImage(originalCanvas, 0, 0);
    overlay.hidden = false;
    setComparePosition(Number($('compareRange').value));
  }

  function setComparePosition(value) {
    $('compareOriginalClip').style.width = `${value}%`;
    $('compareDivider').style.left = `${value}%`;
  }

  function randomize() {
    for (const [key, , min, max] of controlSpec) {
      if (key === 'auraLayers') settings[key] = 1 + Math.floor(Math.random() * 4);
      else settings[key] = Math.round(min + Math.random() * (max - min));
    }
    syncControls();
    scheduleRender(true);
  }

  async function fullscreenProcessed() {
    if (!source.image) return toast('Load an image first.');
    const el = processedCanvas.parentElement;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el.requestFullscreen) await el.requestFullscreen();
  }

  async function enumerateCameras() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const select = $('cameraSelect');
    const previous = select.value;
    select.innerHTML = '<option value="">Default camera</option>';
    devices.filter(d => d.kind === 'videoinput').forEach((d, i) => {
      const option = document.createElement('option');
      option.value = d.deviceId;
      option.textContent = d.label || `Camera ${i + 1}`;
      select.appendChild(option);
    });
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
  }

  async function startCamera() {
    try {
      stopCamera();
      const [width, height] = $('cameraResolution').value.split('x').map(Number);
      const deviceId = $('cameraSelect').value;
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
        audio: false,
      });
      const video = $('cameraVideo');
      video.srcObject = cameraStream;
      await video.play();
      await enumerateCameras();
      cameraLastFpsTime = performance.now();
      cameraFrames = 0;
      cameraLoop = requestAnimationFrame(renderCameraFrame);
      toast('Camera started.');
    } catch (error) {
      console.error(error);
      toast('Camera access failed. Use HTTPS or localhost and allow camera permission.');
    }
  }

  function stopCamera() {
    if (cameraLoop) cancelAnimationFrame(cameraLoop);
    cameraLoop = 0;
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $('cameraVideo').srcObject = null;
    $('fpsCounter').textContent = '0 FPS';
  }

  function renderCameraFrame(now) {
    const video = $('cameraVideo');
    const canvas = $('cameraCanvas');
    if (!cameraStream || video.readyState < 2) {
      cameraLoop = requestAnimationFrame(renderCameraFrame);
      return;
    }
    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    if ($('cameraEffect').checked) {
      const input = ctx.getImageData(0, 0, w, h);
      const fastSettings = { ...settings, auraLayers: Math.min(2, settings.auraLayers), auraRadius: Math.min(48, settings.auraRadius) };
      ctx.putImageData(processImageData(input, w, h, fastSettings), 0, 0);
      if (settings.showGoggles) applyGoggles(canvas);
    }
    cameraFrames++;
    if (now - cameraLastFpsTime >= 1000) {
      const fps = Math.round(cameraFrames * 1000 / (now - cameraLastFpsTime));
      $('fpsCounter').textContent = `${fps} FPS`;
      cameraFrames = 0;
      cameraLastFpsTime = now;
    }
    cameraLoop = requestAnimationFrame(renderCameraFrame);
  }

  async function cameraScreenshot() {
    const canvas = $('cameraCanvas');
    if (!canvas.width) return toast('Start the camera first.');
    const blob = await canvasBlob(canvas, 'image/png');
    downloadBlob(blob, `dicyanin_camera_${Date.now()}.png`);
  }

  function toggleRecording() {
    const canvas = $('cameraCanvas');
    const button = $('recordCameraBtn');
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      button.textContent = 'Record';
      return;
    }
    if (!canvas.captureStream || !window.MediaRecorder) return toast('Canvas recording is not supported in this browser.');
    recordedChunks = [];
    const stream = canvas.captureStream(30);
    const preferred = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    recorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: recorder.mimeType || 'video/webm' });
      downloadBlob(blob, `dicyanin_camera_${Date.now()}.webm`);
      recordedChunks = [];
    };
    recorder.start();
    button.textContent = 'Stop Recording';
  }

  function runSyntheticSelfTest() {
    try {
      const w = 64, h = 64;
      const test = new ImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = (y * w + x) * 4;
          const checker = ((x >> 3) + (y >> 3)) % 2 ? 42 : 210;
          test.data[p] = checker;
          test.data[p + 1] = Math.round((x / (w - 1)) * 255);
          test.data[p + 2] = Math.round((y / (h - 1)) * 255);
          test.data[p + 3] = 255;
        }
      }
      const result = processImageData(test, w, h, settings);
      if (!(result instanceof ImageData) || result.data.length !== test.data.length) throw new Error('Unexpected output');
      console.info('Dicyanin Vision synthetic pipeline self-test passed.');
    } catch (error) {
      console.error('Dicyanin Vision self-test failed:', error);
    }
  }

  buildControls();
  syncControls();

  fileInput.addEventListener('change', e => loadFile(e.target.files?.[0]));
  ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, e => { e.preventDefault(); dropZone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, e => { e.preventDefault(); dropZone.classList.remove('dragging'); }));
  dropZone.addEventListener('drop', e => loadFile(e.dataTransfer?.files?.[0]));
  presetSelect.addEventListener('change', () => applyPreset(presetSelect.value));
  $('resetBtn').addEventListener('click', () => { Object.assign(settings, presets.spectral); presetSelect.value = 'spectral'; syncControls(); scheduleRender(true); });
  $('randomBtn').addEventListener('click', randomize);
  $('saveBtn').addEventListener('click', saveImage);
  $('exportCompareBtn').addEventListener('click', exportComparison);
  $('copyBtn').addEventListener('click', copyImage);
  $('compareBtn').addEventListener('click', openCompare);
  $('closeCompareBtn').addEventListener('click', () => { $('compareOverlay').hidden = true; });
  $('compareRange').addEventListener('input', e => setComparePosition(Number(e.target.value)));
  $('fullBtn').addEventListener('click', fullscreenProcessed);
  $('subjectAura').addEventListener('change', e => { settings.subjectAura = e.target.checked; scheduleRender(); });
  $('showGoggles').addEventListener('change', e => { settings.showGoggles = e.target.checked; scheduleRender(true); });
  $('cameraBtn').addEventListener('click', async () => { $('cameraDialog').showModal(); await enumerateCameras(); });
  $('cameraDialog').addEventListener('close', stopCamera);
  $('startCameraBtn').addEventListener('click', startCamera);
  $('stopCameraBtn').addEventListener('click', stopCamera);
  $('snapCameraBtn').addEventListener('click', cameraScreenshot);
  $('recordCameraBtn').addEventListener('click', toggleRecording);
  $('cameraSelect').addEventListener('change', () => { if (cameraStream) startCamera(); });
  $('cameraResolution').addEventListener('change', () => { if (cameraStream) startCamera(); });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('compareOverlay').hidden) $('compareOverlay').hidden = true;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); fileInput.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveImage(); }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(err => console.warn('Service worker registration failed:', err)));
  }

  runSyntheticSelfTest();
})();
