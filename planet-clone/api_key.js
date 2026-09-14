(() => {
  const KEY_SESSION = 'tinyPlanetApiKey';
  const KEY_LOCAL = 'tinyPlanetApiKeyRemembered';
  const REMEMBER = 'tinyPlanetApiKeyRemember';

  const input = document.querySelector('#llmApiKey');
  const remember = document.querySelector('#rememberApiKey');
  const reveal = document.querySelector('#showApiKey');
  if (!input) return;

  const savedLocal = localStorage.getItem(KEY_LOCAL) || '';
  const savedSession = sessionStorage.getItem(KEY_SESSION) || '';
  const shouldRemember = localStorage.getItem(REMEMBER) === '1';

  input.value = shouldRemember ? savedLocal : savedSession;
  if (remember) remember.checked = shouldRemember;

  function persist() {
    const key = input.value.trim();
    const keep = !!remember?.checked;
    sessionStorage.setItem(KEY_SESSION, key);
    localStorage.setItem(REMEMBER, keep ? '1' : '0');
    if (keep) localStorage.setItem(KEY_LOCAL, key);
    else localStorage.removeItem(KEY_LOCAL);
  }

  input.addEventListener('input', persist);
  remember?.addEventListener('change', persist);
  reveal?.addEventListener('change', () => {
    input.type = reveal.checked ? 'text' : 'password';
  });

  window.TinyPlanetAuth = {
    getApiKey: () => input.value.trim(),
    clear() {
      input.value = '';
      sessionStorage.removeItem(KEY_SESSION);
      localStorage.removeItem(KEY_LOCAL);
      localStorage.removeItem(REMEMBER);
      if (remember) remember.checked = false;
    }
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = function tinyPlanetAuthFetch(resource, options = {}) {
    try {
      const url = typeof resource === 'string' ? resource : resource?.url || '';
      const key = input.value.trim();
      const isAiRequest = /\/ollama\/|\/api\/(?:chat|generate|tags)(?:\?|$)/.test(url);
      if (key && isAiRequest) {
        const headers = new Headers(options.headers || (typeof resource !== 'string' ? resource?.headers : undefined) || {});
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${key}`);
        options = { ...options, headers };
      }
    } catch (err) {
      console.warn('[Tiny Planet Auth] Could not add API key:', err);
    }
    return originalFetch(resource, options);
  };
})();
