(() => {
  const STORAGE_KEY = 'haoyu-theme-mode';
  const MODES = ['auto', 'light', 'dark'];
  const LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  const ICONS = { auto: '◐', light: '☼', dark: '☾' };
  const THEME_COLOR = { light: '#f4f8ff', dark: '#050816' };

  function safeGetMode() {
    try {
      return localStorage.getItem(STORAGE_KEY) || document.documentElement.dataset.themeMode || 'auto';
    } catch {
      return document.documentElement.dataset.themeMode || 'auto';
    }
  }

  function resolveEffective(mode = safeGetMode()) {
    if (mode !== 'auto') return mode;
    const hour = new Date().getHours();
    return hour >= 7 && hour < 18 ? 'light' : 'dark';
  }

  function updateThemeMeta(effective) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[effective] || THEME_COLOR.dark);
  }

  function updateButtons(mode, effective) {
    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach((button) => {
      const icon = button.querySelector('[data-theme-icon]');
      const label = button.querySelector('[data-theme-label]');
      if (icon) icon.textContent = ICONS[mode] || ICONS.auto;
      if (label) label.textContent = LABELS[mode] || LABELS.auto;
      const suffix = mode === 'auto' ? ` · ${effective === 'light' ? 'Day' : 'Night'}` : '';
      button.setAttribute('aria-label', `Theme: ${LABELS[mode] || 'Auto'}${suffix}`);
      button.title = mode === 'auto'
        ? `Theme follows local time (currently ${effective}). Click to switch.`
        : `Theme fixed to ${effective}. Click to switch.`;
    });
  }

  function applyMode(mode = safeGetMode(), { persist = false, emit = true } = {}) {
    const effective = resolveEffective(mode);
    const root = document.documentElement;
    root.dataset.themeMode = mode;
    root.dataset.theme = effective;
    root.style.colorScheme = effective;

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {}
    }

    updateThemeMeta(effective);
    updateButtons(mode, effective);

    if (emit) {
      window.dispatchEvent(
        new CustomEvent('themechange', {
          detail: { mode, effective }
        })
      );
    }
  }

  function cycleMode() {
    const current = safeGetMode();
    const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    applyMode(next, { persist: true, emit: true });
  }

  function refreshAutoMode() {
    const mode = safeGetMode();
    if (mode === 'auto') applyMode('auto', { persist: false, emit: true });
    else applyMode(mode, { persist: false, emit: false });
  }

  function bindButtons() {
    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach((button) => {
      if (button.dataset.boundThemeToggle === 'true') return;
      button.dataset.boundThemeToggle = 'true';
      button.addEventListener('click', cycleMode);
    });
  }

  function init() {
    bindButtons();
    applyMode(safeGetMode(), { persist: false, emit: true });
  }

  window.HaoyuTheme = {
    getMode: safeGetMode,
    resolve: resolveEffective,
    setMode(mode) {
      if (!MODES.includes(mode)) return;
      applyMode(mode, { persist: true, emit: true });
    },
    refresh: refreshAutoMode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshAutoMode();
  });
  window.addEventListener('focus', refreshAutoMode);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyMode(safeGetMode(), { persist: false, emit: true });
  });
})();
