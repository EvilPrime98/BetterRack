import sharp from "sharp";
import { writeFileSync } from "node:fs";

const src = "build/icon.png";
const sizes = [16, 24, 32, 48, 64, 128, 256];

const pngs = await Promise.all(
  sizes.map((s) =>
    sharp(src)
      .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

const entries = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
pngs.forEach((buf, i) => {
  const s = sizes[i];
  const e = i * 16;
  entries.writeUInt8(s >= 256 ? 0 : s, e + 0);
  entries.writeUInt8(s >= 256 ? 0 : s, e + 1);
  entries.writeUInt8(0, e + 2);
  entries.writeUInt8(0, e + 3);
  entries.writeUInt16LE(1, e + 4);
  entries.writeUInt16LE(32, e + 6);
  entries.writeUInt32LE(buf.length, e + 8);
  entries.writeUInt32LE(offset, e + 12);
  offset += buf.length;
});

writeFileSync("build/icon.ico", Buffer.concat([header, entries, ...pngs]));
console.log("wrote build/icon.ico");
