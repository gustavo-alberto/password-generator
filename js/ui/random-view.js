// Options panel for the random password mode.

import { generatePassword, DEFAULT_PASSWORD_OPTIONS, PASSWORD_LENGTH } from '../core/password.js'
import { passwordEntropy } from '../core/entropy.js'
import { SYMBOL_GROUP_IDS } from '../core/charsets.js'
import { ErrorCode, GeneratorError } from '../core/errors.js'
import { t } from '../i18n.js'
import { savePrefs } from '../storage.js'

const BOOLEAN_OPTIONS = Object.freeze([
  'uppercase',
  'lowercase',
  'digits',
  'symbols',
  'extended',
  'excludeLookAlikes',
  'requireEachGroup',
])
const TEXT_OPTIONS = Object.freeze({ include: 64, exclude: 128 })

const ERROR_KEYS = Object.freeze({
  [ErrorCode.NO_GROUPS]: 'errNoGroup',
  [ErrorCode.TOO_SHORT_FOR_GROUPS]: 'errTooShort',
  [ErrorCode.TOO_MANY_ATTEMPTS]: 'errTooManyAttempts',
  [ErrorCode.INVALID_LENGTH]: 'errInvalidLength',
})

/** Rebuilds options from saved prefs, keeping only known keys with valid types. */
export function sanitizeRandomOptions(saved) {
  const options = structuredClone(DEFAULT_PASSWORD_OPTIONS)
  if (!saved || typeof saved !== 'object') return options

  if (Number.isInteger(saved.length)) {
    options.length = Math.min(PASSWORD_LENGTH.max, Math.max(PASSWORD_LENGTH.min, saved.length))
  }
  for (const key of BOOLEAN_OPTIONS) {
    if (typeof saved[key] === 'boolean') options[key] = saved[key]
  }
  for (const [key, maxLength] of Object.entries(TEXT_OPTIONS)) {
    if (typeof saved[key] === 'string') options[key] = Array.from(saved[key]).slice(0, maxLength).join('')
  }
  if (saved.symbolGroups && typeof saved.symbolGroups === 'object') {
    for (const id of SYMBOL_GROUP_IDS) {
      if (typeof saved.symbolGroups[id] === 'boolean') options.symbolGroups[id] = saved.symbolGroups[id]
    }
  }
  return options
}

/**
 * @param {{ result: ReturnType<import('./result.js').createResultView>, saved?: object }} params
 */
export function createRandomView({ result, saved }) {
  const panel = document.getElementById('panel-random')
  const range = document.getElementById('random-length')
  const number = document.getElementById('random-length-number')
  const errorBox = document.getElementById('random-error')

  const state = sanitizeRandomOptions(saved)
  let lastError = null
  let active = false

  function persist() {
    savePrefs({ random: state })
  }

  function renderControls() {
    range.value = String(state.length)
    number.value = String(state.length)
    for (const element of panel.querySelectorAll('button[data-option]')) {
      element.setAttribute('aria-pressed', String(state[element.dataset.option]))
    }
    for (const element of panel.querySelectorAll('input[type="checkbox"][data-option]')) {
      element.checked = state[element.dataset.option]
    }
    for (const element of panel.querySelectorAll('input[type="text"][data-option]')) {
      element.value = state[element.dataset.option]
    }
    for (const element of panel.querySelectorAll('[data-symbol-group]')) {
      element.setAttribute('aria-pressed', String(state.symbolGroups[element.dataset.symbolGroup]))
    }
  }

  function renderError() {
    if (!lastError) {
      errorBox.hidden = true
      errorBox.textContent = ''
      return
    }
    errorBox.textContent = t(ERROR_KEYS[lastError] ?? 'errNoGroup', PASSWORD_LENGTH)
    errorBox.hidden = false
  }

  function generate() {
    if (!active) return
    try {
      const password = generatePassword(state)
      const bits = passwordEntropy({
        length: state.length,
        groupSizes: password.groups.map((group) => group.size),
        requireEachGroup: state.requireEachGroup,
      })
      lastError = null
      result.show({ value: password.value, bits })
    } catch (error) {
      if (!(error instanceof GeneratorError)) throw error
      lastError = error.code
      result.clear()
    }
    renderError()
  }

  function update(changes) {
    Object.assign(state, changes)
    renderControls()
    persist()
    generate()
  }

  function setLength(value) {
    if (!Number.isInteger(value)) return
    const length = Math.min(PASSWORD_LENGTH.max, Math.max(PASSWORD_LENGTH.min, value))
    if (length !== state.length) update({ length })
    else renderControls()
  }

  range.addEventListener('input', () => setLength(Number(range.value)))
  // Typing in the number field applies valid values immediately and clamps on commit.
  number.addEventListener('input', () => {
    const value = Number(number.value)
    if (Number.isInteger(value) && value >= PASSWORD_LENGTH.min && value <= PASSWORD_LENGTH.max) setLength(value)
  })
  number.addEventListener('change', () => setLength(Math.round(Number(number.value)) || state.length))

  for (const button of panel.querySelectorAll('button[data-option]')) {
    button.addEventListener('click', () => {
      const key = button.dataset.option
      update({ [key]: !state[key] })
    })
  }
  for (const input of panel.querySelectorAll('input[type="checkbox"][data-option]')) {
    input.addEventListener('change', () => update({ [input.dataset.option]: input.checked }))
  }
  for (const input of panel.querySelectorAll('input[type="text"][data-option]')) {
    input.addEventListener('input', () => {
      state[input.dataset.option] = input.value
      persist()
      generate()
    })
  }
  for (const button of panel.querySelectorAll('[data-symbol-group]')) {
    button.addEventListener('click', () => {
      const id = button.dataset.symbolGroup
      const symbolGroups = { ...state.symbolGroups, [id]: !state.symbolGroups[id] }
      // Picking a subgroup implies symbols are wanted.
      update({ symbolGroups, symbols: symbolGroups[id] ? true : state.symbols })
    })
  }

  renderControls()

  return {
    panel,
    generate,
    activate() {
      active = true
      generate()
    },
    deactivate() {
      active = false
    },
    refreshLabels: renderError,
  }
}
