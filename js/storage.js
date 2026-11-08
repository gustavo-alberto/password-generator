// Interface preferences in localStorage. Only settings are stored, never generated secrets.
// Every access is guarded: storage may be disabled, full or blocked (private mode, policies).

export const STORAGE_KEY = 'pwgen:prefs:v1'

/** Top-level preference keys that may be stored. Anything else is dropped. */
const ALLOWED_KEYS = Object.freeze(['mode', 'language', 'theme', 'random', 'passphrase', 'pin', 'bulk'])

function getStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function pickAllowed(data) {
  const result = {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) return result
  for (const key of ALLOWED_KEYS) {
    if (Object.hasOwn(data, key) && data[key] !== undefined) result[key] = data[key]
  }
  return result
}

/** Returns the saved preferences, or an empty object when none can be read. */
export function loadPrefs() {
  const storage = getStorage()
  if (!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? pickAllowed(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

/** Merges the given preferences into the saved ones. Returns the merged result. */
export function savePrefs(partial) {
  const next = { ...loadPrefs(), ...pickAllowed(partial) }
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage full or blocked: preferences simply won't persist.
    }
  }
  return next
}
