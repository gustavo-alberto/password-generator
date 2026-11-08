// Options panel for the passphrase mode. The wordlist follows the UI language and is
// loaded on demand the first time the mode is opened in that language.

import {
  generatePassphrase,
  CASINGS,
  DEFAULT_PASSPHRASE_OPTIONS,
  PASSPHRASE_SYMBOLS,
  SEPARATOR_MAX_LENGTH,
  WORD_COUNT,
} from '../core/passphrase.js'
import { passphraseEntropy } from '../core/entropy.js'
import { loadWordlist } from '../core/wordlists.js'
import { ErrorCode, GeneratorError } from '../core/errors.js'
import { formatNumber, getLanguage, t } from '../i18n.js'
import { savePrefs } from '../storage.js'
import { bindRangeNumber, savedInteger } from './controls.js'

const PRESET_SEPARATORS = Object.freeze([' ', '-', '_', '.'])
const BOOLEAN_OPTIONS = Object.freeze(['upperOneWord', 'addDigit', 'addSymbol'])
const WORDLIST_NAME_KEYS = Object.freeze({ 'en-eff': 'wordlistNameEn', 'pt-br-drebs': 'wordlistNamePt' })

const ERROR_KEYS = Object.freeze({
  [ErrorCode.INVALID_OPTION]: 'errInvalidSeparator',
  [ErrorCode.INVALID_LENGTH]: 'errInvalidLength',
})

function isValidSeparator(value) {
  return typeof value === 'string' && Array.from(value).length <= SEPARATOR_MAX_LENGTH && !/\p{C}/u.test(value)
}

/** Rebuilds options from saved prefs, keeping only known keys with valid values. */
export function sanitizePassphraseOptions(saved) {
  const options = { ...DEFAULT_PASSPHRASE_OPTIONS }
  if (!saved || typeof saved !== 'object') return options
  options.wordCount = savedInteger(saved.wordCount, WORD_COUNT, options.wordCount)
  if (isValidSeparator(saved.separator)) options.separator = saved.separator
  if (CASINGS.includes(saved.casing)) options.casing = saved.casing
  for (const key of BOOLEAN_OPTIONS) {
    if (typeof saved[key] === 'boolean') options[key] = saved[key]
  }
  return options
}

export function createPassphraseView({ result, saved }) {
  const panel = document.getElementById('panel-passphrase')
  const errorBox = document.getElementById('passphrase-error')
  const info = document.getElementById('wordlist-info')
  const customSeparator = document.getElementById('separator-custom-input')
  const customRadio = panel.querySelector('input[name="separator"][value="custom"]')

  const state = sanitizePassphraseOptions(saved)
  let wordlist = null // { words, meta, language }
  let lastError = null // translation key
  let active = false
  let loadToken = 0

  const renderWordCount = bindRangeNumber({
    range: document.getElementById('passphrase-words'),
    number: document.getElementById('passphrase-words-number'),
    min: WORD_COUNT.min,
    max: WORD_COUNT.max,
    onChange: (wordCount) => {
      if (wordCount !== state.wordCount) update({ wordCount })
    },
  })

  function renderControls() {
    renderWordCount(state.wordCount)
    const preset = PRESET_SEPARATORS.includes(state.separator)
    for (const radio of panel.querySelectorAll('input[name="separator"]')) {
      radio.checked = preset ? radio.value === state.separator : radio.value === 'custom'
    }
    if (!preset && document.activeElement !== customSeparator) customSeparator.value = state.separator
    for (const radio of panel.querySelectorAll('input[name="casing"]')) {
      radio.checked = radio.value === state.casing
    }
    for (const input of panel.querySelectorAll('input[type="checkbox"][data-option]')) {
      input.checked = state[input.dataset.option]
    }
  }

  function renderInfo() {
    if (!wordlist) {
      info.textContent = lastError === 'errWordlist' ? '' : t('loadingWordlist')
      return
    }
    const name = t(WORDLIST_NAME_KEYS[wordlist.meta.id] ?? 'wordlistNameEn')
    info.textContent = t('wordlistInfo', { name, size: formatNumber(wordlist.words.length) })
  }

  function renderError() {
    errorBox.hidden = !lastError
    errorBox.textContent = lastError ? t(lastError, WORD_COUNT) : ''
  }

  function persist() {
    savePrefs({ passphrase: state })
  }

  function generate() {
    if (!active) return
    if (!wordlist || wordlist.language !== getLanguage()) {
      ensureWordlist()
      return
    }
    try {
      const passphrase = generatePassphrase(state, wordlist.words)
      const bits = passphraseEntropy({
        ...state,
        listSize: passphrase.listSize,
        symbolCount: PASSPHRASE_SYMBOLS.length,
      })
      lastError = null
      result.show({ value: passphrase.value, bits })
    } catch (error) {
      if (!(error instanceof GeneratorError)) throw error
      lastError = ERROR_KEYS[error.code] ?? 'errInvalidSeparator'
      result.clear()
    }
    renderError()
  }

  async function ensureWordlist() {
    const language = getLanguage()
    const token = ++loadToken
    wordlist = null
    result.clear()
    renderInfo()
    try {
      const loaded = await loadWordlist(language)
      // Ignore results that arrive after the language changed again.
      if (token !== loadToken) return
      wordlist = { ...loaded, language }
      lastError = null
      renderInfo()
      generate()
    } catch {
      if (token !== loadToken) return
      lastError = 'errWordlist'
      renderInfo()
      renderError()
    }
  }

  function update(changes) {
    Object.assign(state, changes)
    renderControls()
    persist()
    generate()
  }

  for (const radio of panel.querySelectorAll('input[name="separator"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return
      if (radio.value === 'custom') {
        customSeparator.focus()
        update({ separator: customSeparator.value })
      } else {
        update({ separator: radio.value })
      }
    })
  }
  customSeparator.addEventListener('input', () => {
    customRadio.checked = true
    update({ separator: customSeparator.value })
  })
  for (const radio of panel.querySelectorAll('input[name="casing"]')) {
    radio.addEventListener('change', () => radio.checked && update({ casing: radio.value }))
  }
  for (const input of panel.querySelectorAll('input[type="checkbox"][data-option]')) {
    input.addEventListener('change', () => update({ [input.dataset.option]: input.checked }))
  }

  renderControls()

  /** Generates several passphrases; [] while the wordlist loads or the options are invalid. */
  function generateMany(count) {
    if (!wordlist || wordlist.language !== getLanguage()) return []
    try {
      return Array.from({ length: count }, () => generatePassphrase(state, wordlist.words).value)
    } catch (error) {
      if (error instanceof GeneratorError) return []
      throw error
    }
  }

  return {
    panel,
    generate,
    generateMany,
    activate() {
      active = true
      renderInfo()
      generate()
    },
    deactivate() {
      active = false
    },
    refreshLabels() {
      renderInfo()
      renderError()
      // The wordlist follows the UI language.
      if (active && wordlist?.language !== getLanguage()) generate()
    },
  }
}
