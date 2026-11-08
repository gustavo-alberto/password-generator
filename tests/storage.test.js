import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { loadPrefs, savePrefs, STORAGE_KEY } from '../js/storage.js'

class MemoryStorage {
  constructor() {
    this.data = new Map()
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null
  }
  setItem(key, value) {
    this.data.set(key, String(value))
  }
}

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

function installStorage(value) {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true })
}

beforeEach(() => installStorage(new MemoryStorage()))
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
  else delete globalThis.localStorage
})

test('empty storage gives empty prefs', () => {
  assert.deepEqual(loadPrefs(), {})
})

test('savePrefs merges and persists allowed keys only', () => {
  savePrefs({ theme: 'dark', mode: 'pin' })
  savePrefs({ language: 'pt-BR', password: 'secret', value: 'abc' })
  assert.deepEqual(loadPrefs(), { theme: 'dark', mode: 'pin', language: 'pt-BR' })
  const raw = globalThis.localStorage.getItem(STORAGE_KEY)
  assert.ok(!raw.includes('secret') && !raw.includes('abc'))
})

test('corrupted or unexpected data is ignored', () => {
  for (const raw of ['{not json', '[1,2]', 'null', '"text"', '42']) {
    globalThis.localStorage.setItem(STORAGE_KEY, raw)
    assert.deepEqual(loadPrefs(), {})
  }
})

test('unavailable storage never throws', () => {
  installStorage(undefined)
  assert.deepEqual(loadPrefs(), {})
  assert.deepEqual(savePrefs({ theme: 'light' }), { theme: 'light' })

  installStorage({
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('quota')
    },
  })
  assert.deepEqual(loadPrefs(), {})
  assert.doesNotThrow(() => savePrefs({ theme: 'light' }))
})
