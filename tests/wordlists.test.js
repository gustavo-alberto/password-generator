import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadWordlist, WORDLIST_LANGUAGES } from '../js/core/wordlists.js'

const EXPECTED = {
  en: { id: 'en-eff', pattern: /^[a-z]+(-[a-z]+)*$/, first: 'abacus', last: 'zoom' },
  'pt-BR': { id: 'pt-br-drebs', pattern: /^[a-z]+$/, first: 'abacate', last: null },
}

test('both UI languages have a wordlist', () => {
  assert.deepEqual([...WORDLIST_LANGUAGES].sort(), ['en', 'pt-BR'])
})

for (const [language, expected] of Object.entries(EXPECTED)) {
  test(`${language} wordlist has 7776 unique, well-formed words`, async () => {
    const { words, meta } = await loadWordlist(language)
    assert.equal(words.length, 7776)
    assert.equal(new Set(words).size, 7776)
    assert.equal(meta.id, expected.id)
    assert.equal(meta.size, 7776)
    assert.ok(meta.author && meta.sourceUrl && meta.license && meta.licenseUrl)
    for (const word of words) assert.match(word, expected.pattern)
    assert.equal(words[0], expected.first)
    if (expected.last) assert.equal(words.at(-1), expected.last)
    assert.ok(Object.isFrozen(words))
  })
}

test('pt-BR wordlist has no accents and none of the replaced words', async () => {
  const { words } = await loadWordlist('pt-BR')
  for (const word of words) assert.ok(!/[^\x00-\x7f]/.test(word), `${word} has non-ASCII characters`)
  for (const removed of ['boceta', 'bosta', 'cacete', 'corno', 'escroto', 'estupro', 'idiota', 'merda', 'puta', 'racista']) {
    assert.ok(!words.includes(removed), `${removed} is still in the list`)
  }
})

test('unknown languages fall back to English', async () => {
  const { meta } = await loadWordlist('de')
  assert.equal(meta.id, 'en-eff')
})

test('loading the same list twice returns the cached result', async () => {
  assert.equal(await loadWordlist('en'), await loadWordlist('en'))
})
