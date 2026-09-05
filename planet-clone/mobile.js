(() => {
  const mq = window.matchMedia('(max-width: 760px)');
  const dock = document.querySelector('#mobileDock');
  const shade = document.querySelector('#mobileShade');
  if (!dock || !shade) return;

  const panels = {
    paint: document.querySelector('#paintPanel'),
    npc: document.querySelector('#inspector'),
    god: document.querySelector('#godPanel'),
    ai: document.querySelector('#llmPanel'),
    view: document.querySelector('#viewPanel')
  };

  const buttons = [...dock.querySelectorAll('[data-mobile-panel]')];

  function addCloseButton(panel) {
    if (!panel || panel.querySelector('.mobile-close')) return;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mobile-close';
    close.setAttribute('aria-label', 'Close panel');
    close.textContent = '✕';
    close.addEventListener('click', closeAll);
    panel.appendChild(close);
  }

  Object.values(panels).forEach(addCloseButton);

  function closeAll() {
    Object.values(panels).forEach(p => p?.classList.remove('mobile-open'));
    buttons.forEach(b => b.classList.remove('active'));
    document.body.classList.remove('mobile-sheet-open');
  }

  function openPanel(key) {
    if (!mq.matches) return;
    const panel = panels[key];
    if (!panel) return;
    const wasOpen = panel.classList.contains('mobile-open');
    closeAll();
    if (wasOpen) return;
    panel.classList.add('mobile-open');
    document.body.classList.add('mobile-sheet-open');
    dock.querySelector(`[data-mobile-panel="${key}"]`)?.classList.add('active');
  }

  buttons.forEach(btn => btn.addEventListener('click', () => openPanel(btn.dataset.mobilePanel)));
  shade.addEventListener('click', closeAll);

  document.querySelectorAll('#viewPanel .view').forEach(btn => {
    btn.addEventListener('click', () => {
      if (mq.matches) setTimeout(closeAll, 70);
    });
  });

  document.querySelector('#addNpcBtn')?.addEventListener('click', () => {
    if (mq.matches) setTimeout(closeAll, 80);
  });

  document.querySelector('#influenceBtn')?.addEventListener('click', () => {
    if (mq.matches && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mq.matches) closeAll();
  });

  mq.addEventListener?.('change', () => {
    if (!mq.matches) closeAll();
  });

  window.TinyPlanetMobile = { openPanel, closeAll };
})();
