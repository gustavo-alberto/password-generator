// Small statistics helpers for distribution tests.

/** Pearson chi-square statistic for observed counts against a uniform expectation. */
export function chiSquareUniform(counts, total) {
  const expected = total / counts.length
  let sum = 0
  for (const observed of counts) sum += (observed - expected) ** 2 / expected
  return sum
}

/**
 * Upper critical value of the chi-square distribution (Wilson–Hilferty approximation).
 * z = 4.265 corresponds to p ≈ 1e-5, so a correct generator fails about once in 100,000 runs.
 */
export function chiSquareCritical(degreesOfFreedom, z = 4.265) {
  const k = degreesOfFreedom
  return k * (1 - 2 / (9 * k) + z * Math.sqrt(2 / (9 * k))) ** 3
}

/** Fill function that replays the given 32-bit values, then repeats the last one. */
export function scriptedFill(values) {
  let i = 0
  return (array) => {
    for (let j = 0; j < array.length; j += 1) {
      array[j] = values[Math.min(i, values.length - 1)]
      i += 1
    }
  }
}
