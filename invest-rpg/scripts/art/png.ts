// 외부 라이브러리 없이 PNG(RGBA)를 만든다 (Node 기본 zlib).

declare const process: {
  getBuiltinModule(id: 'node:zlib'): { deflateSync(data: Uint8Array): Uint8Array };
};
const { deflateSync } = process.getBuiltinModule('node:zlib');


const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0);
  return b;
}

const ascii = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

function chunk(type: string, data: Uint8Array): Uint8Array {
  const td = concat([ascii(type), data]);
  return concat([u32(data.length), td, u32(crc32(td))]);
}


/** RGBA 픽셀 → PNG 파일 바이트 */
export function encodePng(w: number, h: number, px: Uint8Array): Uint8Array {
  const stride = w * 4 + 1;
  const raw = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) raw.set(px.subarray(y * w * 4, (y + 1) * w * 4), y * stride + 1); // 줄마다 필터 0
  const ihdr = concat([u32(w), u32(h), Uint8Array.from([8, 6, 0, 0, 0])]); // 8비트 RGBA
  return concat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}
