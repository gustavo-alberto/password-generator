// English UI strings. Keys must match js/locales/pt-BR.js (checked by tests/i18n.test.js).
// Plural forms use the suffixes from Intl.PluralRules (_one, _other).

export default Object.freeze({
  // Document
  documentTitle: 'Password generator',
  metaDescription: 'Generate strong passwords, passphrases and PINs right in your browser. Nothing is sent or stored.',

  // Header and navigation
  skipToContent: 'Skip to content',
  appName: 'Password generator',
  language: 'Language',
  themeToDark: 'Switch to dark theme',
  themeToLight: 'Switch to light theme',
  modeLabel: 'Generation mode',
  modeRandom: 'Random',
  modePassphrase: 'Passphrase',
  modePin: 'PIN',

  // Result
  resultTitle: 'Result',
  copy: 'Copy',
  copied: 'Copied ✓',
  generate: 'Generate',
  hide: 'Hide',
  show: 'Show',
  privacy: 'Generated in your browser. Nothing is sent.',
  newSecretGenerated: 'New result generated',
  copiedAnnouncement: 'Copied to clipboard',
  bulkTitle: 'Generate several',
  optionsTitle: 'Options',

  // Strength and crack time
  strength_poor: 'Poor',
  strength_weak: 'Weak',
  strength_good: 'Good',
  strength_excellent: 'Excellent',
  bits: '{bits} bits',
  crackInstant: 'Cracked instantly*',
  crackTime: '~{time} to crack*',
  crackAssumption: '*at 10 billion guesses per second',
  unitSeconds_one: '{count} second',
  unitSeconds_other: '{count} seconds',
  unitMinutes_one: '{count} minute',
  unitMinutes_other: '{count} minutes',
  unitHours_one: '{count} hour',
  unitHours_other: '{count} hours',
  unitDays_one: '{count} day',
  unitDays_other: '{count} days',
  unitYears_one: '{count} year',
  unitYears_other: '{count} years',
  unitYearsExponent: '10{exponent} years',

  // Errors
  errCrypto: "Your browser doesn't provide secure random numbers, so nothing can be generated.",
  errCopy: "Couldn't copy. Select and copy it manually.",
  errNoGroup: 'Choose at least one character group',
  errTooShort: 'Length is smaller than the number of groups',
  errTooManyAttempts: 'These options are too restrictive. Try a longer length.',
  errInvalidLength: 'Enter a value from {min} to {max}',

  // Footer
  footerPrivacy: 'No password is sent or stored. Everything happens in your browser.',
  sourceCode: 'Source code',
  license: 'MIT License',
})
