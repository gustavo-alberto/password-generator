// Application entry point.

import { detectLanguage, getLanguage, setLanguage, t, LANGUAGE_CHANGE_EVENT } from './i18n.js'
import { effectiveTheme, initTheme, toggleTheme, THEME_CHANGE_EVENT } from './theme.js'
import { loadPrefs, savePrefs } from './storage.js'
import { hasSecureRandom } from './core/random.js'
import { createResultView } from './ui/result.js'
import { createRandomView } from './ui/random-view.js'
import { createPassphraseView } from './ui/passphrase-view.js'
import { createPinView } from './ui/pin-view.js'
import { createBulkView } from './ui/bulk.js'

const THEME_GLYPHS = Object.freeze({ light: '☾', dark: '☀' })
const MODES = Object.freeze(['random', 'passphrase', 'pin'])

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

/** Tabs with automatic activation and roving tabindex (WAI-ARIA tabs pattern). */
function initModes({ views, result, initialMode }) {
  const tabs = [...document.querySelectorAll('[role="tab"][data-mode]')]
  let currentMode = null

  function select(mode, { focus = false } = {}) {
    if (!MODES.includes(mode) || mode === currentMode) return
    views[currentMode]?.deactivate()
    currentMode = mode
    for (const tab of tabs) {
      const selected = tab.dataset.mode === mode
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected
      if (selected && focus) tab.focus()
    }
    savePrefs({ mode })
    if (views[mode]) views[mode].activate()
    else result.clear()
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab.dataset.mode))
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab)
      const target = {
        ArrowRight: tabs[(index + 1) % tabs.length],
        ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs.at(-1),
      }[event.key]
      if (!target) return
      event.preventDefault()
      select(target.dataset.mode, { focus: true })
    })
  }

  select(MODES.includes(initialMode) ? initialMode : 'random')
  return { current: () => currentMode }
}

function showInsecureEnvironment() {
  document.getElementById('crypto-error').hidden = false
  for (const button of document.querySelectorAll('[data-action]')) button.disabled = true
}

function init() {
  const prefs = loadPrefs()
  initHeader()
  initTheme()
  // Detected (not chosen) languages are not persisted, so a browser change still applies.
  setLanguage(detectLanguage(prefs.language), { persist: false })

  if (!hasSecureRandom()) {
    showInsecureEnvironment()
    return
  }

  const result = createResultView()
  const views = {
    random: createRandomView({ result, saved: prefs.random }),
    passphrase: createPassphraseView({ result, saved: prefs.passphrase }),
    pin: createPinView({ result, saved: prefs.pin }),
  }
  // Created before the modes so it hears the first result.
  let modes = null
  const bulk = createBulkView({ result, getView: () => views[modes?.current()], saved: prefs.bulk })
  modes = initModes({ views, result, initialMode: prefs.mode })

  for (const button of document.querySelectorAll('[data-action="generate"]')) {
    button.addEventListener('click', () => views[modes.current()]?.generate())
  }
  document.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    result.refreshLabels()
    for (const view of Object.values(views)) view.refreshLabels()
    bulk.refreshLabels()
  })
}

init()
