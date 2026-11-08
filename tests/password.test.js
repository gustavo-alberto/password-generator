import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGroups,
  generatePassword,
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_LENGTH,
  MAX_ATTEMPTS,
} from '../js/core/password.js'
import { createRng } from '../js/core/random.js'
import { EXTENDED_ASCII, LOOK_ALIKES, SYMBOL_GROUPS } from '../js/core/charsets.js'
import { ErrorCode } from '../js/core/errors.js'
import { chiSquareCritical, chiSquareUniform, scriptedFill } from './helpers/stats.js'

const ALL_ASCII = { excludeLookAlikes: false }

function expectCode(fn, code) {
  assert.throws(fn, (error) => error.code === code)
}

test('defaults produce a 20-character password', () => {
  const { value } = generatePassword()
  assert.equal(Array.from(value).length, PASSWORD_LENGTH.default)
})

test('symbol subgroups cover all 32 printable ASCII symbols exactly once', () => {
  const symbols = Object.values(SYMBOL_GROUPS).join('')
  assert.equal(symbols.length, 32)
  assert.equal(new Set(symbols).size, 32)
  for (let code = 0x21; code <= 0x7e; code += 1) {
    const char = String.fromCharCode(code)
    if (!/[A-Za-z0-9]/.test(char)) assert.ok(symbols.includes(char), `missing ${char}`)
  }
})

test('all basic groups give the 94 printable ASCII characters', () => {
  const groups = buildGroups(ALL_ASCII)
  assert.deepEqual(
    groups.map((g) => [g.id, g.chars.length]),
    [
      ['uppercase', 26],
      ['lowercase', 26],
      ['digits', 10],
      ['symbols', 32],
    ],
  )
})

test('extended ASCII adds 94 Latin-1 characters without the soft hyphen', () => {
  assert.equal(EXTENDED_ASCII.length, 94)
  assert.ok(!EXTENDED_ASCII.includes('­'))
  const groups = buildGroups({ ...ALL_ASCII, extended: true })
  assert.equal(groups.find((g) => g.id === 'extended').chars.length, 94)
})

test('look-alikes are removed when requested', () => {
  const pool = buildGroups({ excludeLookAlikes: true }).flatMap((g) => g.chars)
  for (const char of LOOK_ALIKES) assert.ok(!pool.includes(char), `pool contains ${char}`)
  for (let i = 0; i < 200; i += 1) {
    const { value } = generatePassword({ length: 64 })
    for (const char of LOOK_ALIKES) assert.ok(!value.includes(char))
  }
})

test('exclude removes characters from every group', () => {
  const pool = buildGroups({ ...ALL_ASCII, exclude: 'aA1#' }).flatMap((g) => g.chars)
  for (const char of 'aA1#') assert.ok(!pool.includes(char))
  assert.equal(pool.length, 90)
})

test('include adds its own group, deduplicated against existing characters', () => {
  const groups = buildGroups({ uppercase: false, lowercase: false, digits: false, symbols: false, include: 'ab€€ a' })
  assert.deepEqual(groups, [{ id: 'include', chars: ['a', 'b', '€'] }])

  const withLetters = buildGroups({ ...ALL_ASCII, include: 'aé' })
  assert.deepEqual(withLetters.find((g) => g.id === 'include').chars, ['é'])
})

test('groups emptied by exclusions are dropped', () => {
  const groups = buildGroups({ ...ALL_ASCII, digits: true, exclude: '0123456789' })
  assert.ok(!groups.some((g) => g.id === 'digits'))
})

test('disabled symbol subgroups are left out', () => {
  const groups = buildGroups({
    ...ALL_ASCII,
    symbolGroups: { quotes: false, dashes: false },
  })
  const symbols = groups.find((g) => g.id === 'symbols').chars.join('')
  assert.ok(!symbols.includes('"') && !symbols.includes("'") && !symbols.includes('\\'))
  assert.equal(symbols.length, 32 - 2 - 5)
})

test('only the selected characters are used', () => {
  for (let i = 0; i < 200; i += 1) {
    const { value } = generatePassword({ length: 32, uppercase: false, lowercase: false, symbols: false })
    assert.match(value, /^[2-9]{32}$/)
  }
})

test('requireEachGroup guarantees one character from every group', () => {
  for (let i = 0; i < 2000; i += 1) {
    const { value } = generatePassword({ length: 4 })
    assert.match(value, /[A-Z]/)
    assert.match(value, /[a-z]/)
    assert.match(value, /[0-9]/)
    assert.match(value, /[^A-Za-z0-9]/)
  }
})

test('result reports group sizes and pool size', () => {
  const result = generatePassword({ ...ALL_ASCII, length: 10 })
  assert.equal(result.poolSize, 94)
  assert.deepEqual(
    result.groups.map((g) => g.size),
    [26, 26, 10, 32],
  )
})

test('invalid lengths are rejected', () => {
  for (const length of [3, 129, 10.5, NaN, '20']) {
    expectCode(() => generatePassword({ length }), ErrorCode.INVALID_LENGTH)
  }
  assert.doesNotThrow(() => generatePassword({ length: 4 }))
  assert.doesNotThrow(() => generatePassword({ length: 128 }))
})

test('no groups is an error', () => {
  expectCode(
    () => generatePassword({ uppercase: false, lowercase: false, digits: false, symbols: false }),
    ErrorCode.NO_GROUPS,
  )
})

test('length below the number of required groups is an error', () => {
  expectCode(
    () => generatePassword({ length: 4, extended: true, include: '§' }),
    ErrorCode.TOO_SHORT_FOR_GROUPS,
  )
  assert.doesNotThrow(() => generatePassword({ length: 4, extended: true, include: '§', requireEachGroup: false }))
})

test('an unsatisfiable draw stops after MAX_ATTEMPTS', () => {
  // A source that always returns 0 keeps picking the first character, so groups are never all present.
  const rng = createRng(scriptedFill([0]))
  expectCode(() => generatePassword({ length: 4 }, rng), ErrorCode.TOO_MANY_ATTEMPTS)
  assert.ok(MAX_ATTEMPTS >= 10_000)
})

test('characters are uniformly distributed (chi-square)', () => {
  const options = { ...ALL_ASCII, length: 100, requireEachGroup: false }
  const pool = buildGroups(options).flatMap((g) => g.chars)
  const index = new Map(pool.map((char, i) => [char, i]))
  const counts = new Array(pool.length).fill(0)
  const passwords = 2000
  for (let i = 0; i < passwords; i += 1) {
    for (const char of generatePassword(options).value) counts[index.get(char)] += 1
  }
  const statistic = chiSquareUniform(counts, passwords * options.length)
  const critical = chiSquareCritical(pool.length - 1)
  assert.ok(statistic < critical, `chi-square ${statistic.toFixed(1)} >= ${critical.toFixed(1)}`)
})

test('defaults object is frozen', () => {
  assert.ok(Object.isFrozen(DEFAULT_PASSWORD_OPTIONS))
  assert.ok(Object.isFrozen(DEFAULT_PASSWORD_OPTIONS.symbolGroups))
})
