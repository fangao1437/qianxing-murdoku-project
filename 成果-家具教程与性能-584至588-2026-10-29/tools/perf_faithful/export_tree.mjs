// tools/perf_faithful/export_tree.mjs —— 把 .gil 的运行时控件树（顶层 `root` 子树）和全部顶层模板
// 导出成 fake_engine.lua 能直接加载的 Lua 数据（每行 { 名字, 父序号(0=无), id, w, h, x, y }）。
//
// 用法：node tools/perf_faithful/export_tree.mjs <存档.gil> [输出.lua]
//       默认输出 tools/perf_faithful/out/tree.lua
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGil } from '../gil/gilread.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
const out = process.argv[3] || path.join(HERE, 'out', 'tree.lua');
if (!file) { console.error('用法：node tools/perf_faithful/export_tree.mjs <存档.gil> [输出.lua]'); process.exit(2); }
fs.mkdirSync(path.dirname(out), { recursive: true });
const g = readGil(file);
const kids = new Map();
for (const r of g.recs) {
  if (r.parentId == null) continue;
  const k = String(r.parentId);
  if (!kids.has(k)) kids.set(k, []);
  kids.get(k).push(r);
}
for (const a of kids.values()) a.sort((x, y) => x.index - y.index);

function floats(f) { return (f && f.sub ? f.sub.filter((x) => x.wt === 5).map((x) => x.f) : []); }
function geom(r) {
  const st = (r.states || [])[0];
  if (!st || !st.sub) return [0, 0, 0, 0];
  const p = floats(st.sub.find((x) => x.field === 504));
  const s = floats(st.sub.find((x) => x.field === 505));
  return [s[0] || 0, s[1] || 0, p[0] || 0, p[1] || 0];
}
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const num = (v) => (Number.isFinite(v) ? +v.toFixed(3) : 0);

function dump(top) {
  const rows = [];
  (function walk(r, p) {
    const i = rows.length + 1;
    const [w, h, x, y] = geom(r);
    rows.push(`{"${esc(r.name)}",${p},${r.id},${num(w)},${num(h)},${num(x)},${num(y)}}`);
    for (const c of kids.get(String(r.id)) || []) walk(c, i);
  })(top, 0);
  return rows;
}

const tops = g.recs.filter((r) => r.parentId == null);
const root = tops.find((r) => r.name === 'root');
const parts = [`root = {\n${dump(root).join(',\n')}\n}`];
const tpl = [];
for (const t of tops) {
  if (t === root) continue;
  tpl.push(`[${t.id}] = {\n${dump(t).join(',\n')}\n}`);
}
parts.push(`templates = {\n${tpl.join(',\n')}\n}`);
// name -> top-level template id (used to resolve referencedPrefabIndex of reference controls)
parts.push(`template_by_name = {\n${tops.filter((t) => t !== root && t.name).map((t) => `["${esc(t.name)}"]=${t.id}`).join(',\n')}\n}`);
fs.writeFileSync(out, `-- generated from ${path.basename(file)}\nreturn {\n${parts.join(',\n')}\n}\n`);
console.log(`root 子树 ${dump(root).length} 个节点，顶层模板 ${tpl.length} 个 → ${out}`);
