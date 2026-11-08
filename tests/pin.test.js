import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePin, PIN_LENGTH } from '../js/core/pin.js'
import { ErrorCode } from '../js/core/errors.js'
import { chiSquareCritical, chiSquareUniform } from './helpers/stats.js'

test('default PIN has 6 digits', () => {
  const { value, poolSize } = generatePin()
  assert.match(value, /^\d{6}$/)
  assert.equal(poolSize, 10)
})

test('PIN length follows the requested size', () => {
  for (let length = PIN_LENGTH.min; length <= PIN_LENGTH.max; length += 1) {
    assert.match(generatePin(length).value, new RegExp(`^\\d{${length}}$`))
  }
})

test('invalid PIN lengths are rejected', () => {
  for (const length of [3, 33, 6.5, NaN, '6']) {
    assert.throws(
      () => generatePin(length),
      (error) => error.code === ErrorCode.INVALID_LENGTH,
    )
  }
})

test('PIN digits are uniformly distributed (chi-square)', () => {
  const counts = new Array(10).fill(0)
  const pins = 20_000
  const length = 10
  for (let i = 0; i < pins; i += 1) {
    for (const digit of generatePin(length).value) counts[Number(digit)] += 1
  }
  const statistic = chiSquareUniform(counts, pins * length)
  const critical = chiSquareCritical(9)
  assert.ok(statistic < critical, `chi-square ${statistic.toFixed(1)} >= ${critical.toFixed(1)}`)
})
