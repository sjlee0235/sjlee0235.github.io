// 문제 데이터 암호화/복호화 도구 (Node 18+)
//
//   VAULT_CODE='입장코드' node tools/vault.mjs decrypt   # data/vault.json → src-data/<파트>.js, vault-syn.json → synth.json, vault-herb.json → herb.json
//   (src-data/ 의 파일을 수정하거나 새 파트 파일 추가)
//   VAULT_CODE='입장코드' node tools/vault.mjs encrypt   # src-data/*.js → data/vault.json, synth.json → vault-syn.json(gzip), herb.json → vault-herb.json(gzip)
//
// src-data/ 는 평문이므로 .gitignore 로 커밋되지 않는다. 입장 코드는 저장소에 적지 않는다.
// 코드를 바꾸려면: 기존 코드로 decrypt → 새 코드로 encrypt.
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src-data');
const OUT = path.join(ROOT, 'data', 'vault.json');
const SYN_SRC = path.join(SRC, 'synth.json');
const SYN_OUT = path.join(ROOT, 'data', 'vault-syn.json');
const HERB_SRC = path.join(SRC, 'herb.json');
const HERB_OUT = path.join(ROOT, 'data', 'vault-herb.json');
const ITER = 250000;

const cmd = process.argv[2];
const code = String(process.env.VAULT_CODE || '').normalize('NFC').replace(/\s+/g, '').toLowerCase();
if (!['encrypt', 'decrypt'].includes(cmd) || !code) {
  console.error("사용법: VAULT_CODE='입장코드' node tools/vault.mjs encrypt|decrypt");
  process.exit(1);
}

const b64 = (u8) => Buffer.from(u8).toString('base64');
async function keyFor(salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function seal(bytes, file, gzip) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = gzip ? zlib.gzipSync(bytes, { level: 9 }) : bytes;
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(salt, ITER), body);
  const v = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  if (gzip) v.z = 'gzip';
  fs.writeFileSync(file, JSON.stringify(v) + '\n');
}
async function open(file) {
  const v = JSON.parse(fs.readFileSync(file, 'utf8'));
  let buf;
  try {
    buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(v.iv, 'base64') },
      await keyFor(Buffer.from(v.salt, 'base64'), v.iter), Buffer.from(v.ct, 'base64'));
  } catch (e) { console.error('코드가 맞지 않습니다'); process.exit(1); }
  buf = Buffer.from(buf);
  return v.z === 'gzip' ? zlib.gunzipSync(buf) : buf;
}

if (cmd === 'encrypt') {
  const ctx = { window: { QUIZ_DATA: {} } };
  vm.createContext(ctx);
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.js')).sort();
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
  const data = ctx.window.QUIZ_DATA;
  for (const [id, d] of Object.entries(data)) {
    if (!Array.isArray(d.ox) || !Array.isArray(d.mcq)) throw new Error(id + ': ox/mcq 배열이 없습니다');
    d.mcq.forEach((q, i) => { if (q.c.length !== 5 || !(q.a >= 0 && q.a < 5)) throw new Error(`${id} mcq #${i} 형식 오류`); });
    console.log(`${id}: O,X ${d.ox.length} / 5지선다 ${d.mcq.length}`);
  }
  await seal(new TextEncoder().encode(JSON.stringify(data)), OUT, false);
  console.log('→ data/vault.json 저장 완료');
  if (fs.existsSync(SYN_SRC)) {
    const syn = JSON.parse(fs.readFileSync(SYN_SRC, 'utf8'));
    syn.drugs.forEach((d, i) => { if (!d.name || !d.svg || !d.head || d.near.length < 4) throw new Error('합성학 #' + i + ' 형식 오류'); });
    await seal(new TextEncoder().encode(JSON.stringify(syn)), SYN_OUT, true);
    console.log(`합성학: 약물 ${syn.drugs.length}개 → data/vault-syn.json 저장 완료`);
  }
  if (fs.existsSync(HERB_SRC)) {
    const hb = JSON.parse(fs.readFileSync(HERB_SRC, 'utf8'));
    for (const p of hb.parts) {
      const d = hb.data[p.id];
      if (!d || !d.ox.length || !d.blank.length) throw new Error('생약학 ' + p.id + ': 문제가 없습니다');
      d.blank.forEach((q, i) => { if (q.c.length !== 5 || !(q.a >= 0 && q.a < 5)) throw new Error(`생약학 ${p.id} 빈칸 #${i} 형식 오류`); });
      console.log(`생약학 ${p.id}: O,X ${d.ox.length} / 빈칸 넣기 ${d.blank.length}`);
    }
    await seal(new TextEncoder().encode(JSON.stringify(hb)), HERB_OUT, true);
    console.log('→ data/vault-herb.json 저장 완료');
  }
} else {
  const data = JSON.parse(new TextDecoder().decode(await open(OUT)));
  fs.mkdirSync(SRC, { recursive: true });
  for (const [id, d] of Object.entries(data)) {
    const body = 'window.QUIZ_DATA = window.QUIZ_DATA || {};\nwindow.QUIZ_DATA.' + id + ' = ' + JSON.stringify(d, null, 2) + ';\n';
    fs.writeFileSync(path.join(SRC, id + '.js'), body);
    console.log(`src-data/${id}.js (O,X ${d.ox.length} / 5지선다 ${d.mcq.length})`);
  }
  if (fs.existsSync(SYN_OUT)) {
    fs.writeFileSync(SYN_SRC, await open(SYN_OUT));
    console.log('src-data/synth.json (합성학)');
  }
  if (fs.existsSync(HERB_OUT)) {
    fs.writeFileSync(HERB_SRC, await open(HERB_OUT));
    console.log('src-data/herb.json (생약학)');
  }
}
