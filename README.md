# password-generator

Password, passphrase and PIN generator that runs entirely in your browser. Nothing is sent, nothing is stored.

**Use it:** https://gustavo-alberto.github.io/password-generator/

Available in English and Brazilian Portuguese, with light and dark themes. It works offline after the first visit.

## Features

**Random passwords** (inspired by KeePassXC)

- Length from 4 to 128 characters.
- Uppercase, lowercase, digits and symbols. Symbols are split into six groups: brackets, punctuation, quotes, dashes and slashes, math, and logograms.
- Optional extended ASCII (Latin-1).
- Exclude look-alike characters (`I l 1 | O 0`), add your own characters, or exclude specific ones.
- "At least one from each group", enforced by redrawing the whole password, so every valid password stays equally likely.

**Passphrases**

- 3 to 20 words from a 7776-word list in the interface language: EFF in English, drebs in Brazilian Portuguese.
- Any separator up to 3 characters, and lowercase, UPPERCASE, Capitalized or camelCase format.
- Optional extras: one word in UPPERCASE, one digit, one symbol.

**PINs**

- 4 to 32 digits.

**For every mode**

- Strength meter with entropy in bits, using the KeePassXC bands: poor below 40 bits, weak below 75, good below 100, excellent from 100.
- Estimated time to crack, assuming 10 billion guesses per second.
- Digits and symbols are colored for readability.
- Hide/show the result.
- Copy with clear feedback.
- Generate a list of 5, 10, 25 or 50 at once.

## Principles

- **Nothing leaves the browser.** No backend, no login, no analytics, no network requests. The page's Content Security Policy blocks outgoing connections (`connect-src 'none'`).
- **Nothing is stored.** Only interface preferences (mode, options, language and theme) are kept in `localStorage`. Generated passwords are never saved.
- **Cryptographic, unbiased randomness.** Every draw uses `crypto.getRandomValues` with rejection sampling. There is no `Math.random` fallback.
- **Zero dependencies.** Plain HTML, CSS and JavaScript (ES modules), no build step. The published code is the repository code.

### Security notes

- The Content Security Policy is set with a `<meta>` tag: no inline scripts or styles, no remote origins, no network connections. GitHub Pages does not allow custom HTTP headers, so `frame-ancestors` (clickjacking protection) cannot be set. The page holds no session or account, which keeps that risk low.
- Generated values are inserted with `textContent`, never parsed as HTML.
- The entropy shown describes the generator settings (how many equally likely results exist), not a guess at how a given string looks. It is the meaningful measure for random secrets.
- `tests/security.test.js` checks the CSP, the absence of inline code, `innerHTML`, `eval` and network APIs, and the `rel` attributes of external links.

## Deploying to GitHub Pages

The repository root is the site. There is nothing to build.

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the `main` branch and the `/ (root)` folder, then save.

The empty `.nojekyll` file tells Pages to serve the files as they are, without Jekyll processing. All paths are relative, so the app works under `/password-generator/`.

## Running locally

Requires Node.js 20 or later. Nothing to install.

```bash
npm run serve
```

Open `http://127.0.0.1:8080/`. To use another port: `node scripts/serve.mjs 3000`.

> Opening `index.html` straight from disk (`file://`) does not work, because ES modules require an HTTP server.

## Offline use

After the first visit, a service worker (`sw.js`) keeps every app file in the browser cache, so the generator also works without a connection. It can be installed as an app from the browser menu.

On `localhost` the service worker stays off, so local edits show up immediately. Add `?sw` to the URL (`http://127.0.0.1:8080/?sw`) to test offline mode locally.

### Releasing a change

1. Bump `CACHE_VERSION` in `sw.js`. Otherwise returning visitors keep the previous files.
2. Add any new app file to `PRECACHE` in `sw.js`. `npm test` fails when one is missing.

## Regenerating assets

- Wordlists: `node scripts/build-wordlist.mjs <en-eff|pt-br-drebs> <input.txt>`.
- Icons: `node scripts/build-icons.mjs` renders the PNG icons from the padlock in `icons/icon.svg`.

## Tests

```bash
npm test
```

Uses Node's built-in test runner (`node --test`), no dependencies. The suite covers generators, chi-square uniformity checks, entropy (cross-checked by brute force), wordlists, i18n, storage, precache coverage and static security rules.

## Project structure

```
index.html            page and CSP
sw.js                 offline cache
css/                  styles and @font-face
js/core/              generators, entropy, wordlists (no DOM, tested in Node)
js/ui/                result area, option panels, bulk list
js/locales/           en and pt-BR strings
js/wordlists/         generated wordlist modules
scripts/              local server, wordlist and icon builders
tests/                node:test suites
```

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
