// Renders the app icon (the padlock from icons/icon.svg) to PNG files. Zero dependencies:
// shapes are drawn with signed distance functions, 4×4 supersampled, and encoded with zlib.
// Usage: node scripts/build-icons.mjs

import { writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const BACKGROUND = [0x0f, 0x6b, 0x4f] // --accent (light theme)
const FOREGROUND = [0xff, 0xff, 0xff]
const SUPERSAMPLE = 4

const ICONS = [
  // "any" icons have rounded corners; maskable ones are full-bleed with the glyph inside the safe zone.
  { file: 'icon-192.png', size: 192, glyphScale: 0.62, cornerRadius: 0.22 },
  { file: 'icon-512.png', size: 512, glyphScale: 0.62, cornerRadius: 0.22 },
  { file: 'icon-maskable-512.png', size: 512, glyphScale: 0.5, cornerRadius: 0 },
  { file: 'apple-touch-icon.png', size: 180, glyphScale: 0.6, cornerRadius: 0 },
]

// ---- Geometry, in the 24×24 units of icons/icon.svg ----

function roundedRectDistance(x, y, cx, cy, halfWidth, halfHeight, radius) {
  const qx = Math.abs(x - cx) - halfWidth + radius
  const qy = Math.abs(y - cy) - halfHeight + radius
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
}

function segmentDistance(x, y, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}

/** True when the point is covered by the padlock glyph. */
function inGlyph(x, y) {
  const strokeHalf = 1
  // Body: rect x=4 y=10 w=16 h=11 rx=2.5, stroked.
  if (Math.abs(roundedRectDistance(x, y, 12, 15.5, 8, 5.5, 2.5)) <= strokeHalf) return true
  // Shackle: two legs from y=10 up to y=7 and a half circle of radius 4 centred at (12, 7).
  if (segmentDistance(x, y, 8, 7, 8, 10) <= strokeHalf) return true
  if (segmentDistance(x, y, 16, 7, 16, 10) <= strokeHalf) return true
  if (y <= 7 && Math.abs(Math.hypot(x - 12, y - 7) - 4) <= strokeHalf) return true
  // Three dots of radius 1.2.
  for (const cx of [9, 12, 15]) if (Math.hypot(x - cx, y - 15.5) <= 1.2) return true
  return false
}

// ---- Rasterization ----

function render({ size, glyphScale, cornerRadius }) {
  const pixels = Buffer.alloc(size * size * 4)
  const glyphSize = size * glyphScale
  const offset = (size - glyphSize) / 2
  const radius = cornerRadius * size
  const samples = SUPERSAMPLE * SUPERSAMPLE

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let background = 0
      let glyph = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = px + (sx + 0.5) / SUPERSAMPLE
          const y = py + (sy + 0.5) / SUPERSAMPLE
          const half = size / 2
          if (radius === 0 || roundedRectDistance(x, y, half, half, half, half, radius) <= 0) {
            background += 1
            const gx = ((x - offset) / glyphSize) * 24
            const gy = ((y - offset) / glyphSize) * 24
            if (inGlyph(gx, gy)) glyph += 1
          }
        }
      }
      const alpha = background / samples
      const mix = background === 0 ? 0 : glyph / background
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c += 1) {
        pixels[i + c] = Math.round(BACKGROUND[c] * (1 - mix) + FOREGROUND[c] * mix)
      }
      pixels[i + 3] = Math.round(alpha * 255)
    }
  }
  return pixels
}

// ---- PNG encoding ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const icon of ICONS) {
  const path = fileURLToPath(new URL(`../icons/${icon.file}`, import.meta.url))
  const png = encodePng(icon.size, render(icon))
  await writeFile(path, png)
  console.log(`wrote ${icon.file} (${png.length} bytes)`)
}
