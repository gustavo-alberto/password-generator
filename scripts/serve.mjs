// Local static server for development. Zero dependencies.
// Usage: node scripts/serve.mjs [port]   (default: 8080)
// Listens on 127.0.0.1 only and never serves anything outside the project root.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080)
const HOST = '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const target = normalize(join(ROOT, decoded))
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null
  return target
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }

  let filePath
  try {
    filePath = resolveSafe(req.url ?? '/')
  } catch {
    filePath = null
  }
  if (!filePath) {
    res.writeHead(400).end('Bad request')
    return
  }

  try {
    let info = await stat(filePath)
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html')
      info = await stat(filePath)
    }
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT}`)
  console.log(`http://${HOST}:${PORT}/`)
})
