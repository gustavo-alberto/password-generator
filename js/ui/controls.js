// Small helpers shared by the option panels.

/**
 * Keeps a range slider and a number field in sync.
 * Valid values typed in the number field apply immediately; anything else is clamped on commit.
 * @param {{ range: HTMLInputElement, number: HTMLInputElement, min: number, max: number,
 *           onChange: (value: number) => void }} params
 * @returns {(value: number) => void} Renders a value into both controls.
 */
export function bindRangeNumber({ range, number, min, max, onChange }) {
  for (const input of [range, number]) {
    input.min = String(min)
    input.max = String(max)
    input.step = '1'
  }

  const clamp = (value) => Math.min(max, Math.max(min, value))
  let current = Number(range.value)

  function render(value) {
    current = value
    range.value = String(value)
    number.value = String(value)
  }

  function commit(value) {
    if (!Number.isFinite(value)) {
      render(current)
      return
    }
    const next = clamp(Math.round(value))
    render(next)
    onChange(next)
  }

  range.addEventListener('input', () => commit(Number(range.value)))
  number.addEventListener('input', () => {
    const value = Number(number.value)
    if (number.value !== '' && Number.isInteger(value) && value >= min && value <= max) commit(value)
  })
  number.addEventListener('change', () => commit(number.value === '' ? NaN : Number(number.value)))

  return render
}

/** Clamps an integer from saved prefs, or returns the fallback. */
export function savedInteger(value, { min, max }, fallback) {
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback
}
