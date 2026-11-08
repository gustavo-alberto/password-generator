import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bigLog2,
  crackTime,
  passwordEntropy,
  passphraseEntropy,
  pinEntropy,
  strengthFor,
  STRENGTH_LEVELS,
} from '../js/core/entropy.js'
import { buildGroups } from '../js/core/password.js'

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not close to ${expected}`)

/** Counts strings of the given length that contain every group, by enumeration. */
function bruteForceCount(groupSizes, length) {
  const owner = groupSizes.flatMap((size, group) => new Array(size).fill(group))
  let valid = 0
  const total = owner.length ** length
  for (let n = 0; n < total; n += 1) {
    const seen = new Set()
    let rest = n
    for (let i = 0; i < length; i += 1) {
      seen.add(owner[rest % owner.length])
      rest = Math.floor(rest / owner.length)
    }
    if (seen.size === groupSizes.length) valid += 1
  }
  return valid
}

test('bigLog2 matches Math.log2 and handles huge values', () => {
  close(bigLog2(1n), 0)
  close(bigLog2(1024n), 10)
  close(bigLog2(2n ** 1000n), 1000)
  close(bigLog2(3n ** 500n), 500 * Math.log2(3), 1e-9)
  assert.throws(() => bigLog2(0n), RangeError)
  assert.throws(() => bigLog2(5), RangeError)
})

test('password entropy without group requirement is L · log2(N)', () => {
  close(passwordEntropy({ length: 20, groupSizes: [26, 26, 10, 32] }), 20 * Math.log2(94))
  close(passwordEntropy({ length: 20, groupSizes: [26, 26, 10, 32] }), 131.0918, 1e-4)
})

test('inclusion–exclusion matches brute-force enumeration', () => {
  const cases = [
    [[2, 3], 3],
    [[1, 2, 3], 4],
    [[2, 2, 2, 1], 5],
    [[3, 1], 6],
  ]
  for (const [groupSizes, length] of cases) {
    const expected = Math.log2(bruteForceCount(groupSizes, length))
    close(passwordEntropy({ length, groupSizes, requireEachGroup: true }), expected, 1e-9)
  }
})

test('group requirement lowers entropy slightly and converges for long passwords', () => {
  const groupSizes = buildGroups({}).map((g) => g.chars.length)
  const free = passwordEntropy({ length: 20, groupSizes })
  const required = passwordEntropy({ length: 20, groupSizes, requireEachGroup: true })
  assert.ok(required < free)
  assert.ok(free - required < 1, `difference ${free - required}`)

  const free128 = passwordEntropy({ length: 128, groupSizes })
  const required128 = passwordEntropy({ length: 128, groupSizes, requireEachGroup: true })
  assert.ok(free128 - required128 < 1e-4, `difference ${free128 - required128}`)
})

test('password entropy edge cases', () => {
  assert.equal(passwordEntropy({ length: 0, groupSizes: [10] }), 0)
  assert.equal(passwordEntropy({ length: 10, groupSizes: [] }), 0)
  assert.equal(passwordEntropy({ length: 2, groupSizes: [1, 1, 1], requireEachGroup: true }), 0)
  close(passwordEntropy({ length: 8, groupSizes: [10], requireEachGroup: true }), 8 * Math.log2(10))
})

test('passphrase entropy', () => {
  const base = 6 * Math.log2(7776)
  close(passphraseEntropy({ wordCount: 6, listSize: 7776 }), base)
  close(passphraseEntropy({ wordCount: 6, listSize: 7776 }), 77.5489, 1e-4)
  close(passphraseEntropy({ wordCount: 6, listSize: 7776, upperOneWord: true }), base + Math.log2(6))
  close(passphraseEntropy({ wordCount: 6, listSize: 7776, casing: 'upper', upperOneWord: true }), base)
  close(passphraseEntropy({ wordCount: 6, listSize: 7776, addDigit: true }), base + Math.log2(6) + Math.log2(10))
  close(passphraseEntropy({ wordCount: 6, listSize: 7776, addSymbol: true }), base + Math.log2(6) + 3)
  assert.equal(passphraseEntropy({ wordCount: 0, listSize: 7776 }), 0)
})

test('PIN entropy', () => {
  close(pinEntropy(6), 6 * Math.log2(10))
  close(pinEntropy(4), 13.2877, 1e-4)
  assert.equal(pinEntropy(0), 0)
})

test('strength bands follow KeePassXC thresholds', () => {
  const at = (bits) => strengthFor(bits).key
  assert.equal(at(0), 'poor')
  assert.equal(at(39.99), 'poor')
  assert.equal(at(40), 'weak')
  assert.equal(at(74.99), 'weak')
  assert.equal(at(75), 'good')
  assert.equal(at(99.99), 'good')
  assert.equal(at(100), 'excellent')
  assert.equal(at(500), 'excellent')
  assert.deepEqual(
    STRENGTH_LEVELS.map((band) => band.level),
    [1, 2, 3, 4],
  )
})

test('crack time picks a readable unit', () => {
  // 2^(bits-1) / 1e10 seconds.
  assert.deepEqual(crackTime(0), { unit: 'instant' })
  assert.deepEqual(crackTime(20), { unit: 'instant' })
  assert.deepEqual(crackTime(36), { unit: 'seconds', value: 3 })
  assert.deepEqual(crackTime(42), { unit: 'minutes', value: 4 })
  assert.deepEqual(crackTime(48), { unit: 'hours', value: 4 })
  assert.deepEqual(crackTime(55), { unit: 'days', value: 21 })
  assert.deepEqual(crackTime(64), { unit: 'years', value: 29 })
  assert.deepEqual(crackTime(131.09), { unit: 'years', exponent: 21 })
  assert.deepEqual(crackTime(1000), { unit: 'years', exponent: 283 })
})

test('crack time respects a custom attack rate', () => {
  assert.deepEqual(crackTime(40, 1e3), { unit: 'years', value: 17 })
})
