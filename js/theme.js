// Light/dark theme. With no saved choice the page follows prefers-color-scheme;
// a manual choice is stored and applied through data-theme on <html>.

import { loadPrefs, savePrefs } from './storage.js'

export const THEMES = Object.freeze(['light', 'dark'])
export const THEME_CHANGE_EVENT = 'app:themechange'

const THEME_COLORS = Object.freeze({ light: '#f5f3ee', dark: '#141413' })
const darkQuery = globalThis.matchMedia?.('(prefers-color-scheme: dark)')

function root() {
  return globalThis.document.documentElement
}

/** The theme currently shown, whether chosen manually or inherited from the system. */
export function effectiveTheme() {
  const manual = root().dataset.theme
  if (THEMES.includes(manual)) return manual
  return darkQuery?.matches ? 'dark' : 'light'
}

function syncThemeColor(manualTheme) {
  for (const meta of globalThis.document.querySelectorAll('meta[name="theme-color"]')) {
    const media = meta.getAttribute('media') ?? ''
    const systemTheme = media.includes('dark') ? 'dark' : 'light'
    meta.setAttribute('content', THEME_COLORS[manualTheme ?? systemTheme])
  }
}

function notify() {
  globalThis.document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: effectiveTheme() } }))
}

/** Applies a manual theme, or follows the system when theme is not 'light'/'dark'. */
export function applyTheme(theme) {
  if (THEMES.includes(theme)) root().dataset.theme = theme
  else delete root().dataset.theme
  syncThemeColor(THEMES.includes(theme) ? theme : null)
  notify()
}

export function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  savePrefs({ theme: next })
  return next
}

export function initTheme() {
  applyTheme(loadPrefs().theme)
  darkQuery?.addEventListener('change', () => {
    if (!THEMES.includes(root().dataset.theme)) notify()
  })
}
