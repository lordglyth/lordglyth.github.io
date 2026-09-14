(() => {
  const SOJI_UPSTREAM_URL = 'https://mars.chub.ai/soji/v1/chat/completions';
  const SOJI_MODEL = 'soji';
  const DEFAULT_PROXY = 'https://tiny-planet-soji-proxy-rpgmafia-3007.vercel.app';
  const mode = document.querySelector('#llmMode');
  const urlInput = document.querySelector('#llmUrl');
  const modelSelect = document.querySelector('#llmModel');
  const keyInput = document.querySelector('#llmApiKey');
  if (!mode || !urlInput || !modelSelect || !keyInput) return;

  if (![...mode.options].some(o => o.value === 'soji')) {
    const opt = document.createElement('option');
    opt.value = 'soji';
    opt.textContent = 'Soji API · use your own key';
    mode.appendChild(opt);
  }

  const note = document.createElement('div');
  note.id = 'sojiPublicNote';
  note.className = 'muted tiny soji-note';
  note.hidden = true;
  note.innerHTML = '🌐 Soji endpoint: <code>https://mars.chub.ai/soji/v1/chat/completions</code><br>Uses <b>your own Soji API key</b>. The public proxy adds <code>User-Agent: starlablood/1.0</code>. Your key is forwarded only for the request and is never committed to GitHub.';
  document.querySelector('#llmPanel')?.appendChild(note);

  function configuredProxy() {
    // Public GitHub Pages must always use the current production proxy. Ignore
    // old localStorage values left by earlier builds, which caused 503s.
    if (location.hostname === 'lordglyth.github.io') return DEFAULT_PROXY;
    const fromWindow = String(window.TINY_PLANET_SOJI_PROXY_URL || '').trim();
    const fromMeta = document.querySelector('meta[name="tiny-planet-soji-proxy"]')?.content?.trim() || '';
    const fromStorage = localStorage.getItem('tinyPlanetSojiProxyUrl') || '';
    return fromWindow || fromMeta || fromStorage || DEFAULT_PROXY;
  }

  function updateUi() {
    const soji = mode.value === 'soji';
    note.hidden = !soji;
    if (soji) {
      urlInput.value = SOJI_UPSTREAM_URL;
      urlInput.readOnly = true;
      urlInput.title = 'Exact Soji chat-completions endpoint';
      keyInput.placeholder = 'Paste your own Soji API key';
      modelSelect.innerHTML = '<option value="soji">soji</option>';
      modelSelect.value = SOJI_MODEL;
    } else {
      urlInput.readOnly = false;
      urlInput.title = '';
      if (!keyInput.value) keyInput.placeholder = 'Optional — leave blank for local Ollama';
    }
  }

  mode.addEventListener('change', updateUi);
  if (location.hostname === 'lordglyth.github.io') mode.value = 'soji';
  updateUi();

  const originalFetch = window.fetch.bind(window);

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  window.fetch = async function tinyPlanetSojiProvider(resource, options = {}) {
    const selected = mode.value === 'soji';
    const rawUrl = typeof resource === 'string' ? resource : resource?.url || '';
    if (!selected) return originalFetch(resource, options);

    // app.js still uses the Ollama-style /api/tags and /api/chat flow. Intercept
    // those locally and translate only the chat call to the Mars Soji endpoint.
    if (/\/api\/tags(?:\?|$)/.test(rawUrl)) {
      const key = keyInput.value.trim();
      if (!key) return jsonResponse({ error: 'Enter your own Soji API key first.' }, 401);
      return jsonResponse({ models: [{ name: SOJI_MODEL }] });
    }

    if (/\/api\/chat(?:\?|$)/.test(rawUrl)) {
      const key = keyInput.value.trim();
      if (!key) return jsonResponse({ error: 'Enter your own Soji API key first.' }, 401);

      let incoming = {};
      try { incoming = JSON.parse(options.body || '{}'); }
      catch { return jsonResponse({ error: 'Invalid AI request body.' }, 400); }

      const openAiBody = {
        model: SOJI_MODEL,
        messages: Array.isArray(incoming.messages) ? incoming.messages : [],
        stream: false,
        temperature: Number(incoming?.options?.temperature ?? 0.9),
        max_tokens: Number(incoming?.options?.num_predict ?? 450)
      };

      const target = configuredProxy().replace(/\/$/, '') + '/api/soji';
      let response;
      try {
        response = await originalFetch(target, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify(openAiBody),
          signal: options.signal
        });
      } catch (err) {
        return jsonResponse({ error: `Soji proxy network error: ${err?.message || err}` }, 502);
      }

      const text = await response.text();
      if (!response.ok) {
        return new Response(text || JSON.stringify({ error: `Soji proxy ${response.status}` }), {
          status: response.status,
          headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
        });
      }

      let data;
      try { data = JSON.parse(text); }
      catch { return jsonResponse({ error: 'Soji returned a non-JSON response.' }, 502); }

      const content = data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.response ?? '';
      return jsonResponse({ message: { content: String(content) } });
    }

    return originalFetch(resource, options);
  };

  window.TinyPlanetSojiPublic = {
    upstream: SOJI_UPSTREAM_URL,
    model: SOJI_MODEL,
    defaultProxy: DEFAULT_PROXY,
    getProxyUrl: configuredProxy,
    setProxyUrl(url) {
      const clean = String(url || '').trim().replace(/\/$/, '');
      if (clean) localStorage.setItem('tinyPlanetSojiProxyUrl', clean);
      else localStorage.removeItem('tinyPlanetSojiProxyUrl');
      return clean;
    }
  };
})();
