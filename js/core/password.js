// Random password generator (KeePassXC-style options).

import { defaultRng } from './random.js'
import {
  UPPERCASE,
  LOWERCASE,
  DIGITS,
  SYMBOL_GROUPS,
  SYMBOL_GROUP_IDS,
  LOOK_ALIKES,
  EXTENDED_ASCII,
} from './charsets.js'
import { ErrorCode, GeneratorError } from './errors.js'

export const PASSWORD_LENGTH = Object.freeze({ min: 4, max: 128, default: 20 })

/**
 * Upper bound on full-password retries when every group is required.
 * Only reachable with extreme settings (for example a one-character custom group
 * next to a huge pool at minimum length); the UI then asks for a longer password.
 */
export const MAX_ATTEMPTS = 100_000

export const DEFAULT_PASSWORD_OPTIONS = Object.freeze({
  length: PASSWORD_LENGTH.default,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  symbolGroups: Object.freeze(Object.fromEntries(SYMBOL_GROUP_IDS.map((id) => [id, true]))),
  extended: false,
  excludeLookAlikes: true,
  include: '',
  exclude: '',
  requireEachGroup: true,
})

/** Splits a string into code points, dropping whitespace and control/format characters. */
function toChars(text) {
  return Array.from(text ?? '').filter((char) => !/[\s\p{C}]/u.test(char))
}

/**
 * Resolves options into disjoint, non-empty character groups.
 * Exclusions apply to every group; a character shared by two groups stays in the first one.
 * @returns {{ id: string, chars: string[] }[]}
 */
export function buildGroups(options) {
  const opts = { ...DEFAULT_PASSWORD_OPTIONS, ...options }
  const symbolGroups = { ...DEFAULT_PASSWORD_OPTIONS.symbolGroups, ...options?.symbolGroups }

  const candidates = []
  if (opts.uppercase) candidates.push({ id: 'uppercase', text: UPPERCASE })
  if (opts.lowercase) candidates.push({ id: 'lowercase', text: LOWERCASE })
  if (opts.digits) candidates.push({ id: 'digits', text: DIGITS })
  if (opts.symbols) {
    const text = SYMBOL_GROUP_IDS.filter((id) => symbolGroups[id])
      .map((id) => SYMBOL_GROUPS[id])
      .join('')
    candidates.push({ id: 'symbols', text })
  }
  if (opts.extended) candidates.push({ id: 'extended', text: EXTENDED_ASCII })
  if (opts.include) candidates.push({ id: 'include', text: opts.include })

  const excluded = new Set(toChars(opts.exclude))
  if (opts.excludeLookAlikes) for (const char of LOOK_ALIKES) excluded.add(char)

  const seen = new Set()
  const groups = []
  for (const { id, text } of candidates) {
    const chars = []
    for (const char of toChars(text)) {
      if (excluded.has(char) || seen.has(char)) continue
      seen.add(char)
      chars.push(char)
    }
    if (chars.length > 0) groups.push({ id, chars })
  }
  return groups
}

function assertLength(length, { min, max }) {
  if (!Number.isInteger(length) || length < min || length > max) {
    throw new GeneratorError(ErrorCode.INVALID_LENGTH, `Length must be an integer from ${min} to ${max}`)
  }
}

/**
 * Generates a random password.
 * With `requireEachGroup`, whole passwords are redrawn until every group is present
 * (rejection), which keeps the result uniform over all valid passwords.
 * @returns {{ value: string, groups: { id: string, size: number }[], poolSize: number }}
 */
export function generatePassword(options = {}, rng = defaultRng) {
  const opts = { ...DEFAULT_PASSWORD_OPTIONS, ...options }
  assertLength(opts.length, PASSWORD_LENGTH)

  const groups = buildGroups(opts)
  if (groups.length === 0) {
    throw new GeneratorError(ErrorCode.NO_GROUPS, 'No characters available with the current options')
  }
  if (opts.requireEachGroup && opts.length < groups.length) {
    throw new GeneratorError(
      ErrorCode.TOO_SHORT_FOR_GROUPS,
      `Length ${opts.length} is smaller than the ${groups.length} required groups`,
    )
  }

  const pool = groups.flatMap((group) => group.chars)
  const groupOf = new Map()
  groups.forEach((group, index) => group.chars.forEach((char) => groupOf.set(char, index)))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const chars = Array.from({ length: opts.length }, () => pool[rng.randomInt(pool.length)])
    if (!opts.requireEachGroup || coversAllGroups(chars, groupOf, groups.length)) {
      return {
        value: chars.join(''),
        groups: groups.map(({ id, chars: groupChars }) => ({ id, size: groupChars.length })),
        poolSize: pool.length,
      }
    }
  }
  throw new GeneratorError(ErrorCode.TOO_MANY_ATTEMPTS, 'Could not satisfy every group; try a longer length')
}

function coversAllGroups(chars, groupOf, groupCount) {
  const found = new Set()
  for (const char of chars) {
    found.add(groupOf.get(char))
    if (found.size === groupCount) return true
  }
  return false
}
