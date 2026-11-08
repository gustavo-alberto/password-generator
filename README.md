# password-generator

Password, passphrase and PIN generator that runs entirely in your browser. Nothing is sent, nothing is stored.

> **Status:** in development.

## Principles

- **Nothing leaves the browser.** No backend, no login, no analytics, no network requests. The page's Content Security Policy blocks outgoing connections (`connect-src 'none'`).
- **Nothing is stored.** Only interface preferences (mode, options, language and theme) are kept in `localStorage`. Generated passwords are never saved.
- **Cryptographic, unbiased randomness.** Every draw uses `crypto.getRandomValues` with rejection sampling. There is no `Math.random` fallback.
- **Zero dependencies.** Plain HTML, CSS and JavaScript (ES modules), no build step. The published code is the repository code.

## Running locally

Requires Node.js 20 or later. Nothing to install.

```bash
npm run serve
```

Open `http://127.0.0.1:8080/`. To use another port: `node scripts/serve.mjs 3000`.

> Opening `index.html` straight from disk (`file://`) does not work, because ES modules require an HTTP server.

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`), no dependencies.

## Credits

Passphrases use these wordlists (7776 words each, about 12.9 bits of entropy per word):

| Language | Wordlist | Author | License |
|---|---|---|---|
| English | [EFF Large Wordlist for Passphrases](https://www.eff.org/dice) | Electronic Frontier Foundation | [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/) |
| Portuguese (Brazil) | [wordlist_pt-br.txt](https://github.com/ulif/diceware/blob/master/diceware/wordlists/wordlist_pt-br.txt), from the [diceware](https://github.com/ulif/diceware) project | drebs | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |

Changes made to the lists:

- Both lists were converted to JavaScript modules (`js/wordlists/`) by [`scripts/build-wordlist.mjs`](scripts/build-wordlist.mjs).
- In the Portuguese list, 10 offensive or violent words were replaced in place by neutral words that were not already in the list. This keeps the size at 7776 and the entropy per word unchanged. The full mapping is in `scripts/build-wordlist.mjs`.

### Fonts

Both fonts are self-hosted in `fonts/` (variable, latin subset) and licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/):

- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), by The JetBrains Mono Project Authors, for generated passwords. See `fonts/OFL-JetBrainsMono.txt`.
- [Space Grotesk](https://github.com/floriankarsten/space-grotesk), by The Space Grotesk Project Authors, for the interface. See `fonts/OFL-SpaceGrotesk.txt`.

## License

The code is under the [MIT](LICENSE) license © Gustavo Alberto. The wordlists and fonts keep their own licenses, listed above.
