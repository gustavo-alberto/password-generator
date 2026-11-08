import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRng, defaultRng, hasSecureRandom, InsecureEnvironmentError } from '../js/core/random.js'
import { chiSquareCritical, chiSquareUniform, scriptedFill } from './helpers/stats.js'

test('secure random is available in the test environment', () => {
  assert.equal(hasSecureRandom(), true)
})

test('randomInt rejects invalid ranges', () => {
  for (const n of [0, -1, 1.5, NaN, 2 ** 32 + 1, '10']) {
    assert.throws(() => defaultRng.randomInt(n), RangeError)
  }
})

test('randomInt(1) is always 0', () => {
  for (let i = 0; i < 100; i += 1) assert.equal(defaultRng.randomInt(1), 0)
})

test('randomInt stays within [0, n)', () => {
  for (const n of [2, 3, 7, 10, 94, 7776, 2 ** 31 + 1, 2 ** 32]) {
    for (let i = 0; i < 500; i += 1) {
      const value = defaultRng.randomInt(n)
      assert.ok(Number.isInteger(value) && value >= 0 && value < n, `${value} out of range for ${n}`)
    }
  }
})

test('randomInt discards values at or above the rejection limit', () => {
  // For n = 10 the limit is 2^32 - (2^32 % 10) = 4294967290.
  const limit = 4294967290
  const rng = createRng(scriptedFill([limit, limit + 5, 2 ** 32 - 1, 13]))
  assert.equal(rng.randomInt(10), 3)
})

test('randomInt accepts the value just below the limit', () => {
  const rng = createRng(scriptedFill([4294967289]))
  assert.equal(rng.randomInt(10), 9)
})

test('missing crypto raises InsecureEnvironmentError', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
  try {
    const rng = createRng()
    assert.equal(hasSecureRandom(), false)
    assert.throws(() => rng.randomInt(10), InsecureEnvironmentError)
  } finally {
    Object.defineProperty(globalThis, 'crypto', original)
  }
})

test('pick returns members and rejects empty input', () => {
  const items = ['a', 'b', 'c']
  for (let i = 0; i < 50; i += 1) assert.ok(items.includes(defaultRng.pick(items)))
  assert.throws(() => defaultRng.pick([]), RangeError)
})

for (const n of [10, 72, 94]) {
  test(`randomInt(${n}) is uniform (chi-square)`, () => {
    const samples = 200_000
    const counts = new Array(n).fill(0)
    for (let i = 0; i < samples; i += 1) counts[defaultRng.randomInt(n)] += 1
    const statistic = chiSquareUniform(counts, samples)
    const critical = chiSquareCritical(n - 1)
    assert.ok(statistic < critical, `chi-square ${statistic.toFixed(1)} >= ${critical.toFixed(1)}`)
  })
}

test('source code never uses Math.random', async () => {
  const root = fileURLToPath(new URL('../js/', import.meta.url))
  const files = await readdir(root, { recursive: true })
  assert.ok(files.length > 0)
  for (const file of files.filter((name) => name.endsWith('.js'))) {
    const source = await readFile(join(root, file), 'utf8')
    // Matches calls and references, not prose such as "no Math.random fallback" in comments.
    assert.ok(!/Math\s*\.\s*random\s*[(;,)]/.test(source), `${file} uses Math.random`)
  }
})
