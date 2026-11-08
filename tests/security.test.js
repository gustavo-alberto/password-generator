// Static checks that keep the security guarantees from regressing.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

async function appScripts() {
  const files = (await readdir(join(ROOT, 'js'), { recursive: true }))
    .filter((file) => file.endsWith('.js'))
    .map((file) => join('js', file))
  files.push('sw.js')
  return Promise.all(files.map(async (file) => ({ file, source: await readFile(join(ROOT, file), 'utf8') })))
}

test('scripts never parse HTML strings or evaluate code', async () => {
  const forbidden = [
    /\.innerHTML\s*=/,
    /\.outerHTML\s*=/,
    /insertAdjacentHTML/,
    /document\.write/,
    /\beval\s*\(/,
    /new\s+Function\s*\(/,
    /setTimeout\s*\(\s*['"`]/,
  ]
  for (const { file, source } of await appScripts()) {
    for (const pattern of forbidden) assert.ok(!pattern.test(source), `${file} matches ${pattern}`)
  }
})

test('scripts make no network requests', async () => {
  const forbidden = [/\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bEventSource\b/, /sendBeacon/, /\bfetch\s*\(/]
  for (const { file, source } of await appScripts()) {
    // The service worker may fetch the app's own files to cache them.
    if (file === 'sw.js') continue
    for (const pattern of forbidden) assert.ok(!pattern.test(source), `${file} matches ${pattern}`)
  }
})

test('index.html has a strict CSP and no inline code', async () => {
  const html = await readFile(join(ROOT, 'index.html'), 'utf8')
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)
  assert.ok(csp, 'CSP meta tag missing')
  const policy = csp[1]
  for (const directive of [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]) {
    assert.ok(policy.includes(directive), `CSP lacks ${directive}`)
  }
  assert.ok(!/unsafe-inline|unsafe-eval|https?:/.test(policy), 'CSP allows inline code, eval or remote origins')

  assert.ok(html.includes('<meta name="referrer" content="no-referrer"'), 'referrer policy missing')
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'inline <script> found')
  assert.ok(!/<style\b/.test(html), 'inline <style> found')
  assert.ok(!/\sstyle=/.test(html), 'style attribute found')
  assert.ok(!/\son[a-z]+=/.test(html), 'inline event handler found')
})

test('external links do not leak the opener or referrer', async () => {
  const html = await readFile(join(ROOT, 'index.html'), 'utf8')
  for (const [anchor] of html.matchAll(/<a\s[^>]*href="https?:[^"]*"[^>]*>/g)) {
    assert.match(anchor, /rel="[^"]*noopener[^"]*noreferrer[^"]*"/, anchor)
  }
})

test('stylesheets load nothing from other origins', async () => {
  for (const file of ['css/style.css', 'css/fonts.css']) {
    const css = await readFile(join(ROOT, file), 'utf8')
    assert.ok(!/@import|url\(\s*['"]?https?:/.test(css), `${file} loads a remote resource`)
  }
})
