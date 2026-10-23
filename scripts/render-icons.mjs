import { deflateSync } from "node:zlib"
import { writeFileSync } from "node:fs"

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function sdRoundBox(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - (x + w / 2)) - w / 2 + r
  const qy = Math.abs(py - (y + h / 2)) - h / 2 + r
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 0x11
    px[i + 1] = 0x11
    px[i + 2] = 0x11
    px[i + 3] = 255
  }

  const scale = (size / 64) * 0.9
  const origin = (size - 64 * scale) / 2
  const shapes = [
    { x: 6, y: 22, w: 8, h: 20, r: 1.5, color: [0xf5, 0xc5, 0x18] },
    { x: 50, y: 22, w: 8, h: 20, r: 1.5, color: [0xf5, 0xc5, 0x18] },
    { x: 16, y: 26, w: 5, h: 12, r: 0, color: [0xf5, 0xc5, 0x18] },
    { x: 43, y: 26, w: 5, h: 12, r: 0, color: [0xf5, 0xc5, 0x18] },
    { x: 21, y: 30, w: 22, h: 4, r: 0, color: [0xf4, 0xf1, 0xea] },
  ]

  for (const shape of shapes) {
    const x = origin + shape.x * scale
    const y = origin + shape.y * scale
    const w = shape.w * scale
    const h = shape.h * scale
    const radius = shape.r * scale
    const x0 = Math.max(0, Math.floor(x - 1))
    const y0 = Math.max(0, Math.floor(y - 1))
    const x1 = Math.min(size, Math.ceil(x + w + 1))
    const y1 = Math.min(size, Math.ceil(y + h + 1))
    for (let py = y0; py < y1; py++) {
      for (let px0 = x0; px0 < x1; px0++) {
        const cover = Math.max(0, Math.min(1, 0.5 - sdRoundBox(px0 + 0.5, py + 0.5, x, y, w, h, radius)))
        if (cover <= 0) continue
        const i = (py * size + px0) * 4
        const dstA = px[i + 3] / 255
        const outA = cover + dstA * (1 - cover)
        px[i] = Math.round((shape.color[0] * cover + px[i] * dstA * (1 - cover)) / outA)
        px[i + 1] = Math.round((shape.color[1] * cover + px[i + 1] * dstA * (1 - cover)) / outA)
        px[i + 2] = Math.round((shape.color[2] * cover + px[i + 2] * dstA * (1 - cover)) / outA)
        px[i + 3] = 255
      }
    }
  }

  return png(size, size, px)
}

writeFileSync("public/icon-192.png", draw(192))
writeFileSync("public/icon-512.png", draw(512))
writeFileSync("public/apple-touch-icon.png", draw(180))
console.log("icons written")
