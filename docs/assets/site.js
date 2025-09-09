(() => {
  let themeToggleEl;

  function buildNav(opts) {
    const nav = document.createElement('nav');
    nav.className = 'site-nav';

    const home = document.createElement('a');
    home.href = opts.docsRoot || './';
    home.textContent = 'Examples Home';
    nav.appendChild(home);

    const repo = document.createElement('a');
    repo.href = 'https://github.com/EvotecIT/HTMLExtensions';
    repo.target = '_blank';
    repo.rel = 'noopener';
    repo.textContent = 'GitHub Repo ↗';
    nav.appendChild(repo);

    if (opts.readme) {
      const readme = document.createElement('a');
      readme.href = opts.readme;
      readme.target = '_blank';
      readme.rel = 'noopener';
      readme.textContent = 'Project README ↗';
      nav.appendChild(readme);
    }

    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    nav.appendChild(spacer);

    // Theme toggle button
    themeToggleEl = document.createElement('button');
    themeToggleEl.type = 'button';
    themeToggleEl.className = 'theme-toggle';
    themeToggleEl.addEventListener('click', () => {
      const next = nextTheme(getStoredTheme());
      setTheme(next);
    });
    nav.appendChild(themeToggleEl);

    return nav;
  }

  function buildFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `Part of <strong>HTMLExtensions</strong> · <a href="https://github.com/EvotecIT/HTMLExtensions" target="_blank" rel="noopener">View on GitHub ↗</a>`;
    return footer;
  }

  function getOpts() {
    // Prefer attributes on the site.js script tag
    const thisScript = Array.from(document.scripts).find(s => (s.src || '').includes('assets/site.js'));
    const docsRoot = (thisScript && thisScript.dataset.docsRoot) || './';
    const readme = thisScript && thisScript.dataset.readme;
    return { docsRoot, readme };
  }

  const THEME_KEY = 'htmlext_theme';
  let mediaQuery;

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  function prefersDark() {
    mediaQuery = mediaQuery || window.matchMedia('(prefers-color-scheme: dark)');
    return !!mediaQuery.matches;
  }

  function isEffectiveDark(mode) {
    return mode === 'dark' || (mode === 'auto' && prefersDark());
  }

  function applyEffectiveTheme(mode) {
    const effectiveDark = isEffectiveDark(mode);
    document.documentElement.classList.toggle('theme-dark', effectiveDark);
    updatePrismTheme(effectiveDark);
    updateThemeToggleUI(mode);
  }

  function setTheme(mode) {
    localStorage.setItem(THEME_KEY, mode);
    applyEffectiveTheme(mode);
    // Update on system change only in auto mode
    manageMediaListener(mode);
  }

  function updatePrismTheme(effectiveDark) {
    const light = document.querySelector('link[data-prism-theme="light"]');
    const dark = document.querySelector('link[data-prism-theme="dark"]');
    if (!light || !dark) return; // page without prism
    light.disabled = !!effectiveDark;
    dark.disabled = !effectiveDark;
  }

  function manageMediaListener(mode) {
    mediaQuery = mediaQuery || window.matchMedia('(prefers-color-scheme: dark)');
    if (mode === 'auto') {
      if (!mediaQuery._listenerAttached) {
        mediaQuery.addEventListener('change', () => applyEffectiveTheme(getStoredTheme()));
        mediaQuery._listenerAttached = true;
      }
    } else if (mediaQuery && mediaQuery._listenerAttached) {
      // No built-in way to remove the anonymous listener we attached above safely here,
      // but leaving it is harmless; it will just re-apply with the stored theme.
    }
  }

  function nextTheme(current) {
    switch (current) {
      case 'light': return 'dark';
      case 'dark': return 'auto';
      default: return 'light'; // auto -> light
    }
  }

  function themeLabel(mode) {
    return mode === 'dark' ? 'Dark' : mode === 'auto' ? 'Auto' : 'Light';
  }

  function themeIcon(mode) {
    // Return inline SVG for the current mode
    if (mode === 'dark') {
      // Moon
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path class="fill" d="M12 2a9.99 9.99 0 0 0 0 20c5.52 0 10-4.48 10-10 0-1.33-.26-2.6-.73-3.76-.21-.51-.93-.51-1.14 0A7 7 0 0 1 12 19a7 7 0 0 1 0-14 7 7 0 0 1 6.13 3.56c.27.48 1 .38 1.2-.15A9.98 9.98 0 0 0 12 2z"/>
        </svg>`;
    }
    if (mode === 'auto') {
      // Monitor
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="4" width="18" height="12" rx="2" ry="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>`;
    }
    // Sun (default light)
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>`;
  }

  function updateThemeToggleUI(mode) {
    if (!themeToggleEl) return;
    themeToggleEl.innerHTML = themeIcon(mode);
    themeToggleEl.title = `Theme: ${themeLabel(mode)} (click to change)`;
    themeToggleEl.setAttribute('aria-label', `Theme: ${themeLabel(mode)} (click to change)`);
  }

  function init() {
    const opts = getOpts();
    const nav = buildNav(opts);
    document.body.insertBefore(nav, document.body.firstChild);

    // If page already has a local nav, remove it to avoid duplication
    const legacyNavs = document.querySelectorAll('body > nav');
    legacyNavs.forEach(n => n !== nav && n.remove());

    const footer = buildFooter();
    document.body.appendChild(footer);

    // Initialize theme
    const mode = getStoredTheme();
    applyEffectiveTheme(mode);
    manageMediaListener(mode);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
