import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  generatePassphrase,
  DEFAULT_PASSPHRASE_OPTIONS,
  PASSPHRASE_SYMBOLS,
  WORD_COUNT,
} from '../js/core/passphrase.js'
import { loadWordlist } from '../js/core/wordlists.js'
import { ErrorCode } from '../js/core/errors.js'
import { chiSquareCritical, chiSquareUniform } from './helpers/stats.js'

const SMALL_LIST = Object.freeze(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'])

function expectCode(fn, code) {
  assert.throws(fn, (error) => error.code === code)
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('defaults: 6 lowercase words joined by "-"', async () => {
  const { words } = await loadWordlist('en')
  const { value, wordCount, listSize } = generatePassphrase({}, words)
  const parts = value.split('-')
  // EFF has a few hyphenated words, so a part count above 6 is possible.
  assert.ok(parts.length >= 6)
  assert.equal(value, value.toLowerCase())
  assert.equal(wordCount, DEFAULT_PASSPHRASE_OPTIONS.wordCount)
  assert.equal(listSize, 7776)
})

test('words come from the list', () => {
  for (let i = 0; i < 200; i += 1) {
    const { value } = generatePassphrase({ wordCount: 5, separator: ' ' }, SMALL_LIST)
    for (const word of value.split(' ')) assert.ok(SMALL_LIST.includes(word), word)
  }
})

test('separator is used between every word', () => {
  for (const separator of ['', ' ', '.', '_', '+=+']) {
    const { value } = generatePassphrase({ wordCount: 4, separator }, SMALL_LIST)
    assert.match(value, new RegExp(`^[a-z]+(${escape(separator)}[a-z]+){3}$`))
  }
})

test('casing options', () => {
  const run = (casing) => generatePassphrase({ wordCount: 4, separator: ' ', casing }, SMALL_LIST).value.split(' ')
  for (const word of run('lower')) assert.match(word, /^[a-z]+$/)
  for (const word of run('upper')) assert.match(word, /^[A-Z]+$/)
  for (const word of run('capital')) assert.match(word, /^[A-Z][a-z]+$/)
  const camel = run('camel')
  assert.match(camel[0], /^[a-z]+$/)
  for (const word of camel.slice(1)) assert.match(word, /^[A-Z][a-z]+$/)
})

test('capital casing works on hyphenated words', () => {
  const { value } = generatePassphrase({ wordCount: 3, separator: ' ', casing: 'capital' }, ['t-shirt', 'yo-yo'])
  for (const word of value.split(' ')) assert.match(word, /^[A-Z][a-z]*-[a-z]+$/)
})

test('upperOneWord turns exactly one word to uppercase', () => {
  for (let i = 0; i < 200; i += 1) {
    const words = generatePassphrase({ wordCount: 6, separator: ' ', upperOneWord: true }, SMALL_LIST).value.split(' ')
    assert.equal(words.filter((word) => /^[A-Z]+$/.test(word)).length, 1)
    assert.equal(words.filter((word) => /^[a-z]+$/.test(word)).length, 5)
  }
})

test('addDigit appends exactly one digit to one word', () => {
  for (let i = 0; i < 200; i += 1) {
    const { value } = generatePassphrase({ wordCount: 5, separator: ' ', addDigit: true }, SMALL_LIST)
    assert.equal(value.replace(/\D/g, '').length, 1)
    assert.match(value, /^([a-z]+\d? ){4}[a-z]+\d?$/)
  }
})

test('addSymbol appends exactly one symbol to one word', () => {
  const symbolClass = `[${escape(PASSPHRASE_SYMBOLS)}]`
  for (let i = 0; i < 200; i += 1) {
    const { value } = generatePassphrase({ wordCount: 5, separator: ' ', addSymbol: true }, SMALL_LIST)
    const symbols = Array.from(value).filter((char) => PASSPHRASE_SYMBOLS.includes(char))
    assert.equal(symbols.length, 1)
    assert.match(value, new RegExp(`^([a-z]+${symbolClass}? ){4}[a-z]+${symbolClass}?$`))
  }
})

test('all extras together', () => {
  const { value } = generatePassphrase(
    { wordCount: 3, separator: '-', casing: 'capital', upperOneWord: true, addDigit: true, addSymbol: true },
    SMALL_LIST,
  )
  assert.match(value, /\d/)
  assert.ok(Array.from(value).some((char) => PASSPHRASE_SYMBOLS.includes(char)))
  assert.ok(value.split('-').some((word) => /^[A-Z]{2,}/.test(word)))
})

test('invalid word counts are rejected', () => {
  for (const wordCount of [WORD_COUNT.min - 1, WORD_COUNT.max + 1, 4.5, '6']) {
    expectCode(() => generatePassphrase({ wordCount }, SMALL_LIST), ErrorCode.INVALID_LENGTH)
  }
  assert.doesNotThrow(() => generatePassphrase({ wordCount: WORD_COUNT.min }, SMALL_LIST))
  assert.doesNotThrow(() => generatePassphrase({ wordCount: WORD_COUNT.max }, SMALL_LIST))
})

test('invalid separators, casings and wordlists are rejected', () => {
  expectCode(() => generatePassphrase({ separator: '----' }, SMALL_LIST), ErrorCode.INVALID_OPTION)
  expectCode(() => generatePassphrase({ separator: '\n' }, SMALL_LIST), ErrorCode.INVALID_OPTION)
  expectCode(() => generatePassphrase({ separator: 5 }, SMALL_LIST), ErrorCode.INVALID_OPTION)
  expectCode(() => generatePassphrase({ casing: 'title' }, SMALL_LIST), ErrorCode.INVALID_OPTION)
  expectCode(() => generatePassphrase({}, ['only']), ErrorCode.INVALID_OPTION)
  expectCode(() => generatePassphrase({}, undefined), ErrorCode.INVALID_OPTION)
})

test('words are drawn uniformly (chi-square)', () => {
  const counts = new Array(SMALL_LIST.length).fill(0)
  const index = new Map(SMALL_LIST.map((word, i) => [word, i]))
  const phrases = 10_000
  const wordCount = 10
  for (let i = 0; i < phrases; i += 1) {
    for (const word of generatePassphrase({ wordCount, separator: ' ' }, SMALL_LIST).value.split(' ')) {
      counts[index.get(word)] += 1
    }
  }
  const statistic = chiSquareUniform(counts, phrases * wordCount)
  const critical = chiSquareCritical(SMALL_LIST.length - 1)
  assert.ok(statistic < critical, `chi-square ${statistic.toFixed(1)} >= ${critical.toFixed(1)}`)
})
