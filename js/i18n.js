// Minimal i18n: dictionaries, interpolation, plurals and DOM translation via data attributes.
//
//   data-i18n="key"             sets textContent
//   data-i18n-aria-label="key"  sets aria-label
//   data-i18n-title="key"       sets title
//   data-i18n-placeholder="key" sets placeholder

import en from './locales/en.js'
import ptBR from './locales/pt-BR.js'
import { savePrefs } from './storage.js'

export const DICTIONARIES = Object.freeze({ en, 'pt-BR': ptBR })
export const SUPPORTED_LANGUAGES = Object.freeze(Object.keys(DICTIONARIES))
export const DEFAULT_LANGUAGE = 'en'

/** Fired on document after the language changes. detail: { language }. */
export const LANGUAGE_CHANGE_EVENT = 'app:languagechange'

const ATTRIBUTE_BINDINGS = Object.freeze([
  ['i18nAriaLabel', 'aria-label'],
  ['i18nTitle', 'title'],
  ['i18nPlaceholder', 'placeholder'],
])

let currentLanguage = DEFAULT_LANGUAGE

/** Maps a BCP 47 tag to a supported language, or null. */
export function normalizeLanguage(tag) {
  if (typeof tag !== 'string' || tag === '') return null
  if (Object.hasOwn(DICTIONARIES, tag)) return tag
  const primary = tag.toLowerCase().split('-')[0]
  if (primary === 'pt') return 'pt-BR'
  if (primary === 'en') return 'en'
  return null
}

/** Picks the saved language, else the first supported browser language, else English. */
export function detectLanguage(saved, browserLanguages = globalThis.navigator?.languages) {
  const candidates = [saved, ...(browserLanguages ?? [globalThis.navigator?.language])]
  for (const candidate of candidates) {
    const language = normalizeLanguage(candidate)
    if (language) return language
  }
  return DEFAULT_LANGUAGE
}

export function getLanguage() {
  return currentLanguage
}

export function formatNumber(value, language = currentLanguage) {
  return new Intl.NumberFormat(language).format(value)
}

function lookup(dictionary, key) {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined
}

/**
 * Translates a key. `{name}` placeholders are filled from params. When params.count is a
 * number, the plural form `key_<rule>` is used and {count} is locale-formatted.
 */
export function t(key, params = {}, language = currentLanguage) {
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE]
  let template
  if (typeof params.count === 'number') {
    const rule = new Intl.PluralRules(language).select(params.count)
    template =
      lookup(dictionary, `${key}_${rule}`) ??
      lookup(dictionary, `${key}_other`) ??
      lookup(DICTIONARIES[DEFAULT_LANGUAGE], `${key}_other`)
  }
  template ??= lookup(dictionary, key) ?? lookup(DICTIONARIES[DEFAULT_LANGUAGE], key) ?? key

  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (!Object.hasOwn(params, name)) return match
    const value = params[name]
    return name === 'count' && typeof value === 'number' ? formatNumber(value, language) : String(value)
  })
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export function toSuperscript(value) {
  return String(value).replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS[Number(digit)])
}

/** Turns a crackTime() result into text such as "~3 years to crack*". */
export function formatCrackTime(result, language = currentLanguage) {
  if (result.unit === 'instant') return t('crackInstant', {}, language)
  const time =
    result.exponent !== undefined
      ? t('unitYearsExponent', { exponent: toSuperscript(result.exponent) }, language)
      : t(`unit${result.unit.charAt(0).toUpperCase()}${result.unit.slice(1)}`, { count: result.value }, language)
  return t('crackTime', { time }, language)
}

/** Applies translations to every annotated element under root, plus document metadata. */
export function applyTranslations(root = globalThis.document) {
  if (!root) return
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n)
  }
  for (const [dataKey, attribute] of ATTRIBUTE_BINDINGS) {
    const selector = `[data-${dataKey.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`
    for (const element of root.querySelectorAll(selector)) {
      element.setAttribute(attribute, t(element.dataset[dataKey]))
    }
  }
  const document = globalThis.document
  if (document && root === document) {
    document.documentElement.lang = currentLanguage
    document.title = t('documentTitle')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'))
  }
}

/**
 * Switches the UI language.
 * @param {string} language
 * @param {{ persist?: boolean }} options persist=false for automatic detection
 */
export function setLanguage(language, { persist = true } = {}) {
  currentLanguage = normalizeLanguage(language) ?? DEFAULT_LANGUAGE
  if (persist) savePrefs({ language: currentLanguage })
  const document = globalThis.document
  if (document) {
    applyTranslations(document)
    document.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language: currentLanguage } }))
  }
  return currentLanguage
}
