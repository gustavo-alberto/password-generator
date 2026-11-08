// Numeric PIN generator.

import { defaultRng } from './random.js'
import { DIGITS } from './charsets.js'
import { ErrorCode, GeneratorError } from './errors.js'

export const PIN_LENGTH = Object.freeze({ min: 4, max: 32, default: 6, recommendedMin: 6 })

/**
 * Generates a PIN of uniformly distributed digits.
 * @returns {{ value: string, poolSize: number }}
 */
export function generatePin(length = PIN_LENGTH.default, rng = defaultRng) {
  if (!Number.isInteger(length) || length < PIN_LENGTH.min || length > PIN_LENGTH.max) {
    throw new GeneratorError(
      ErrorCode.INVALID_LENGTH,
      `Length must be an integer from ${PIN_LENGTH.min} to ${PIN_LENGTH.max}`,
    )
  }
  let value = ''
  for (let i = 0; i < length; i += 1) value += DIGITS[rng.randomInt(DIGITS.length)]
  return { value, poolSize: DIGITS.length }
}
