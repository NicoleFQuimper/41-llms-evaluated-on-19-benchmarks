// Renders the app icons with no dependencies: a tiny supersampled rasterizer
// plus a hand-rolled PNG writer. Run with `node tools/make-icons.mjs`.

import zlib from "node:zlib"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "icons")

const HEART_PX = [
  [0, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
]

const hex = (h) => {
  const v = h.replace("#", "")
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ]
}

const mix = (base, color, alpha) => [
  base[0] + (color[0] - base[0]) * alpha,
  base[1] + (color[1] - base[1]) * alpha,
  base[2] + (color[2] - base[2]) * alpha,
]

const rad = (deg) => (deg * Math.PI) / 180

/** Dial angle of a point: 0 at the top, growing clockwise. */
function angleAt(x, y) {
  const a = (Math.atan2(x, -y) * 180) / Math.PI
  return a < 0 ? a + 360 : a
}

function shade(u, v, scale) {
  // u, v are in -0.5..0.5 relative to the icon; scale shrinks the artwork so
  // the maskable variant keeps everything inside the safe zone.
  let color = mix(hex("#ffd9ee"), hex("#fff2f9"), 0.5 - v)

  const r = Math.sqrt(u * u + v * v) / scale
  const a = angleAt(u, v)

  const inside = (lo, hi) => r >= lo && r <= hi
  const inWedge = (a0, a1) => (a1 <= 360 ? a >= a0 && a <= a1 : a >= a0 || a <= a1 - 360)

  if (r <= 0.4) color = hex("#fff7fb")
  if (inside(0.36, 0.4)) color = hex("#f9c2e0")

  const wedges = [
    [20, 70, "#ff6baf"],
    [95, 130, "#c084fc"],
    [150, 205, "#7dd3fc"],
    [250, 300, "#f9a8d4"],
  ]
  wedges.forEach(([a0, a1, c]) => {
    if (inWedge(a0, a1)) {
      if (inside(0.12, 0.34)) color = mix(color, hex(c), 0.45)
      if (inside(0.345, 0.385)) color = hex(c)
    }
  })

  // hour ticks
  for (let h = 0; h < 24; h += 3) {
    const t = h * 15
    let delta = Math.abs(((a - t + 540) % 360) - 180)
    if (delta < 1.4 && inside(0.3, 0.355)) color = hex("#c45b8c")
  }

  // hand, pointing at ~16:30
  const handA = rad(247)
  const hx = Math.sin(handA)
  const hy = -Math.cos(handA)
  const along = (u * hx + v * hy) / scale
  const across = Math.abs((u * hy - v * hx) / scale)
  if (along > 0 && along < 0.39 && across < 0.012) color = hex("#ff4d8d")

  // pixel heart hub
  const px = 0.036 * scale
  const cols = HEART_PX[0].length
  const rows = HEART_PX.length
  const hxs = u + (cols * px) / 2
  const hys = v + (rows * px) / 2 - 0.006
  const col = Math.floor(hxs / px)
  const row = Math.floor(hys / px)
  const onHeart = (c, rw) =>
    rw >= 0 && rw < rows && c >= 0 && c < cols && HEART_PX[rw][c] === 1
  const outlineHit = [-1, 0, 1].some((dc) =>
    [-1, 0, 1].some((dr) => onHeart(col + dc, row + dr))
  )
  if (hxs >= -px && hys >= -px && outlineHit) color = hex("#ffffff")
  if (onHeart(col, row)) color = hex("#ff4d8d")

  return color
}

function render(size, scale) {
  const samples = 3
  const data = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const u = (x + (sx + 0.5) / samples) / size - 0.5
          const v = (y + (sy + 0.5) / samples) / size - 0.5
          const c = shade(u, v, scale)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = samples * samples
      const i = (y * size + x) * 4
      data[i] = Math.round(r / n)
      data[i + 1] = Math.round(g / n)
      data[i + 2] = Math.round(b / n)
      data[i + 3] = 255
    }
  }
  return data
}

// —— PNG writer ————————————————————————————————————————————————

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, body) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(body.length)
  const typed = Buffer.concat([Buffer.from(type, "ascii"), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([length, typed, crc])
}

function png(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const jobs = [
  ["icon-180.png", 180, 1],
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.78],
]
jobs.forEach(([name, size, scale]) => {
  const file = path.join(OUT_DIR, name)
  fs.writeFileSync(file, png(size, render(size, scale)))
  console.log("wrote", file)
})
