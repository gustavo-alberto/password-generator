// Character sets used by the random password generator.
// Symbol subgroups follow KeePassXC; together they cover all 32 printable ASCII symbols.

export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
export const DIGITS = '0123456789'

export const SYMBOL_GROUPS = Object.freeze({
  braces: '()[]{}',
  punctuation: '.,:;',
  quotes: '"\'',
  dashes: '\\/|_-',
  math: '<>*+!?=',
  logograms: '#$%&@^`~',
})

export const SYMBOL_GROUP_IDS = Object.freeze(Object.keys(SYMBOL_GROUPS))

/** Characters that are easy to confuse with each other. */
export const LOOK_ALIKES = 'Il1|O0'

/** Printable Latin-1 supplement: U+00A1 to U+00FF, minus the invisible soft hyphen (U+00AD). */
export const EXTENDED_ASCII = (() => {
  let chars = ''
  for (let code = 0xa1; code <= 0xff; code += 1) {
    if (code !== 0xad) chars += String.fromCharCode(code)
  }
  return chars
})()
