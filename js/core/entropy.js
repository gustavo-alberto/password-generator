// Entropy, strength and crack-time estimates.
// Entropy is measured for the generator settings (how many equally likely outputs exist),
// not for a particular string, which is the meaningful measure for random secrets.

/** Strength bands used by KeePassXC. */
export const STRENGTH_LEVELS = Object.freeze([
  Object.freeze({ level: 1, key: 'poor', minBits: 0 }),
  Object.freeze({ level: 2, key: 'weak', minBits: 40 }),
  Object.freeze({ level: 3, key: 'good', minBits: 75 }),
  Object.freeze({ level: 4, key: 'excellent', minBits: 100 }),
])

/** Offline attack rate assumed for crack-time estimates (guesses per second). */
export const DEFAULT_GUESSES_PER_SECOND = 1e10

/** log2 of a positive BigInt, accurate to double precision. */
export function bigLog2(value) {
  if (typeof value !== 'bigint' || value <= 0n) throw new RangeError('bigLog2 expects a positive BigInt')
  const bits = value.toString(2).length
  if (bits <= 53) return Math.log2(Number(value))
  const shift = bits - 53
  return shift + Math.log2(Number(value >> BigInt(shift)))
}

/**
 * Entropy in bits of a random password.
 * Without the group requirement every string over the pool is valid: L · log2(N).
 * With it, the number of valid strings comes from inclusion–exclusion over the
 * (disjoint) groups: C = Σ_{S ⊆ groups} (−1)^|S| · (N − |∪S|)^L.
 * @param {{ length: number, groupSizes: number[], requireEachGroup?: boolean }} params
 */
export function passwordEntropy({ length, groupSizes, requireEachGroup = false }) {
  const poolSize = groupSizes.reduce((sum, size) => sum + size, 0)
  if (length <= 0 || poolSize <= 0) return 0
  if (!requireEachGroup || groupSizes.length <= 1) return length * Math.log2(poolSize)
  if (length < groupSizes.length) return 0

  const L = BigInt(length)
  let count = 0n
  const subsets = 1 << groupSizes.length
  for (let mask = 0; mask < subsets; mask += 1) {
    let removed = 0
    let parity = 0
    for (let i = 0; i < groupSizes.length; i += 1) {
      if (mask & (1 << i)) {
        removed += groupSizes[i]
        parity ^= 1
      }
    }
    const term = BigInt(poolSize - removed) ** L
    count += parity ? -term : term
  }
  return count > 0n ? bigLog2(count) : 0
}

/**
 * Entropy in bits of a passphrase.
 * Each extra adds the choice of position (and of the character): an uppercase word adds
 * log2(W), a digit adds log2(W) + log2(10), a symbol adds log2(W) + log2(symbols).
 * Collisions between choices (for example the same word drawn twice) are ignored, so
 * the extras are a slight overestimate; the base W · log2(list) is exact.
 */
export function passphraseEntropy({
  wordCount,
  listSize,
  casing = 'lower',
  upperOneWord = false,
  addDigit = false,
  addSymbol = false,
  symbolCount = 8,
}) {
  if (wordCount <= 0 || listSize <= 1) return 0
  const position = Math.log2(wordCount)
  let bits = wordCount * Math.log2(listSize)
  // Uppercasing one word changes nothing when every word is already uppercase.
  if (upperOneWord && casing !== 'upper') bits += position
  if (addDigit) bits += position + Math.log2(10)
  if (addSymbol) bits += position + Math.log2(symbolCount)
  return bits
}

/** Entropy in bits of a numeric PIN. */
export function pinEntropy(length) {
  return length > 0 ? length * Math.log2(10) : 0
}

/** Maps bits to a KeePassXC strength band. */
export function strengthFor(bits) {
  let result = STRENGTH_LEVELS[0]
  for (const band of STRENGTH_LEVELS) if (bits >= band.minBits) result = band
  return result
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const YEAR = 365.25 * DAY
/** Above this many years the estimate is shown as a power of ten. */
const EXPONENT_THRESHOLD_YEARS = 1e6

/**
 * Average time to guess the secret by brute force: half the space, 2^(bits − 1) guesses.
 * Works in log10 so it never overflows, even for hundreds of bits.
 * @returns {{ unit: 'instant'|'seconds'|'minutes'|'hours'|'days'|'years', value?: number, exponent?: number }}
 */
export function crackTime(bits, guessesPerSecond = DEFAULT_GUESSES_PER_SECOND) {
  const log10Seconds = (bits - 1) * Math.log10(2) - Math.log10(guessesPerSecond)
  if (bits <= 0 || log10Seconds < 0) return { unit: 'instant' }

  const log10Years = log10Seconds - Math.log10(YEAR)
  if (log10Years >= Math.log10(EXPONENT_THRESHOLD_YEARS)) {
    return { unit: 'years', exponent: Math.floor(log10Years) }
  }

  const seconds = 10 ** log10Seconds
  if (seconds < MINUTE) return { unit: 'seconds', value: Math.round(seconds) }
  if (seconds < HOUR) return { unit: 'minutes', value: Math.round(seconds / MINUTE) }
  if (seconds < DAY) return { unit: 'hours', value: Math.round(seconds / HOUR) }
  if (seconds < YEAR) return { unit: 'days', value: Math.round(seconds / DAY) }
  return { unit: 'years', value: Math.round(seconds / YEAR) }
}
