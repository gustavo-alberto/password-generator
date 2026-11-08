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

## License

[MIT](LICENSE) © Gustavo Alberto
