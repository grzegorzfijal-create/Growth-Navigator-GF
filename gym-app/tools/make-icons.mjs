/* Generator ikon PWA - rysuje sztangę na limonkowym tle i zapisuje PNG.
   Bez zewnętrznych zależności: piksele liczymy ręcznie, PNG pakujemy zlibem.
   Uruchomienie: node tools/make-icons.mjs */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const RACE_RED = [229, 41, 11];
const CARBON = [10, 10, 11];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bitów na kanał
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filtr "none"
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Sztanga na czerwonym tle z ukośnym pasem liverii. */
function drawIcon(size, { padding = 0, background = RACE_RED } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const inner = size - padding * 2;
  const put = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = 255;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const insidePad = x >= padding && x < size - padding && y >= padding && y < size - padding;
      if (!insidePad) continue;
      const lx = x - padding;
      const ly = y - padding;
      const r = radius * (inner / size);
      const cx = Math.min(Math.max(lx, r), inner - r);
      const cy = Math.min(Math.max(ly, r), inner - r);
      if ((lx - cx) ** 2 + (ly - cy) ** 2 > r * r) continue;
      put(x, y, background);
    }
  }

  // Ukośny pas w duchu liverii - tylko wewnątrz zaokrąglonego kwadratu.
  for (let y = padding; y < size - padding; y += 1) {
    for (let x = padding; x < size - padding; x += 1) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] === 0) continue;
      const diagonal = x + y * 0.55;
      if (diagonal > inner * 1.02 && diagonal < inner * 1.16) put(x, y, CARBON);
    }
  }

  const cy = size / 2;
  const bar = (yFrom, yTo, xFrom, xTo) => {
    for (let y = Math.round(yFrom); y < Math.round(yTo); y += 1) {
      for (let x = Math.round(xFrom); x < Math.round(xTo); x += 1) {
        if (x >= 0 && y >= 0 && x < size && y < size && pixels[(y * size + x) * 4 + 3] > 0) put(x, y, WHITE);
      }
    }
  };

  const unit = inner / 32;
  const left = padding;
  bar(cy - unit * 1.1, cy + unit * 1.1, left + unit * 8, left + unit * 24); // gryf
  bar(cy - unit * 6, cy + unit * 6, left + unit * 5.5, left + unit * 8);    // talerz duży lewy
  bar(cy - unit * 6, cy + unit * 6, left + unit * 24, left + unit * 26.5);  // talerz duży prawy
  bar(cy - unit * 3.5, cy + unit * 3.5, left + unit * 3, left + unit * 5.5);// talerz mały lewy
  bar(cy - unit * 3.5, cy + unit * 3.5, left + unit * 26.5, left + unit * 29); // talerz mały prawy
  return png(size, pixels);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", drawIcon(192));
writeFileSync("public/icons/icon-512.png", drawIcon(512));
writeFileSync("public/icons/apple-touch-icon.png", drawIcon(180));
// Maskowalna ikona potrzebuje marginesu, inaczej system przytnie sztangę.
writeFileSync("public/icons/maskable-512.png", drawIcon(512, { padding: 64 }));
console.log("Ikony zapisane w public/icons");
