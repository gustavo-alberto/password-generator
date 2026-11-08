import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const APP_DIRS = ['css', 'fonts', 'icons', 'js']
const APP_FILES = ['index.html', 'manifest.webmanifest']

async function readPrecache() {
  const source = await readFile(join(ROOT, 'sw.js'), 'utf8')
  const block = source.match(/const PRECACHE = \[([\s\S]*?)\]/)
  assert.ok(block, 'PRECACHE array not found in sw.js')
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
}

async function listAppFiles() {
  const files = [...APP_FILES]
  for (const dir of APP_DIRS) {
    for (const entry of await readdir(join(ROOT, dir), { recursive: true })) {
      const path = `${dir}/${entry.replaceAll('\\', '/')}`
      if ((await stat(join(ROOT, path))).isFile() && !path.endsWith('.txt')) files.push(path)
    }
  }
  return files
}

test('every app file is precached for offline use', async () => {
  const precache = new Set(await readPrecache())
  for (const file of await listAppFiles()) {
    assert.ok(precache.has(`./${file}`), `${file} is missing from PRECACHE in sw.js`)
  }
})

test('every precached path exists', async () => {
  for (const url of await readPrecache()) {
    if (url === './') continue
    await assert.doesNotReject(stat(join(ROOT, url)), `${url} does not exist`)
  }
})

test('manifest icons exist', async () => {
  const manifest = JSON.parse(await readFile(join(ROOT, 'manifest.webmanifest'), 'utf8'))
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'))
  for (const icon of manifest.icons) {
    await assert.doesNotReject(stat(join(ROOT, icon.src)), `${icon.src} does not exist`)
  }
})
