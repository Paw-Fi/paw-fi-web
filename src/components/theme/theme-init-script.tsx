import React from 'react'

// Initializes theme ASAP to avoid FOUC and ensure CSS variables match on first paint
export function ThemeInitScript() {
  const code = `(() => {
    try {
      var storageKey = 'theme';
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var persisted = localStorage.getItem(storageKey);
      var isDark = persisted ? persisted === 'dark' : mql.matches;
      var root = document.documentElement;
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    } catch (_) {}
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export default ThemeInitScript
