// Converts a plain-text wordlist into an ES module under js/wordlists/.
// Usage: node scripts/build-wordlist.mjs <list-id> <input.txt>
//
// Each input line may be "word" or "11111<TAB>word" (diceware format); the last token is used.
// Words and their order are kept as published, except for the explicit replacements below.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const EXPECTED_SIZE = 7776

const LISTS = {
  'en-eff': {
    language: 'en',
    name: 'EFF Large Wordlist for Passphrases',
    author: 'Electronic Frontier Foundation',
    sourceUrl: 'https://www.eff.org/dice',
    license: 'CC BY 3.0 US',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/',
    wordPattern: /^[a-z]+(-[a-z]+)*$/,
  },
  'pt-br-drebs': {
    language: 'pt-BR',
    name: 'Brazilian Portuguese diceware wordlist (wordlist_pt-br.txt)',
    author: 'drebs',
    sourceUrl: 'https://github.com/ulif/diceware/blob/master/diceware/wordlists/wordlist_pt-br.txt',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    wordPattern: /^[a-z]+$/,
    // Offensive or violent words replaced in place by neutral words that are not in the list,
    // so the size (7776) and the entropy per word stay the same.
    replacements: {
      boceta: 'girassol',
      bosta: 'tucano',
      cacete: 'cafezal',
      corno: 'carambola',
      escroto: 'berimbau',
      estupro: 'cajueiro',
      idiota: 'quindim',
      merda: 'cocada',
      puta: 'aipim',
      racista: 'arara',
    },
  },
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

const [listId, inputPath] = process.argv.slice(2)
const list = LISTS[listId]
if (!list || !inputPath) {
  fail(`usage: node scripts/build-wordlist.mjs <${Object.keys(LISTS).join('|')}> <input.txt>`)
}

const replacements = list.replacements ?? {}
const words = (await readFile(inputPath, 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/).at(-1))
  .filter(Boolean)

for (const [from, to] of Object.entries(replacements)) {
  const index = words.indexOf(from)
  if (index === -1) fail(`replacement source "${from}" not found`)
  if (words.includes(to)) fail(`replacement target "${to}" is already in the list`)
  words[index] = to
}

if (words.length !== EXPECTED_SIZE) fail(`expected ${EXPECTED_SIZE} words, found ${words.length}`)
if (new Set(words).size !== words.length) fail('wordlist contains duplicates')
const invalid = words.filter((word) => !list.wordPattern.test(word))
if (invalid.length > 0) fail(`unexpected characters in: ${invalid.slice(0, 10).join(', ')}`)

const WORDS_PER_LINE = 10
const lines = []
for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
  lines.push(words.slice(i, i + WORDS_PER_LINE).join(' '))
}

const meta = {
  id: listId,
  language: list.language,
  name: list.name,
  author: list.author,
  sourceUrl: list.sourceUrl,
  license: list.license,
  licenseUrl: list.licenseUrl,
  size: words.length,
}

const replacedCount = Object.keys(replacements).length
const changes =
  replacedCount === 0
    ? 'converted to a JavaScript module by scripts/build-wordlist.mjs; words and order unchanged.'
    : `converted to a JavaScript module by scripts/build-wordlist.mjs; ${replacedCount} offensive words\n//          replaced in place by neutral words (see LISTS in that script); order otherwise unchanged.`

const output = `// ${list.name}
// Author: ${list.author}
// Source: ${list.sourceUrl}
// License: ${list.license} (${list.licenseUrl})
// Changes: ${changes}
// Generated file, do not edit by hand.

export const meta = Object.freeze(${JSON.stringify(meta, null, 2)})

const WORDS = \`
${lines.join('\n')}
\`

export default Object.freeze(WORDS.trim().split(/\\s+/))
`

const outputPath = fileURLToPath(new URL(`../js/wordlists/${listId}.js`, import.meta.url))
await writeFile(outputPath, output)
console.log(`wrote ${words.length} words to ${outputPath}`)
