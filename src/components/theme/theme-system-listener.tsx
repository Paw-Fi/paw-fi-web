"use client";

import { useEffect } from 'react'

/**
 * Keeps the `.dark` class on <html> in sync with system theme when
 * the user hasn't explicitly chosen a theme. Also reacts to cross-tab changes.
 */
export default function ThemeSystemListener() {
  useEffect(() => {
    const storageKey = 'theme';
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    function getUserPref(): 'light' | 'dark' | null {
      const persisted = localStorage.getItem(storageKey);
      return persisted === 'light' || persisted === 'dark' ? persisted : null;
    }

    function applyTheme() {
      const userPref = getUserPref();
      const isDark = userPref ? userPref === 'dark' : mql.matches;
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    }

    // Initial sync (covers SSR hydration route changes)
    applyTheme();

    // Listen system changes
    const handleChange = () => applyTheme();
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', handleChange);
    else if (typeof mql.addListener === 'function') mql.addListener(handleChange as any);

    // Listen storage changes across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) applyTheme();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', handleChange);
      else if (typeof mql.removeListener === 'function') mql.removeListener(handleChange as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
