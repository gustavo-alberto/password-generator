// "Generate several": a list of secrets for the current mode and options, with a copy
// button per item and "copy all". The list follows the main result: it regenerates
// whenever a new result is shown and respects the hide/show toggle.

import { t } from '../i18n.js'
import { savePrefs } from '../storage.js'
import { renderSecret } from './result.js'

export const BULK_COUNTS = Object.freeze([5, 10, 25, 50])
const DEFAULT_COUNT = 10
const COPIED_FEEDBACK_MS = 2000

/**
 * @param {{ result: ReturnType<import('./result.js').createResultView>,
 *           getView: () => { generateMany: (count: number) => string[] } | undefined,
 *           saved?: { count?: number } }} params
 */
export function createBulkView({ result, getView, saved }) {
  const details = document.getElementById('bulk')
  const list = document.getElementById('bulk-list')
  const errorBox = document.getElementById('bulk-error')
  const copyAllButton = document.querySelector('[data-bulk-action="copy-all"]')
  const generateButton = document.querySelector('[data-bulk-action="generate"]')

  let count = BULK_COUNTS.includes(saved?.count) ? saved.count : DEFAULT_COUNT
  let values = []
  const feedbackTimers = new WeakMap()

  function renderCount() {
    for (const radio of details.querySelectorAll('input[name="bulk-count"]')) {
      radio.checked = Number(radio.value) === count
    }
  }

  function renderList() {
    const hidden = result.isHidden()
    const items = values.map((value, index) => {
      const item = document.createElement('li')
      item.className = 'bulk__item'

      const text = document.createElement('span')
      text.className = 'bulk__value'
      text.translate = false
      renderSecret(text, value, hidden)

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn--small'
      button.textContent = t('copy')
      button.setAttribute('aria-label', t('copyItem', { index: index + 1 }))
      button.addEventListener('click', () => copy(value, button))

      item.append(text, button)
      return item
    })
    list.replaceChildren(...items)
    copyAllButton.hidden = values.length === 0
  }

  function regenerate() {
    if (!details.open) return
    values = getView()?.generateMany(count) ?? []
    errorBox.hidden = true
    renderList()
  }

  function showFeedback(button) {
    clearTimeout(feedbackTimers.get(button))
    const label = button === copyAllButton ? 'copyAll' : 'copy'
    button.textContent = t('copied')
    button.classList.add('is-copied')
    feedbackTimers.set(
      button,
      setTimeout(() => {
        button.textContent = t(label)
        button.classList.remove('is-copied')
      }, COPIED_FEEDBACK_MS),
    )
  }

  async function copy(text, button) {
    errorBox.hidden = true
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(text)
      showFeedback(button)
    } catch {
      errorBox.textContent = t('errCopy')
      errorBox.hidden = false
    }
  }

  for (const radio of details.querySelectorAll('input[name="bulk-count"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return
      count = Number(radio.value)
      savePrefs({ bulk: { count } })
      regenerate()
    })
  }
  generateButton.addEventListener('click', regenerate)
  copyAllButton.addEventListener('click', () => copy(values.join('\n'), copyAllButton))
  details.addEventListener('toggle', () => {
    if (details.open) regenerate()
  })

  result.onChange(({ reason }) => {
    if (reason === 'visibility') renderList()
    else regenerate()
  })

  renderCount()

  return {
    refreshLabels() {
      if (!errorBox.hidden) errorBox.textContent = t('errCopy')
      renderList()
    },
  }
}
