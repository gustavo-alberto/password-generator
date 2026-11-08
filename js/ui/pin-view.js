// Options panel for the PIN mode.

import { generatePin, PIN_LENGTH } from '../core/pin.js'
import { pinEntropy } from '../core/entropy.js'
import { savePrefs } from '../storage.js'
import { bindRangeNumber, savedInteger } from './controls.js'

export function createPinView({ result, saved }) {
  const panel = document.getElementById('panel-pin')
  const warning = document.getElementById('pin-warning')
  const state = { length: savedInteger(saved?.length, PIN_LENGTH, PIN_LENGTH.default) }
  let active = false

  const renderLength = bindRangeNumber({
    range: document.getElementById('pin-length'),
    number: document.getElementById('pin-length-number'),
    min: PIN_LENGTH.min,
    max: PIN_LENGTH.max,
    onChange: (length) => {
      if (length === state.length) return
      state.length = length
      render()
      savePrefs({ pin: state })
      generate()
    },
  })

  function render() {
    renderLength(state.length)
    warning.hidden = state.length >= PIN_LENGTH.recommendedMin
  }

  function generate() {
    if (!active) return
    const { value } = generatePin(state.length)
    result.show({ value, bits: pinEntropy(state.length) })
  }

  render()

  return {
    panel,
    generate,
    generateMany: (count) => Array.from({ length: count }, () => generatePin(state.length).value),
    activate() {
      active = true
      generate()
    },
    deactivate() {
      active = false
    },
    refreshLabels() {},
  }
}
