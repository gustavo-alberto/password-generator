// Application entry point.

import { detectLanguage, getLanguage, setLanguage, t, LANGUAGE_CHANGE_EVENT } from './i18n.js'
import { effectiveTheme, initTheme, toggleTheme, THEME_CHANGE_EVENT } from './theme.js'
import { loadPrefs } from './storage.js'

const THEME_GLYPHS = Object.freeze({ light: '☾', dark: '☀' })

function updateLanguageButtons() {
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage()))
  }
}

function updateThemeButton() {
  const button = document.getElementById('theme-toggle')
  if (!button) return
  const theme = effectiveTheme()
  button.setAttribute('aria-label', t(theme === 'dark' ? 'themeToLight' : 'themeToDark'))
  button.querySelector('.icon-btn__glyph').textContent = THEME_GLYPHS[theme]
}

function initHeader() {
  for (const button of document.querySelectorAll('[data-lang]')) {
    button.addEventListener('click', () => setLanguage(button.dataset.lang))
  }
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme)

  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    updateLanguageButtons()
    updateThemeButton()
  })
  document.addEventListener(THEME_CHANGE_EVENT, updateThemeButton)
}

function init() {
  initHeader()
  initTheme()
  // Detected (not chosen) languages are not persisted, so a browser change still applies.
  const prefs = loadPrefs()
  setLanguage(detectLanguage(prefs.language), { persist: false })
}

init()
