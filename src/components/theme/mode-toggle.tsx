"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDesktop, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'

export type ThemeMode = 'light' | 'dark' | 'system'

function getSystemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const storageKey = 'theme'
  if (mode === 'system') {
    localStorage.removeItem(storageKey)
    const isDark = getSystemPrefersDark()
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  } else {
    localStorage.setItem(storageKey, mode)
    const isDark = mode === 'dark'
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }
}

export function ModeToggle() {
  const mql = useMemo(() => (typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null), [])
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    // Initialize from localStorage or system
    const persisted = localStorage.getItem('theme') as ThemeMode | null
    const initialMode: ThemeMode = persisted === 'light' || persisted === 'dark' ? persisted : 'system'
    setMode(initialMode)
    applyTheme(initialMode)
  }, [])

  useEffect(() => {
    if (!mql) return
    const onChange = () => {
      if (mode === 'system') applyTheme('system')
    }
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
    else if (typeof mql.addListener === 'function') mql.addListener(onChange as any)
    return () => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange)
      else if (typeof mql.removeListener === 'function') mql.removeListener(onChange as any)
    }
  }, [mql, mode])

  function cycleMode() {
    const next: ThemeMode = mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system'
    setMode(next)
    applyTheme(next)
  }

  const icon = mode === 'system' ? faDesktop : mode === 'dark' ? faMoon : faSun
  const label = mode === 'system' ? 'System theme' : mode === 'dark' ? 'Dark theme' : 'Light theme'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Toggle theme (${label})`}
      title={label}
      onClick={cycleMode}
      className="text-foreground hover:text-primary"
    >
      <FontAwesomeIcon icon={icon} />
    </Button>
  )
}

export default ModeToggle
