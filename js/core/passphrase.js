// Diceware-style passphrase generator.

import { defaultRng } from './random.js'
import { DIGITS } from './charsets.js'
import { ErrorCode, GeneratorError } from './errors.js'

export const WORD_COUNT = Object.freeze({ min: 3, max: 20, default: 6 })
export const SEPARATOR_MAX_LENGTH = 3

/** Symbols that may be appended to a word. */
export const PASSPHRASE_SYMBOLS = '!@#$%&*?'

export const CASINGS = Object.freeze(['lower', 'upper', 'capital', 'camel'])

export const DEFAULT_PASSPHRASE_OPTIONS = Object.freeze({
  wordCount: WORD_COUNT.default,
  separator: '-',
  casing: 'lower',
  upperOneWord: false,
  addDigit: false,
  addSymbol: false,
})

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function applyCasing(words, casing) {
  switch (casing) {
    case 'lower':
      return words.map((word) => word.toLowerCase())
    case 'upper':
      return words.map((word) => word.toUpperCase())
    case 'capital':
      return words.map((word) => capitalize(word.toLowerCase()))
    case 'camel':
      return words.map((word, i) => (i === 0 ? word.toLowerCase() : capitalize(word.toLowerCase())))
    default:
      throw new GeneratorError(ErrorCode.INVALID_OPTION, `Unknown casing "${casing}"`)
  }
}

/**
 * Generates a passphrase from a wordlist.
 * Words are drawn independently and uniformly (with repetition), as in diceware.
 * Optional extras, applied in this order: one word in UPPERCASE, a digit appended to a
 * random word, a symbol appended to a random word.
 * @param {object} options
 * @param {readonly string[]} wordlist
 * @returns {{ value: string, wordCount: number, listSize: number }}
 */
export function generatePassphrase(options, wordlist, rng = defaultRng) {
  const opts = { ...DEFAULT_PASSPHRASE_OPTIONS, ...options }
  const { wordCount, separator } = opts

  if (!Number.isInteger(wordCount) || wordCount < WORD_COUNT.min || wordCount > WORD_COUNT.max) {
    throw new GeneratorError(
      ErrorCode.INVALID_LENGTH,
      `Word count must be an integer from ${WORD_COUNT.min} to ${WORD_COUNT.max}`,
    )
  }
  if (typeof separator !== 'string' || Array.from(separator).length > SEPARATOR_MAX_LENGTH || /\p{C}/u.test(separator)) {
    throw new GeneratorError(
      ErrorCode.INVALID_OPTION,
      `Separator must be at most ${SEPARATOR_MAX_LENGTH} printable characters`,
    )
  }
  if (!Array.isArray(wordlist) || wordlist.length < 2) {
    throw new GeneratorError(ErrorCode.INVALID_OPTION, 'Wordlist must contain at least two words')
  }

  const picked = Array.from({ length: wordCount }, () => wordlist[rng.randomInt(wordlist.length)])
  const words = applyCasing(picked, opts.casing)

  if (opts.upperOneWord) {
    const index = rng.randomInt(words.length)
    words[index] = words[index].toUpperCase()
  }
  if (opts.addDigit) {
    words[rng.randomInt(words.length)] += DIGITS[rng.randomInt(DIGITS.length)]
  }
  if (opts.addSymbol) {
    words[rng.randomInt(words.length)] += PASSPHRASE_SYMBOLS[rng.randomInt(PASSPHRASE_SYMBOLS.length)]
  }

  return { value: words.join(separator), wordCount, listSize: wordlist.length }
}
