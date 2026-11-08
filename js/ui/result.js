// Result area shared by every mode: colored output, strength meter, crack time,
// copy with real feedback, hide/show and screen reader announcements.

import { crackTime, strengthFor } from '../core/entropy.js'
import { formatCrackTime, t } from '../i18n.js'

const COPIED_FEEDBACK_MS = 2000
const ANNOUNCE_DELAY_MS = 700
const MASK_CHAR = '•'

function classify(char) {
  if (/\p{Nd}/u.test(char)) return 'char--digit'
  if (/\p{L}/u.test(char)) return null
  return 'char--symbol'
}

/**
 * Renders a secret into an element: digits and symbols get their own color, or every
 * character becomes a bullet when hidden. Uses text nodes only, never HTML parsing.
 */
export function renderSecret(element, value, hidden = false) {
  const chars = Array.from(value)
  if (hidden) {
    element.textContent = MASK_CHAR.repeat(chars.length)
    return
  }
  const fragment = document.createDocumentFragment()
  for (const char of chars) {
    const className = classify(char)
    if (className) {
      const span = document.createElement('span')
      span.className = className
      span.textContent = char
      fragment.append(span)
    } else {
      fragment.append(char)
    }
  }
  element.replaceChildren(fragment)
}

export function createResultView(root = document) {
  const output = root.getElementById('result-output')
  const meter = root.getElementById('strength-meter')
  const strengthLabel = root.getElementById('strength-label')
  const crackLabel = root.getElementById('crack-time')
  const liveRegion = root.getElementById('live-region')
  const copyError = root.getElementById('copy-error')
  const visibilityButton = root.getElementById('visibility-btn')
  const copyButtons = [...root.querySelectorAll('[data-action="copy"]')]

  let current = null // { value, bits }
  let hidden = false
  let announceTimer = 0
  let copiedTimer = 0

  const listeners = new Set()

  function notify(reason) {
    for (const listener of listeners) listener({ reason, hasValue: current !== null, hidden })
  }

  function renderOutput() {
    if (!current) {
      output.textContent = '—'
      return
    }
    renderSecret(output, current.value, hidden)
  }

  function renderStats() {
    if (!current) {
      meter.dataset.level = '0'
      strengthLabel.textContent = ''
      crackLabel.textContent = ''
      return
    }
    const strength = strengthFor(current.bits)
    meter.dataset.level = String(strength.level)
    strengthLabel.dataset.strength = strength.key
    strengthLabel.textContent = `${t(`strength_${strength.key}`)} · ${t('bits', { bits: Math.round(current.bits) })}`
    crackLabel.textContent = formatCrackTime(crackTime(current.bits))
  }

  function renderVisibility() {
    visibilityButton.setAttribute('aria-pressed', String(hidden))
    visibilityButton.setAttribute('aria-label', t(hidden ? 'show' : 'hide'))
    visibilityButton.querySelector('.icon-btn__glyph').textContent = hidden ? '◎' : '◉'
  }

  function announce(message, { immediate = false } = {}) {
    clearTimeout(announceTimer)
    const write = () => {
      // Clearing first makes repeated identical messages announce again.
      liveRegion.textContent = ''
      requestAnimationFrame(() => {
        liveRegion.textContent = message
      })
    }
    if (immediate) write()
    else announceTimer = setTimeout(write, ANNOUNCE_DELAY_MS)
  }

  function resetCopyFeedback() {
    clearTimeout(copiedTimer)
    for (const button of copyButtons) {
      button.textContent = t('copy')
      button.classList.remove('is-copied')
    }
  }

  function selectOutput() {
    const selection = globalThis.getSelection?.()
    if (!selection) return
    const range = document.createRange()
    range.selectNodeContents(output)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  /** Shows a new secret. The secret itself is never sent to the live region. */
  function show({ value, bits }) {
    current = { value, bits }
    copyError.hidden = true
    resetCopyFeedback()
    renderOutput()
    renderStats()
    output.classList.remove('is-fresh')
    // Restart the fade-in animation.
    void output.offsetWidth
    output.classList.add('is-fresh')
    announce(t('newSecretGenerated'))
    notify('show')
  }

  function clear() {
    current = null
    copyError.hidden = true
    resetCopyFeedback()
    renderOutput()
    renderStats()
    notify('clear')
  }

  async function copy() {
    if (!current) return
    copyError.hidden = true
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(current.value)
    } catch {
      copyError.textContent = t('errCopy')
      copyError.hidden = false
      if (hidden) {
        hidden = false
        renderVisibility()
        renderOutput()
        notify('visibility')
      }
      selectOutput()
      return
    }
    for (const button of copyButtons) {
      button.textContent = t('copied')
      button.classList.add('is-copied')
    }
    announce(t('copiedAnnouncement'), { immediate: true })
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(resetCopyFeedback, COPIED_FEEDBACK_MS)
  }

  function toggleVisibility() {
    hidden = !hidden
    renderVisibility()
    renderOutput()
    notify('visibility')
  }

  /** Re-renders translated texts after a language change. */
  function refreshLabels() {
    renderStats()
    renderVisibility()
    if (!copyError.hidden) copyError.textContent = t('errCopy')
    resetCopyFeedback()
  }

  for (const button of copyButtons) button.addEventListener('click', copy)
  visibilityButton.addEventListener('click', toggleVisibility)
  renderVisibility()

  return {
    show,
    clear,
    copy,
    refreshLabels,
    isHidden: () => hidden,
    /** Calls listener({ reason: 'show'|'clear'|'visibility', hasValue, hidden }) after each change. */
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
