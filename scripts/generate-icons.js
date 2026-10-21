import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG generator using Node.js built-in zlib
function createSolidPng(width, height, r, g, b, a = 255) {
  // A scanline has 1 filter byte (0 = None) followed by width * 4 bytes (RGBA)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Draw rounded center radar pattern
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Radar circles logic
      const radiusOuter = width * 0.38;
      const radiusMid = width * 0.25;
      const radiusInner = width * 0.12;

      let pr = r;
      let pg = g;
      let pb = b;

      // Background color: deep slate (#0f172a)
      pr = 15;
      pg = 23;
      pb = 42;

      // Radar circles
      if (Math.abs(dist - radiusOuter) < 2) {
        pr = 51; pg = 65; pb = 85;
      } else if (Math.abs(dist - radiusMid) < 2) {
        pr = 2; pg = 132; pb = 199;
      } else if (Math.abs(dist - radiusInner) < 2) {
        pr = 56; pg = 189; pb = 248;
      } else if (dist < 8) {
        pr = 56; pg = 189; pb = 248; // center dot
      } else if (Math.abs(dx) < 1.5 || Math.abs(dy) < 1.5) {
        if (dist <= radiusOuter) {
          pr = 71; pg = 85; pb = 105;
        }
      }

      rawData[pixelOffset] = pr;
      rawData[pixelOffset + 1] = pg;
      rawData[pixelOffset + 2] = pb;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // No interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('./public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPng(192, 192, 2, 132, 199));
// 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPng(512, 512, 2, 132, 199));
// 512x512 Maskable
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPng(512, 512, 2, 132, 199));
// Apple Touch Icon 180x180
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPng(180, 180, 2, 132, 199));
// Favicon PNG
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), createSolidPng(32, 32, 2, 132, 199));

console.log('PNG icons created successfully in public/');
