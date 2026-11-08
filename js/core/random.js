// Unbiased random integers on top of crypto.getRandomValues.
// There is deliberately no Math.random fallback: without a CSPRNG we refuse to generate.

const UINT32_RANGE = 2 ** 32
const POOL_SIZE = 256

export class InsecureEnvironmentError extends Error {
  constructor() {
    super('crypto.getRandomValues is not available')
    this.name = 'InsecureEnvironmentError'
  }
}

export function hasSecureRandom() {
  return typeof globalThis.crypto?.getRandomValues === 'function'
}

function cryptoFill(array) {
  if (!hasSecureRandom()) throw new InsecureEnvironmentError()
  return globalThis.crypto.getRandomValues(array)
}

/**
 * Creates a random number generator.
 * @param {(array: Uint32Array) => void} fill Fills the array with uniform 32-bit values.
 *   Defaults to crypto.getRandomValues. Tests may inject a deterministic source.
 */
export function createRng(fill = cryptoFill) {
  const pool = new Uint32Array(POOL_SIZE)
  let index = POOL_SIZE

  function nextUint32() {
    if (index >= POOL_SIZE) {
      fill(pool)
      index = 0
    }
    const value = pool[index]
    // Do not keep consumed randomness around longer than needed.
    pool[index] = 0
    index += 1
    return value
  }

  /**
   * Returns a uniform integer in [0, n) using rejection sampling, so no value is favoured.
   * @param {number} n Integer between 1 and 2^32.
   */
  function randomInt(n) {
    if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) {
      throw new RangeError(`randomInt expects an integer between 1 and 2^32, got ${n}`)
    }
    if (n === 1) return 0
    // Largest multiple of n that fits in 32 bits; values at or above it are discarded.
    const limit = UINT32_RANGE - (UINT32_RANGE % n)
    let value
    do {
      value = nextUint32()
    } while (value >= limit)
    return value % n
  }

  /** Returns a uniformly chosen element of a non-empty array. */
  function pick(items) {
    if (items.length === 0) throw new RangeError('pick expects a non-empty array')
    return items[randomInt(items.length)]
  }

  return { randomInt, pick }
}

export const defaultRng = createRng()
