import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // color type 6 (RGBA)
  ihdrData[10] = 0; // compression method 0
  ihdrData[11] = 0; // filter method 0
  ihdrData[12] = 0; // interlace method 0
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines: raw RGBA with blue camera-like rounded icon
  const rowBytes = size * 4;
  const rawRows = Buffer.alloc(size * (1 + rowBytes));

  const center = size / 2;
  const radius = size * 0.45;
  const innerRadius = size * 0.22;

  let offset = 0;
  for (let y = 0; y < size; y++) {
    rawRows[offset++] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Icon drawing: blue circle with camera lens
      if (dist <= radius) {
        if (dist <= innerRadius) {
          // Lens center: white
          rawRows[offset++] = 255;
          rawRows[offset++] = 255;
          rawRows[offset++] = 255;
          rawRows[offset++] = 255;
        } else if (dist <= innerRadius + size * 0.08) {
          // Inner lens border: dark blue
          rawRows[offset++] = 30;
          rawRows[offset++] = 58;
          rawRows[offset++] = 138;
          rawRows[offset++] = 255;
        } else {
          // Main body: bright blue (#2563eb)
          rawRows[offset++] = 37;
          rawRows[offset++] = 99;
          rawRows[offset++] = 235;
          rawRows[offset++] = 255;
        }
      } else {
        // Transparent outside
        rawRows[offset++] = 0;
        rawRows[offset++] = 0;
        rawRows[offset++] = 0;
        rawRows[offset++] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawRows);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const png = createPng(size);
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
});
