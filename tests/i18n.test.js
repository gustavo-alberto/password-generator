import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DICTIONARIES,
  detectLanguage,
  formatCrackTime,
  normalizeLanguage,
  setLanguage,
  getLanguage,
  t,
  toSuperscript,
} from '../js/i18n.js'
import { crackTime } from '../js/core/entropy.js'

test('every language has exactly the same keys', () => {
  const [reference, ...others] = Object.entries(DICTIONARIES)
  const referenceKeys = Object.keys(reference[1]).sort()
  for (const [language, dictionary] of others) {
    assert.deepEqual(Object.keys(dictionary).sort(), referenceKeys, `${language} differs from ${reference[0]}`)
  }
})

test('no translation is empty and placeholders match across languages', () => {
  const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort()
  for (const key of Object.keys(DICTIONARIES.en)) {
    for (const dictionary of Object.values(DICTIONARIES)) {
      assert.ok(dictionary[key].trim().length > 0, `${key} is empty`)
      assert.deepEqual(placeholders(dictionary[key]), placeholders(DICTIONARIES.en[key]), `placeholders of ${key}`)
    }
  }
})

test('normalizeLanguage maps tags to supported languages', () => {
  assert.equal(normalizeLanguage('pt-BR'), 'pt-BR')
  assert.equal(normalizeLanguage('pt'), 'pt-BR')
  assert.equal(normalizeLanguage('pt-PT'), 'pt-BR')
  assert.equal(normalizeLanguage('PT-br'), 'pt-BR')
  assert.equal(normalizeLanguage('en-GB'), 'en')
  assert.equal(normalizeLanguage('de'), null)
  assert.equal(normalizeLanguage(''), null)
  assert.equal(normalizeLanguage(undefined), null)
})

test('detectLanguage prefers saved, then browser, then English', () => {
  assert.equal(detectLanguage('en', ['pt-BR']), 'en')
  assert.equal(detectLanguage(undefined, ['de-DE', 'pt-BR', 'en']), 'pt-BR')
  assert.equal(detectLanguage(undefined, ['fr', 'de']), 'en')
  assert.equal(detectLanguage('xx', []), 'en')
})

test('t interpolates params and falls back to the key', () => {
  assert.equal(t('bits', { bits: 77 }, 'en'), '77 bits')
  assert.equal(t('errInvalidLength', { min: 4, max: 128 }, 'pt-BR'), 'Informe um valor de 4 a 128')
  assert.equal(t('missing.key', {}, 'en'), 'missing.key')
  assert.equal(t('bits', {}, 'en'), '{bits} bits')
  // Prototype keys are not translations.
  assert.equal(t('toString', {}, 'en'), 'toString')
})

test('t picks plural forms and formats counts per locale', () => {
  assert.equal(t('unitYears', { count: 1 }, 'en'), '1 year')
  assert.equal(t('unitYears', { count: 2 }, 'en'), '2 years')
  assert.equal(t('unitYears', { count: 1 }, 'pt-BR'), '1 ano')
  assert.equal(t('unitYears', { count: 250000 }, 'en'), '250,000 years')
  assert.equal(t('unitYears', { count: 250000 }, 'pt-BR'), '250.000 anos')
})

test('formatCrackTime renders every unit', () => {
  assert.equal(formatCrackTime(crackTime(10), 'en'), 'Cracked instantly*')
  assert.equal(formatCrackTime(crackTime(36), 'en'), '~3 seconds to crack*')
  assert.equal(formatCrackTime(crackTime(48), 'pt-BR'), '~4 horas para quebrar*')
  assert.equal(formatCrackTime(crackTime(64), 'en'), '~29 years to crack*')
  assert.equal(formatCrackTime(crackTime(131.09), 'pt-BR'), '~10²¹ anos para quebrar*')
})

test('toSuperscript converts digits', () => {
  assert.equal(toSuperscript(1234567890), '¹²³⁴⁵⁶⁷⁸⁹⁰')
})

test('setLanguage works without a DOM and normalizes the tag', () => {
  assert.equal(setLanguage('pt', { persist: false }), 'pt-BR')
  assert.equal(getLanguage(), 'pt-BR')
  assert.equal(setLanguage('xx', { persist: false }), 'en')
  assert.equal(getLanguage(), 'en')
})
