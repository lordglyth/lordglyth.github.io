(() => {
  const originalFetch = window.fetch.bind(window);
  const fallbackProfile = {
    name: 'Soji Core',
    temperature: 0.84,
    systemPrompt: '[SOJI CORE] You are Soji, the local simulation intelligence. Preserve NPC autonomy, continuity, memory, relationships and strict player agency. NPCs are not yes-men. Never invent the player\'s thoughts, feelings, dialogue, choices or actions. Return valid JSON only when JSON is requested.'
  };

  const state = { profile: fallbackProfile, loaded: false };
  window.SOJI_CORE = state;

  originalFetch('soji_profile.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('profile unavailable')))
    .then(profile => { state.profile = profile; state.loaded = true; })
    .catch(() => { state.loaded = true; });

  function sojiText() {
    const p = state.profile || fallbackProfile;
    const parts = [p.systemPrompt, p.worldPrompt].filter(Boolean);
    return parts.join('\n\n');
  }

  function hasSoji(text) {
    return typeof text === 'string' && text.includes('[SOJI CORE]');
  }

  function inject(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const system = sojiText();

    if (Array.isArray(payload.messages)) {
      const already = payload.messages.some(m => m?.role === 'system' && hasSoji(m.content));
      if (!already) payload.messages.unshift({ role: 'system', content: system });
    } else {
      const existing = typeof payload.system === 'string' ? payload.system : '';
      if (!hasSoji(existing)) payload.system = existing ? `${system}\n\n${existing}` : system;
    }

    payload.options = payload.options && typeof payload.options === 'object' ? payload.options : {};
    if (payload.options.temperature == null) payload.options.temperature = Number(state.profile?.temperature ?? 0.84);
    return payload;
  }

  window.fetch = function sojiFetch(input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
      const isOllamaGeneration = /\/api\/(chat|generate)(?:\?|$)/.test(url);
      if (method === 'POST' && isOllamaGeneration && typeof init.body === 'string') {
        const payload = inject(JSON.parse(init.body));
        init = { ...init, body: JSON.stringify(payload) };
      }
    } catch (err) {
      console.warn('[Soji Core] Request injection skipped:', err);
    }
    return originalFetch(input, init);
  };
})();
