// Lazy loading of passphrase wordlists. Each list is a separate module, so only the
// list for the current language is downloaded.

const LOADERS = Object.freeze({
  en: () => import('../wordlists/en-eff.js'),
  'pt-BR': () => import('../wordlists/pt-br-drebs.js'),
})

export const WORDLIST_LANGUAGES = Object.freeze(Object.keys(LOADERS))

const cache = new Map()

/**
 * Loads the wordlist for a UI language. Unknown languages fall back to English.
 * @returns {Promise<{ words: readonly string[], meta: object }>}
 */
export function loadWordlist(language) {
  const key = Object.hasOwn(LOADERS, language) ? language : 'en'
  if (!cache.has(key)) {
    const pending = LOADERS[key]().then((module) => ({ words: module.default, meta: module.meta }))
    // Allow a retry if the import fails (for example offline before the list was cached).
    pending.catch(() => cache.delete(key))
    cache.set(key, pending)
  }
  return cache.get(key)
}
