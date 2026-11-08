// 645 · 选关界面「按图还原」
//
// 流程（对齐 tool 仓 dsh-plugin-qianxing-art-pipeline 的 S2→S3→S4→S6）：
//   S2 手写层表 → 规范化规格 select_spec_645.json（每层有独立名字/组/几何/颜色/图元 id/旋转）
//   S3 离线预览 _tmp/select645_preview.png（与写档同一份层表，rotSign=-1 与真机一致）
//   S4 以 642v2 为 base 写入新 .gil（旧 art642 视觉层隐藏，新层克隆自编辑器认得的图片控件）
//   S6 从磁盘重读校验：记录数、层名、几何、颜色、内嵌脚本标记
//
// 硬约束：
//   · 不做全图拟合。每个组件（背景/光晕/边框/纹样/撕边/便签/红线/节点/相框/按钮）都是独立记录。
//   · 图元只用官方基础形状 100001(矩) / 100002(椭圆) / 100003(三角) / 106056 / 106057(柔光)。
//   · 左上角返回箭头保持 640 版本形状：select.back = 100109 @ 62×62 / pos(-709,296.9)。
//   · 结算按钮只换样式（原蓝色胶囊底透明 + 独立褐色旗形层），原文本/点击逻辑不动。
//   · 输出不得覆盖输入；所有原功能控件、命中层、卡片、热区保持可用。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const gilDir = path.join(root, 'qianxing-murdoku/存档/近30版');
const input = path.join(gilDir, '正式版642_选关分层复刻_v2.gil');
const output = path.join(gilDir, '正式版645_选关按图还原.gil');
// DRY=1：只产出规格与离线预览，不写 .gil，供逐像素迭代调参。
const DRY = process.env.DRY === '1';
if (!DRY && fs.existsSync(output)) throw Error('输出已存在，拒绝覆盖：' + output);

const { readGil, stateBlocks, pairOf, setPair, cloneField, ensureChildListTop,
  findChildListTop, asIdList, setChildList, textsOf, encodeMsg } =
  await import(pathToFileURL(path.join(root, 'qianxing-murdoku/tools/gil/gilread.mjs')).href);
const { writeGil, findScriptLeaf } =
  await import(pathToFileURL(path.join(root, 'qianxing-murdoku/tools/gil/gilwrite.mjs')).href);
const { setHiddenRecord } =
  await import(pathToFileURL(path.join(root, 'qianxing-murdoku-tool/dsh-plugin-qianxing-art-pipeline/src/gil/ops.js')).href);
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(path.join(root, 'qianxing-murdoku-tool/node_modules/@napi-rs/canvas'));

// ── gil 读写脚手架（沿用 642 构建器，已真机验证过的克隆/几何路径） ──────────────
const g = readGil(input);
const by = new Map(g.recs.filter(r => r.name).map(r => [r.name, r]));
const R = n => { const r = by.get(n); if (!r) throw Error('缺控件 ' + n); return r; };
let max = BigInt(g.maxId);
const added = [];
const ns = (f, ks) => ks.reduce((a, k) => a.flatMap(x => (x.sub || []).filter(y => y.field === k)), [f]);
function number(p, k, v) { let f = p.sub.find(q => q.field === k && q.wt === 0); if (!f) p.sub.push(f = { field: k, wt: 0 }); f.num = BigInt(v >>> 0); }
function place(r, x, y, w, h) {
  for (const s of stateBlocks(r.field.sub, [])) {
    setPair(pairOf(s, 504), x, y);
    setPair(pairOf(s, 505), w, h);
    const rot = s.sub.find(q => q.field === 508);
    if (rot) { rot.sub = []; rot.payload = null; rot.len = 0; }
  }
}
function remap(a, from, to, d = 0) {
  for (const q of a) {
    if (!(d === 0 && q.field === 504) && q.num === BigInt(from)) q.num = BigInt(to);
    if (q.sub) remap(q.sub, from, to, d + 1);
  }
}
function clone(proto, parent, name) {
  const f = cloneField(proto.field), id = Number(++max);
  remap(f.sub, proto.id, id);
  const nf = textsOf(f.sub, []).find(q => q.payload?.toString('utf8') === proto.name);
  if (!nf) throw Error('克隆原型缺名字叶子：' + proto.name);
  nf.payload = Buffer.from(name); nf.len = nf.payload.length;
  f.sub = f.sub.filter(q => !(q.field === 504 && q.wt === 0));
  f.sub.push({ field: 504, wt: 0, num: BigInt(parent.id) });
  const cl = findChildListTop(f.sub); if (cl) setChildList(cl, []);
  g.tree.find(q => q.field === 9).sub.push(f);
  const pc = ensureChildListTop(parent);
  setChildList(pc, [...asIdList(pc.payload, true), id]);
  setHiddenRecord(f, false);
  const r = { id, name, parentId: parent.id, field: f };
  added.push(r); by.set(name, r);
  return r;
}

// ── S2 层表 ───────────────────────────────────────────────────────────────
// 设计图 1920×1080 → 游戏画布 1600×900（缩放 5/6）。层表用设计图像素书写，写档时统一换算。
const S = 5 / 6;
const layers = [];
const GROUPS = ['backdrop', 'board', 'paper', 'thread', 'lighting', 'frames', 'buttons'];
const seed = R('td.home.page.1.help619.icon');
const groups = Object.fromEntries(GROUPS.map(n => [n, R('art642.select.' + n)]));

// 隐藏 642v2 的所有旧视觉层，清空各组件容器的子列表；容器本身保留（层级顺序不变）。
let hidden = 0;
for (const r of g.recs) {
  if (!r.name?.startsWith('art642.select.')) continue;
  if (GROUPS.some(n => r.name === 'art642.select.' + n)) continue;
  setHiddenRecord(r.field, true); hidden++;
}
for (const n of GROUPS) setChildList(findChildListTop(groups[n].field.sub), []);

function add(group, name, x, y, w, h, color, imageId = 100001, rotation = 0) {
  const X = x * S, Y = y * S, W = w * S, H = h * S;
  const r = clone(seed, groups[group], 'art645.select.' + name);
  place(r, X + W / 2 - 800, 450 - Y - H / 2, W, H);
  const ip = ns(r.field, [505, 503, 84])[0];
  if (!ip) throw Error('克隆层缺图片块：' + name);
  number(ip, 503, imageId);
  number(ip, 502, parseInt(color.length === 9 ? color.slice(1) : color.replace('#', 'FF'), 16));
  number(ip, 504, 1);
  if (rotation) {
    for (const st of stateBlocks(r.field.sub, [])) {
      let f = st.sub.find(q => q.field === 508);
      if (!f) st.sub.push(f = { field: 508, wt: 2 });
      f.sub = [{ field: 3, wt: 5, f: rotation }]; f.payload = null; f.len = 5;
    }
  }
  layers.push({ name, group, x, y, w, h, color, imageId, rotation });
  return r;
}
function txt(name, value, x, y, w, h, size, color) {
  const r = clone(R('td.l1.page.1.heading'), groups.buttons, 'art645.select.' + name);
  place(r, (x + w / 2) * S - 800, 450 - (y + h / 2) * S, w * S, h * S);
  const p = ns(r.field, [505, 503, 75])[0], f = ns(r.field, [505, 503, 75, 510, 501])[0];
  f.payload = Buffer.from(value); f.len = f.payload.length;
  for (const [k, v] of [[502, 0], [512, size * S], [513, size * S], [504, parseInt(color.replace('#', 'FF'), 16)], [508, 1], [509, 1]]) number(p, k, v);
  layers.push({ name, group: 'buttons', text: value, x, y, w, h, size, color });
  return r;
}
function line(group, name, x1, y1, x2, y2, width, color) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  return add(group, name, (x1 + x2) / 2 - len / 2, (y1 + y2) / 2 - width / 2, len, width,
    color, 100001, -Math.atan2(dy, dx) * 180 / Math.PI);
}
function note(name, x, y, w, h, color, border, rot, shadow = true, group = 'paper') {
  if (shadow) add(group, name + '.shadow', x + 12, y + 16, w, h, '#66000000', 106057, rot);
  add(group, name + '.edge', x - 5, y - 5, w + 10, h + 10, border, 100001, rot);
  add(group, name, x, y, w, h, color, 100001, rot);
}

// ① 背景 / 光晕 / 内边框 / 纹样（各自独立层，不合并成一张图） ──────────────────
add('backdrop', 'bg.base', 0, 0, 1920, 1080, '#FF130E0B');
// 左右暗纹（菱形织物），两列交替色
for (let side = 0; side < 2; side++) {
  for (let col = 0; col < 2; col++) for (let row = 0; row < 8; row++) {
    const x = (side ? 1745 : 25) + col * 92 + (row % 2 ? 26 : 0);
    const y = 10 + row * 136;
    add('backdrop', `weave.${side}.${col}.${row}`, x, y, 70, 70,
      (col + row) % 2 ? '#FF170F0A' : '#FF1D140D', 100001, 45);
  }
}
// 环形亮区按实机反馈重新拉伸：设计图 x=180/1420 已明显变暗（board 左右留暗边），
// y=650 起由上而下逐渐压暗；645 之前是一个横卧的圆，四周一圈均匀暗环、底部弧线太完整。
// → 横向收窄 5%（1488→1416）、纵向拉长 22%（984→1200），让上下弧线移出画面；
//   再用 6 条独立的半透明暗色横带叠出「下部渐暗」，避免不透明核心下半部一样亮。
add('backdrop', 'board.warm', 200, 33, 1520, 967, '#FF3A1A06');
const RCX = 960, RCY = 456;
for (let i = 0; i < 24; i++) {
  const t = i / 23, w = 1486 - 70 * t, h = 1260 - 60 * t;
  add('backdrop', 'ring.' + i, RCX - w / 2, RCY - h / 2, w, h, '#0FC86802', 100002);
}
add('backdrop', 'ring.core', RCX - 708, RCY - 600, 1416, 1200, '#FFAB5E02', 100002);
for (let i = 0; i < 6; i++)
  add('backdrop', 'ring.falloff.' + i, 0, 660 + i * 60, 1920, 350, '#11000000', 100001);
add('backdrop', 'border.top', 200, 30, 1520, 5, '#FF8C1F02');
add('backdrop', 'border.bottom', 200, 995, 1520, 5, '#FF4F1100');
add('backdrop', 'border.left', 197, 30, 5, 970, '#FF5E1505');
add('backdrop', 'border.right', 1717, 30, 5, 970, '#FF5E1505');
// 上下花纹：设计图是细密、低对比的暗色锯齿；旧版 28 个 36×28 大黑三角在真机里极刺眼。
// 顶部在亮区上，颜色必须靠近亮橙才不会跳；底部在暗区上则取比底色更暗的棕。
for (let i = 0; i < 72; i++) {
  const x = 210 + i * 21;
  add('backdrop', 'pattern.top.' + i, x, 16, 16, 12, '#FF8A4A04', 100003, 180);
  add('backdrop', 'pattern.bottom.' + i, x, 1000, 16, 12, '#FF2E1606', 100003, 0);
}

// ② 撕纸边（右上 / 左下）：沿轮廓铺旋转宽带 + 独立白撕边 + 独立细线暗影 + 拐点补缝。
//    早期用水平矩形逐段填充会留下明显阶梯；这里每段是一个沿切线旋转、
//    向纸片一侧延伸 520px 的宽矩形，内边缘即轮廓线，相邻段重叠消除锯齿。
const TEAR = '#FFAC6840';
// 沿轮廓铺旋转宽带。side=+1 纸片在右上，side=-1 纸片在左下。
function tearStrip(group, name, x0, y0, x1, y1, side, T, color) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);
  const nx = side * Math.sin(th), ny = -side * Math.cos(th);
  // 段间必须重叠，否则相邻旋转矩形之间会留下从轮廓向纸片深处发散的长黑楔
  // （645 初稿用 len+4，实机预览里两处撕边全是放射状黑刺）。
  // 近水平段单独收紧，避免两端向 board 一侧鼓出方块。
  const w = Math.abs(dy) < 25 ? len * 1.5 + 18 : len * 2.4 + 26;
  const cx = (x0 + x1) / 2 + nx * T / 2, cy = (y0 + y1) / 2 + ny * T / 2;
  return add(group, name, cx - w / 2, cy - T / 2, w, T, color, 100001, -th * 180 / Math.PI);
}
const tearBand = (g, n, x0, y0, x1, y1, side) => tearStrip(g, n, x0, y0, x1, y1, side, 520, TEAR);
// 撕边轮廓的折角处，旋转矩形的端点会留下针尖大小的缺口；用独立小椭圆补缝。
// 补缝必须画在白撕边线「之前」，否则会在白线上形成一串珠子。
function tearJoints(group, tag, pts) {
  for (let i = 1; i < pts.length - 1; i++) {
    const [y, x] = pts[i];
    add(group, `tear.${tag}.joint.${i}`, x - 7, y - 7, 14, 14, TEAR, 100002);
  }
}
// 按实机反馈：白边加粗，并「只」在棕色溢出压住白线、白线未封闭的几处
// 补独立白边图元。逐点铺白色椭圆会变成一串珠子，已弃用。
const TEAR_WHITE = '#FFF6E6C4';
// 轮廓点由设计图白撕边逐行采样反解（[y,x]，设计像素）。
const trEdge = [[0, 1514], [12, 1562], [48, 1612], [60, 1625], [72, 1654], [84, 1670],
  [96, 1714], [108, 1765], [120, 1781], [132, 1798], [144, 1829], [180, 1894],
  [192, 1907], [205, 1920]];
for (let i = 0; i < trEdge.length - 1; i++) {
  const [y0, x0] = trEdge[i], [y1, x1] = trEdge[i + 1];
  tearBand('board', 'tear.tr.band.' + i, x0, y0, x1, y1, +1);
  line('board', 'tear.tr.shadow.' + i, x0 - 4, y0 + 4, x1 - 4, y1 + 4, 10, '#2A000000');
}
tearJoints('board', 'tr', trEdge);
// 画布最右上角：最后几段旋转矩形在 y<0 的夹角会留一个针状缺口，用独立小片补齐。
add('board', 'tear.tr.cap', 1780, 0, 140, 40, TEAR);
for (let i = 0; i < trEdge.length - 1; i++) {
  const [y0, x0] = trEdge[i], [y1, x1] = trEdge[i + 1];
  line('board', 'tear.tr.edge.' + i, x0, y0, x1, y1, 10, TEAR_WHITE);
}
// 右上白线加粗后折线段的针孔已自行封闭，无需额外补块（补块反而会留白方块）。
// 设计图左下白线在 y≈850(设计 px) 有一段水平平台，再陡降；前三点专门还原它。
const blEdge = [[846, 42], [852, 94], [870, 97], [912, 114], [948, 138], [960, 156],
  [972, 192], [996, 210], [1014, 234], [1032, 258], [1044, 276], [1056, 300],
  [1068, 342], [1080, 438]];
for (let i = 0; i < blEdge.length - 1; i++) {
  const [y0, x0] = blEdge[i], [y1, x1] = blEdge[i + 1];
  if (i === 0) {
    // 起始近水平段用严格位于白线下方的矩形，旋转宽带在这里最容易把纸片
    // 顶到 board 上，形成用户指出的「左下角图形溢出」。
    add('board', 'tear.bl.band.0', 0, y1, x1, 1080 - y1, TEAR);
  } else {
    tearBand('board', 'tear.bl.band.' + i, x0, y0, x1, y1, -1);
  }
  line('board', 'tear.bl.shadow.' + i, x0 + 4, y0 - 4, x1 + 4, y1 - 4, 10, '#2A000000');
}
tearJoints('board', 'bl', blEdge);
for (let i = 0; i < blEdge.length - 1; i++) {
  const [y0, x0] = blEdge[i], [y1, x1] = blEdge[i + 1];
  line('board', 'tear.bl.edge.' + i, x0, y0, x1, y1, 10, TEAR_WHITE);
}
// 左下起始平台：设计图 y≈700..710(画布) 有一段水平白边，实机被溢出的棕色
// 纸片截断。用一段独立的「斜放白边图元」补齐并盖住溢出，避免矩形直角块。
// 这段独立白边图元同时承担两件事：补齐被截断的水平白边，以及上沿压住
// band 端头鼓出到 board 一侧的那一小块棕色纸片。因此它比常规白边略宽略高。
// 曾试过另加一枚椭圆补溢出，结果在白线上留下孤立白圆点，已弃用。
line('board', 'tear.bl.seal.platform', 0, 834, 112, 842, 18, TEAR_WHITE);

// ③ 相框后的牛皮纸底板（4 张，各自倾斜） + 装饰矩形便签 ────────────────────────
const FX = [389, 686, 991, 1296], FY = [374, 373, 372, 372], FW = 240, FH = 343;
for (let i = 0; i < 4; i++) {
  const rot = i % 2 ? -5 : 5;
  add('paper', 'kraft.' + (i + 1), FX[i] - 42, FY[i] - 42, FW + 50, FH + 52, '#D8C08A4A', 100001, rot);
  line('paper', 'kraft.' + (i + 1) + '.rule', FX[i] - 34, FY[i] + 78, FX[i] + FW + 18, FY[i] + 68, 3, '#806B4A22');
}
// 设计图里米黄便签在下、亮黄便签压在它右半边（二者同向倾斜），顺序不能反。
// 尺寸由设计图可见包围盒反解：米黄 154×217、亮黄 76×203（设计像素，含 12° 旋转外扩）。
note('note.cream', 130, 311, 116, 197, '#FFFAE2A4', '#FF6B2B12', -12);
// 亮黄便签的可见部分是米黄右侧的一条斜带：左边界约设计 x=247（画布 206）、
// 右边界约设计 x=314（画布 262）。加宽后旋转中心左移，右边界保持不变。
note('note.yellow.left', 241, 323, 61, 200, '#FFFEFB32', '#FF6B2B12', -12);
note('note.olive.top', 1018, 60, 154, 237, '#FF503B06', '#FF6B2B12', 0);
note('note.yellow.topright', 1389, 79, 164, 141, '#FFFCF507', '#FF7A2A0E', 0);
note('note.navy', 165, 610, 170, 330, '#FF231E24', '#FF5A1E0C', 4);
note('note.yellow.right', 1508, 573, 167, 232, '#FFFCF507', '#FF7A2A0E', 0);
note('note.orange.bottom', 490, 780, 188, 247, '#FFE58F14', '#FF8A4A08', 0);
note('note.yellow.bottom', 678, 825, 134, 142, '#FFFDF40F', '#FF6B2B12', 0);

// ④ 红线与橙色节点（线在相框之下、便签之上） ──────────────────────────────────
const segs = [
  [230, 315, 566, 103], [566, 103, 1103, 52], [1103, 52, 1398, 350],
  [230, 315, 366, 508], [1463, 91, 1603, 571], [1603, 571, 990, 701],
  [990, 701, 582, 795], [582, 795, 517, 718],
];
segs.forEach(([x1, y1, x2, y2], i) => {
  line('thread', 'cord.border.' + i, x1, y1, x2, y2, 13, '#FF8E1B0C');
  line('thread', 'cord.' + i, x1, y1, x2, y2, 8, '#FFFA1E0E');
});
const nodes = [[230, 315], [566, 103], [1103, 52], [1463, 91], [1603, 571], [582, 795], [234, 626]];
nodes.forEach(([x, y], i) => {
  add('thread', 'node.edge.' + i, x - 15, y - 15, 30, 30, '#FF8B2B0C', 100002);
  add('thread', 'node.face.' + i, x - 11, y - 11, 22, 22, '#FFFF6501', 100002);
});

// ⑤ 柔光与相框阴影 ────────────────────────────────────────────────────────
for (let i = 0; i < 4; i++)
  add('lighting', 'card.shadow.' + (i + 1), FX[i] - 16, FY[i] + 14, FW + 32, FH + 34, '#60000000', 106057);
// warm.pool 是实机里那块突兀的矩形亮斑，移除；中央明暗已由 backdrop 的 ring.* 承担。

// ⑥ 四张拍立得相框（白框 / 棕色窗口 / 顶部小凸片，逐层独立） ────────────────────
for (let i = 0; i < 4; i++) {
  add('frames', 'card.' + (i + 1) + '.paper', FX[i], FY[i], FW, FH, '#FFFBFBFB');
  // 设计图棕黄窗口外有一圈暗红细描边；下层红框略大、上层棕黄矩形缩小，红边自然露出。
  add('frames', 'card.' + (i + 1) + '.opening.border', FX[i] + 18, FY[i] + 22, FW - 36, FH - 74, '#FF7A1E08');
  add('frames', 'card.' + (i + 1) + '.opening', FX[i] + 22, FY[i] + 26, FW - 44, FH - 82, '#FF924221');
  add('frames', 'card.' + (i + 1) + '.tab', FX[i] + FW / 2 - 11, FY[i] + 1, 22, 9, '#FFFBFBFB', 100002);
}

// ⑦ 按钮组件 ──────────────────────────────────────────────────────────────
// 凹五边形 = 1 个四边形 + 2 个三角形。100003 在 .gil 里是「先按 w×h 画等腰三角、
// 再整体旋转」，旋转 ±90° 后包围盒会交换 w/h。旧版直接把 (42,95) 当成旋转后的
// 尺寸，实机里变成一条横躺的黑三角；这里预先交换成 (95,42) 并锁住凹口中心。
// 第二个更小的三角只做凹口内侧的渐深阴影，凹口本身用背景色而非死黑。
const NOTCH_BG = '#FF1A0E08';
add('buttons', 'back.shadow', 27, 140, 209, 95, '#66000000', 106057);
add('buttons', 'back.ribbon', 19, 131, 209, 95, '#FFA87B6B');
add('buttons', 'back.notch', 159.5, 157, 95, 42, NOTCH_BG, 100003, 90);
add('buttons', 'back.notch.shade', 166, 164, 81, 28, '#66000000', 100003, 90);
// 结算：设计图里旗形左端的「V 形咬合」其实来自黄色块右侧的一个凸尖，
// 而不是在旗形上挖洞。645 之前挖的深色凹口被黄色旋转矩形整块盖住，实机完全看不见。
// 改为：褐色旗形保持矩形，黄色块右端补一枚带深棕描边的黄色三角尖插进旗形。
add('buttons', 'settle.shadow', 1685, 840, 209, 95, '#66000000', 106057);
add('buttons', 'settle.ribbon', 1677, 831, 209, 95, '#FF825447');
// 黄色斜方块：设计图包围盒 [1330,623,134,144]，缩窄并右下移后右尖压进旗形。
add('buttons', 'settle.yellow.shadow', 1627, 772, 112, 140, '#66000000', 106057, 27);
add('buttons', 'settle.yellow.edge', 1616, 760, 118, 148, '#FF6B2B12', 100001, 27);
add('buttons', 'settle.yellow', 1620, 764, 112, 140, '#FFFFD133', 100001, 27);
// 100003 旋转 -90° 后包围盒交换 w/h。尖端必须明显凸出黄色旋转矩形的右边缘，
// 否则整个三角会被盖住。不画独立描边：斜线会落在黄色块内部变成划痕，
// 竖直底边也会留下一条突兀的分界线；黄色尖与主体同色即可自然融合。
add('buttons', 'settle.yellow.tip', 1690, 852, 92, 46, '#FFFFD133', 100003, -90);
txt('settle.text', '结算', 1725, 838, 145, 78, 54, '#2A1A14');
// 左右翻页装饰：不再用 3 个 45° 旋转矩形拼合（实机会带一圈灰白光晕），
// 直接引用官方素材 105162「黄色鱼尾菱形 + 棕边 + 中心深色」，一个控件即可。
// rotation 180 把原素材的「左尖右凹」镜像成设计图的「左凹右尖」；180° 不交换轴，安全。
for (const [tag, cx] of [['left', 79], ['right', 1838]]) {
  add('buttons', 'diamond.' + tag, cx - 29, 505, 58, 68, '#FFFFFFFF', 105162, 180);
}

// ── 功能控件：保持 640 返回按钮形状、命中层、卡片透明、结算底透明 ────────────────
// select.back 恢复 640 原值（100109 / 62×62 / pos -709,296.9），形状不再被拉宽。
const back = R('select.back');
place(back, -709, 296.9, 62, 62);
const backIp = ns(back.field, [505, 503, 84])[0];
number(backIp, 503, 100109); number(backIp, 502, 0xFFFFFFFF); number(backIp, 504, 1);
// 返回热区覆盖整面褐色旗形
place(R('hit.select.back'), 16 * S + 174 * S / 2 - 800, 450 - (109 * S + 79 * S / 2), 174 * S, 79 * S);
// 四张卡保持透明，让独立相框层显示
for (let i = 1; i <= 4; i++) {
  const c = R('select.card.' + i), ip = ns(c.field, [505, 503, 84])[0];
  if (ip) { number(ip, 503, 100001); number(ip, 502, 0x00FFFFFF); number(ip, 504, 1); }
}
// 结算按钮：只把原蓝色胶囊底（107179）改成透明；文字 / 事件 / 命中区全部不动。
const settle = R('settle.btn');
for (const ch of g.recs.filter(r => r.parentId === settle.id && r.name === 'bg')) {
  const ip = ns(ch.field, [505, 503, 84])[0];
  if (ip) number(ip, 502, 0x00FFFFFF);
}
// 原 label 是一枚 24px 白色小字，会与独立文字层 art645.select.settle.text 形成重影。
// 文本内容与事件全部保留，只把它自己的字色置透明，视觉文字由设计图样式层承担。
for (const ch of g.recs.filter(r => r.parentId === settle.id && r.name === 'label')) {
  const p = ns(ch.field, [505, 503, 75])[0];
  if (p) number(p, 504, 0x00FFFFFF);
}

// ── 客户端脚本：只加一个每帧显隐同步（原 sync_art642 从未被调用，保持不动） ──────
let leaf = findScriptLeaf(g).field, script = leaf.payload.toString();
const marker = 'local TPL_PROBE_DONE = false';
if (!script.includes(marker)) throw Error('找不到脚本标记');
const fn = `-- 645: select screen keeps the 640 back arrow; hide only the stock blue settle capsule.\r
local art645_screen = nil\r
local function sync_art645()\r
  local cur = Murdoku.current()\r
  local ad = cur and cur.adapter\r
  local ctrl = cur and cur.controller\r
  if not ad or not ctrl then return end\r
  local sel = ctrl.screen == "select"\r
  if sel == art645_screen then return end\r
  local bg = ad:sub("settle.btn", "bg")\r
  if bg then pcall(function() bg.imageColor = sel and 0x00FFFFFF or 0xFFFFFFFF end) end\r
  local lb = ad:sub("settle.btn", "label")\r
  if lb then pcall(function() lb.textColor = 0x00FFFFFF end) end\r
  art645_screen = sel\r
end\r
\r
`;
const callRe = /(  sync_art641\(\)\r?\n)(  sync_block640\(\))/;
if (!callRe.test(script)) throw Error('找不到 OnUpdate 调用点');
script = script.replace(marker, fn + marker).replace(callRe, '$1  sync_art645()\r\n$2');
if (!script.includes('sync_art645()')) throw Error('645 同步未写入');
leaf.payload = Buffer.from(script); leaf.len = leaf.payload.length;

// ── S2 规格 + S3 离线预览（与写档同一份层表） ────────────────────────────────
fs.mkdirSync(path.join(dir, '_tmp'), { recursive: true });
fs.writeFileSync(path.join(dir, 'select_spec_645.json'), JSON.stringify({
  version: 1, name: 'select-645', method: 'independent_named_layers',
  source: 'CC44B001D24456D66EB07944320485DF.png (1920x1080)',
  canvas: [1600, 900], scale: S, base: path.basename(input),
  primitives: [100001, 100002, 100003, 106056, 106057],
  officialSprites: [105162],
  groups: GROUPS, hiddenOldLayers: hidden, layers,
}, null, 2));

// 官方素材（非基础形状）在离线预览里直接贴本地 sprite 缓存，避免画成白矩形。
const SPRITE_ROOTS = ['qianxing-murdoku/tools/qx/sprites', '_work/art-slot/sprites-extra'];
const spritePaths = new Map();
(function indexSprites(d, depth) {
  if (!fs.existsSync(d) || depth > 3) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) indexSprites(p, depth + 1);
    else if (/^\d{6}\.png$/.test(e.name)) {
      const id = Number(e.name.slice(0, 6));
      if (!spritePaths.has(id)) spritePaths.set(id, p);
    }
  }
})(path.join(root, SPRITE_ROOTS[0]), 0);
const BASE_IDS = new Set([100001, 100002, 100003, 106056, 106057]);
const spriteImgs = new Map();
for (const l of layers) {
  const id = l.imageId;
  if (id && !BASE_IDS.has(id) && spritePaths.has(id) && !spriteImgs.has(id))
    spriteImgs.set(id, await loadImage(spritePaths.get(id)));
}

function css(color) {
  const v = parseInt(color.length === 9 ? color.slice(1) : color.replace('#', 'FF'), 16);
  return `rgba(${(v >>> 16) & 255},${(v >>> 8) & 255},${v & 255},${((v >>> 24) & 255) / 255})`;
}
const cv = createCanvas(1600, 900), c = cv.getContext('2d');
c.fillStyle = '#130E0B'; c.fillRect(0, 0, 1600, 900);
function radial(col) {
  const v = parseInt(col.length === 9 ? col.slice(1) : col.replace('#', 'FF'), 16);
  const r = (v >>> 16) & 255, gg = (v >>> 8) & 255, b = v & 255, a = ((v >>> 24) & 255) / 255;
  const gr = c.createRadialGradient(0.5, 0.5, 0, 0.5, 0.5, 0.5);
  gr.addColorStop(0, `rgba(${r},${gg},${b},${a})`);
  gr.addColorStop(0.5, `rgba(${r},${gg},${b},${a * .45})`);
  gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  return gr;
}
for (const l of layers) {
  const X = l.x * S, Y = l.y * S, W = l.w * S, H = l.h * S, cx = X + W / 2, cy = Y + H / 2;
  c.save(); c.translate(cx, cy); c.rotate((-l.rotation || 0) * Math.PI / 180); c.translate(-cx, -cy);
  if (l.text) {
    c.fillStyle = css(l.color); c.font = `bold ${l.size * S}px "Microsoft YaHei", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(l.text, cx, cy);
  } else if (l.imageId === 106056 || l.imageId === 106057) {
    c.save(); c.translate(X, Y); c.scale(W, H); c.fillStyle = radial(l.color); c.fillRect(0, 0, 1, 1); c.restore();
  } else if (spriteImgs.has(l.imageId)) {
    c.drawImage(spriteImgs.get(l.imageId), X, Y, W, H);
  } else {
    c.fillStyle = css(l.color);
    if (l.imageId === 100002) { c.beginPath(); c.ellipse(cx, cy, W / 2, H / 2, 0, 0, Math.PI * 2); c.fill(); }
    else if (l.imageId === 100003) { c.beginPath(); c.moveTo(cx, Y); c.lineTo(X, Y + H); c.lineTo(X + W, Y + H); c.closePath(); c.fill(); }
    else c.fillRect(X, Y, W, H);
  }
  c.restore();
}
fs.writeFileSync(path.join(dir, '_tmp/select645_preview.png'), cv.toBuffer('image/png'));

// ── S4 写档 + S6 磁盘重读校验 ───────────────────────────────────────────────
if (DRY) {
  console.log(JSON.stringify({ dryRun: true, layers: layers.length, hiddenOldLayers: hidden,
    preview: path.join(dir, '_tmp/select645_preview.png'), spec: path.join(dir, 'select_spec_645.json') }, null, 2));
  process.exit(0);
}
const expected = new Map([...g.recs, ...added].map(r => [r.id, encodeMsg([r.field])]));
writeGil(g, output, {
  label: '645 select art by design', expectRecs: expected.size,
  assert(t) {
    if (!findScriptLeaf(t).buf.equals(Buffer.from(script))) return 'script mismatch';
    for (const r of t.recs) if (!expected.get(r.id)?.equals(encodeMsg([r.field]))) return 'record mismatch ' + r.name;
    return true;
  },
});
const disk = readGil(output);
const names = new Set(disk.recs.map(r => r.name));
for (const l of layers) if (!names.has('art645.select.' + l.name)) throw Error('磁盘缺层 ' + l.name);
const diskLeaf = findScriptLeaf(disk);
if (!diskLeaf.buf.toString().includes('sync_art645()')) throw Error('磁盘脚本缺 645 同步');
console.log(JSON.stringify({
  output, records: disk.recs.length, added: added.length, hiddenOldLayers: hidden,
  layers: layers.length, groups: GROUPS.map(n => [n, layers.filter(l => l.group === n).length]),
  backButton: '640 shape: 100109 / 62x62 / pos(-709,296.9)',
  settle: 'blue capsule -> transparent; ribbon built from independent layers',
  preview: path.join(dir, '_tmp/select645_preview.png'),
  spec: path.join(dir, 'select_spec_645.json'),
}, null, 2));
