// 可复现构建：583 控件树 + 当前 v362 dist -> 与交付 584 逐字节一致的存档。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = path.join(ROOT, '583-教程文本可见-v361.gil');
const REFERENCE = path.join(ROOT, '584-加载与操作延迟优化-v362.gil');
const OUT = path.join(ROOT, 'tools/perf_faithful/out/584-v362.rebuilt.gil');
const BASE_SHA256 = '306f588cd4f6b8d0c751756c09c99cc138a55d81f8002e4b8ffac54deea6800e';
const OUTPUT_SHA256 = '055c5bfc1e45e4b59c9542ecdec27f7f2fcb68fc8a630348dd6ff3a814077f37';
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { cwd:ROOT, stdio:'inherit' });
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
};

if (sha256(BASE) !== BASE_SHA256) throw new Error('583 基线哈希不符；请使用 v362 对应基线');
run(path.join(ROOT, 'tools/lua53check/check.cjs'), [path.join(ROOT, 'dist/client_script.lua'), '--run']);
fs.mkdirSync(path.dirname(OUT), { recursive:true });
run(path.join(ROOT, 'tools/gil/embed_script.mjs'), [
  '--in=' + BASE, '--out=' + OUT, '--expect-marker=v362',
]);
if (!fs.readFileSync(OUT).equals(fs.readFileSync(REFERENCE))) {
  throw new Error('重建结果与交付 584 不逐字节一致');
}
if (sha256(OUT) !== OUTPUT_SHA256) throw new Error('重建结果 SHA256 不符');
console.log('REPRODUCIBLE BUILD OK');
console.log('  base   :', BASE_SHA256);
console.log('  output :', OUTPUT_SHA256);
console.log('  file   :', path.relative(ROOT, OUT));
