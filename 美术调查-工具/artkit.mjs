#!/usr/bin/env node
// artkit.mjs —— 千星奇域「复杂美术」智能体工具包（零依赖，Node >= 18）
//
// 定位：把社区两条已被验证的美术生产线，做成智能体可直接调用的 CLI。
//   A. 拼图线：内置 1543 素材 + 官方基础形状(100001-100006) + 文本框
//      → 生成编辑器 scene JSON → POST /api/export/{lua|gia|json|css|svg|png}
//      → 得到【客户端 Lua 绘制脚本】或【素材组 GIA】。
//   B. 拟合线：任意参考图 → qx-img 图元拟合 → 客户端 Lua 绘制脚本 / GIA。
//   C. 校验：GIA 容器头、Lua 绘制脚本关键字段与控件预算。
//
// 该工具只调用公开 HTTP API，不修改游戏文件、不读取账号数据、不复制素材图。
// 生成物中的美术由「官方基础形状 + 官方素材 + 颜色/透明度/变换/层叠」构成。
//
// 用法见同目录 README.md。所有子命令都支持 --json 输出机器可读结果。
//
// 免责声明：本工具产出的脚本/资产能否在目标版本真机使用，须按 README 的
// 验收清单在「运行预览 + 真机」确认；第三方工具的 GIA 二进制不要手改。

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const EDITOR_BASE = process.env.ARTKIT_EDITOR_BASE || "https://qx.070077.xyz";
const FIT_BASE = process.env.ARTKIT_FIT_BASE || "https://qx-img.070077.xyz";
const CACHE_DIR = path.resolve(process.env.ARTKIT_CACHE || path.join(process.cwd(), ".artkit-cache"));
const CATALOG_FILE = path.join(CACHE_DIR, "library-catalog.json");

const BASE_SHAPES = {
  rectangle: 100001,
  circle: 100002, // 官方素材名：圆形/椭圆；编辑器类型 ellipse
  triangle: 100003,
  four_point_star: 100004,
  five_point_star: 100005,
  ring: 100006,
};
const SHAPE_TYPES = ["ellipse", "rectangle", "triangle", "four_point_star", "five_point_star", "ring", "textbox", "image", "prefab"];

// ---------- CLI 解析 ----------
function parseArgs(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const eq = a.indexOf("=");
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}
const args = process.argv.slice(2);
const cmd = args[0] || "help";
const o = parseArgs(args.slice(1));
const has = (k) => Object.prototype.hasOwnProperty.call(o, k);
const str = (k, d = undefined) => (has(k) ? String(o[k]) : d);
const num = (k, d) => (has(k) ? Number(o[k]) : d);
const bool = (k) => has(k) && o[k] !== "false" && o[k] !== "0";
const jsonOut = bool("json");
const say = (...a) => { if (!jsonOut) console.log(...a); };

function emit(obj) {
  if (jsonOut) console.log(JSON.stringify(obj, null, 2));
  else if (obj && obj.text) console.log(obj.text);
}
function die(msg, code = 1) { console.error("artkit: " + msg); process.exit(code); }
function fmtKB(n) { return (n / 1024).toFixed(1) + " KB"; }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) { ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

// ---------- 素材目录 ----------
async function fetchCatalog(force = false) {
  if (!force && fs.existsSync(CATALOG_FILE) && fs.statSync(CATALOG_FILE).size > 1000) return readJson(CATALOG_FILE);
  say("拉取素材目录 " + EDITOR_BASE + "/api/library/catalog ...");
  const r = await fetch(EDITOR_BASE + "/api/library/catalog", { headers: { Accept: "application/json" } });
  if (!r.ok) die("素材目录 HTTP " + r.status, 3);
  const text = await r.text();
  ensureDir(CACHE_DIR);
  fs.writeFileSync(CATALOG_FILE, text, "utf8");
  return JSON.parse(text);
}
function catList(cat) {
  const names = (cat.names && (cat.names["zh-CN"] || cat.names["en-US"])) || {};
  return Object.entries(cat.categories || {})
    .map(([id, v]) => ({ id: Number(id), name: names[id] || ("分类" + id), images: v.images || [] }))
    .sort((a, b) => b.images.length - a.images.length);
}
function catNameOf(cat, imageId) {
  for (const c of catList(cat)) if (c.images.includes(Number(imageId))) return c.name;
  return null;
}
function catalogStats(cat) {
  const cats = catList(cat);
  const total = Object.keys(cat.images || {}).length;
  const withBorder = Object.values(cat.images || {}).filter((v) => v && v.border).length;
  return { total, categories: cats.map((c) => ({ id: c.id, name: c.name, count: c.images.length, min: c.images[0], max: c.images[c.images.length - 1] })), withBorder };
}

// ---------- 场景构建 ----------
function scene(w, h, background = "#00000000") {
  return { canvas: { width: w, height: h, background }, elements: [], meta: { sourceType: "editor", sourceName: "artkit", warnings: [] } };
}
function pushEl(sc, type, e) {
  const base = { id: "e" + (sc.elements.length + 1), type, x: 0, y: 0, width: 64, height: 64, rotation: 0, opacity: type === "textbox" || type === "image" || type === "prefab" ? 1 : 0.85, zIndex: sc.elements.length, color: "#ffffff", isBackground: false };
  sc.elements.push(Object.assign(base, e));
  return sc;
}
function textbox(sc, e) {
  const box = Object.assign({
    text: "", fontSize: 20, autoSize: true, minFontSize: 8,
    textColor: e.color || "#F2EDE4", textOpacity: 1,
    bgColor: "#ffffff", bgOpacity: 0, outlineEnabled: false, outlineColor: "#333333", outlineOpacity: 0.2,
    alignH: "left", alignV: "middle", anchorType: "center", visible: true,
    scaleX: 1, scaleY: 1, anchorMinX: 0.5, anchorMinY: 0.5, anchorMaxX: 0.5, anchorMaxY: 0.5, pivotX: 0.5, pivotY: 0.5,
  }, e.textBox || {});
  return pushEl(sc, "textbox", Object.assign({}, e, { textBox: box }));
}

// 预设 1：线索卡 / 卡框（360x96，项目第三关线索卡尺寸）
function presetCardFrame() {
  const sc = scene(360, 96, "#00000000");
  pushEl(sc, "image", { name: "卡片底", x: 180, y: 48, width: 360, height: 96, imageAssetId: 107003, imageType: "stretch", color: "#ffffff", opacity: 1 });
  pushEl(sc, "image", { name: "内衬", x: 180, y: 48, width: 340, height: 74, imageAssetId: 106052, imageType: "stretch", color: "#d8d4d2", imageTint: true, opacity: 0.22 });
  pushEl(sc, "image", { name: "上分隔线", x: 180, y: 9, width: 342, height: 7, imageAssetId: 108008, imageType: "stretch", color: "#d8d4d2", imageTint: true, opacity: 0.9 });
  pushEl(sc, "image", { name: "下分隔线", x: 180, y: 87, width: 342, height: 7, imageAssetId: 108008, imageType: "stretch", color: "#d8d4d2", imageTint: true, opacity: 0.9 });
  pushEl(sc, "image", { name: "编号", x: 22, y: 48, width: 24, height: 30, imageAssetId: 109001, color: "#e3b25c", imageTint: true, opacity: 1 });
  pushEl(sc, "image", { name: "角色头像", x: 60, y: 48, width: 52, height: 64, imageAssetId: 112042, color: "#ffffff", opacity: 1 });
  pushEl(sc, "image", { name: "星饰", x: 330, y: 18, width: 18, height: 18, imageAssetId: 105253, color: "#e3b25c", imageTint: true, opacity: 1 });
  textbox(sc, { name: "角色名", x: 200, y: 34, width: 170, height: 22, color: "#f2ede4", textBox: { text: "角色 A", fontSize: 18, alignH: "left", alignV: "middle" } });
  textbox(sc, { name: "口供", x: 214, y: 66, width: 236, height: 22, color: "#b9b2c4", textBox: { text: "「日落后我一直在茶室。」", fontSize: 15, alignH: "left", alignV: "middle" } });
  return sc;
}

// 预设 2：徽记 / 图标（256x256）
function presetEmblem() {
  const sc = scene(256, 256, "#00000000");
  pushEl(sc, "rectangle", { name: "底", x: 128, y: 128, width: 256, height: 256, color: "#141b2e", opacity: 1 });
  pushEl(sc, "ring", { name: "外环", x: 128, y: 128, width: 200, height: 200, color: "#d8d4d2", opacity: 1 });
  pushEl(sc, "four_point_star", { name: "星芒", x: 128, y: 128, width: 150, height: 150, color: "#e3b25c", opacity: 0.9 });
  pushEl(sc, "image", { name: "头像", x: 128, y: 128, width: 96, height: 120, imageAssetId: 112042, color: "#ffffff", opacity: 1 });
  pushEl(sc, "five_point_star", { name: "角饰", x: 210, y: 46, width: 30, height: 30, color: "#e3b25c", opacity: 1 });
  textbox(sc, { name: "铭文", x: 128, y: 228, width: 220, height: 24, color: "#f2ede4", textBox: { text: "月 谕 · 法 师", fontSize: 16, alignH: "center", alignV: "middle" } });
  return sc;
}

// 预设 3：面板（512x512）
function presetPanel() {
  const sc = scene(512, 512, "#00000000");
  pushEl(sc, "image", { name: "夜色底版", x: 256, y: 256, width: 512, height: 512, imageAssetId: 107280, imageType: "stretch", color: "#ffffff", opacity: 1 });
  pushEl(sc, "image", { name: "面板", x: 256, y: 256, width: 420, height: 420, imageAssetId: 107003, imageType: "stretch", color: "#ffffff", opacity: 0.95 });
  pushEl(sc, "image", { name: "上花饰", x: 256, y: 62, width: 300, height: 24, imageAssetId: 105253, color: "#c9b6a0", imageTint: true, opacity: 0.9 });
  pushEl(sc, "image", { name: "下花饰", x: 256, y: 450, width: 300, height: 24, imageAssetId: 105253, color: "#c9b6a0", imageTint: true, opacity: 0.9 });
  pushEl(sc, "image", { name: "四角·左上", x: 82, y: 82, width: 36, height: 36, imageAssetId: 105226, color: "#d8d4d2", imageTint: true, opacity: 1 });
  pushEl(sc, "image", { name: "四角·右上", x: 430, y: 82, width: 36, height: 36, imageAssetId: 105226, color: "#d8d4d2", imageTint: true, opacity: 1 });
  pushEl(sc, "image", { name: "四角·左下", x: 82, y: 430, width: 36, height: 36, imageAssetId: 105226, color: "#d8d4d2", imageTint: true, opacity: 1 });
  pushEl(sc, "image", { name: "四角·右下", x: 430, y: 430, width: 36, height: 36, imageAssetId: 105226, color: "#d8d4d2", imageTint: true, opacity: 1 });
  textbox(sc, { name: "标题", x: 256, y: 120, width: 380, height: 40, color: "#f2ede4", textBox: { text: "月 谕 宴 的 失 窃", fontSize: 26, alignH: "center", alignV: "middle" } });
  return sc;
}

const PRESETS = { "card-frame": presetCardFrame, emblem: presetEmblem, panel: presetPanel };

// ---------- 导出 ----------
async function exportScene(kind, scenePath, outPath, groupName) {
  const sc = readJson(scenePath);
  const body = JSON.stringify({ scene: sc, giaGroupName: groupName || path.basename(scenePath, ".json") });
  const url = EDITOR_BASE + "/api/export/" + kind;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok) die("导出 HTTP " + r.status + "：" + buf.toString("utf8").slice(0, 300), 4);
  if (outPath) { ensureDir(path.dirname(outPath)); fs.writeFileSync(outPath, buf); }
  const info = { kind, url, http: r.status, bytes: buf.length, out: outPath || null };
  if (kind === "gia") info.gia = checkGiaBuffer(buf);
  if (kind === "lua") info.lua = checkLuaText(buf.toString("utf8"));
  return info;
}

// ---------- 拟合 ----------
async function submitFit(imagePath, cfg) {
  const buf = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const fd = new FormData();
  fd.set("image", new Blob([buf], { type: mime }), path.basename(imagePath));
  fd.set("num_primitives", String(cfg.primitives));
  fd.set("num_primitives_manual", "");
  fd.set("primitives_json", JSON.stringify(cfg.shapes.map((t) => ({ type: t }))));
  if (cfg.shapes.includes("circle")) fd.set("shape_circle", "on");
  if (cfg.shapes.includes("rect")) fd.set("shape_rect", "on");
  if (cfg.shapes.includes("triangle")) fd.set("shape_triangle", "on");
  if (cfg.pngMode) fd.set("enable_png_mode", "on");
  fd.set("origin_type", "center");
  fd.set("output_alpha", "100");
  const r = await fetch(FIT_BASE + "/submit", { method: "POST", body: fd, redirect: "manual" });
  const loc = r.headers.get("location") || "";
  const tid = (loc.match(/(?:status|result)\/([^\/?]+)/) || [])[1];
  if (!tid) {
    const t = await r.text().catch(() => "");
    die("拟合提交失败：HTTP " + r.status + " loc=" + loc + " " + t.slice(0, 200), 5);
  }
  say("拟合任务 " + tid + "（图元 " + cfg.primitives + "，类型 " + cfg.shapes.join("/") + "）…");
  const deadline = Date.now() + cfg.timeout * 1000;
  let done = false;
  while (Date.now() < deadline) {
    await new Promise((res) => setTimeout(res, cfg.interval));
    const s = await fetch(FIT_BASE + "/status/" + tid, { redirect: "manual" });
    if (s.status === 302 || s.status === 303) { done = true; break; }
    if (s.status >= 400) die("拟合状态查询 HTTP " + s.status, 5);
  }
  if (!done) die("拟合超时（" + cfg.timeout + "s），任务 " + tid + " 可能仍在跑，可稍后手动下载", 5);
  return tid;
}
async function downloadFit(tid, kind, outDir) {
  const map = {
    lua: ["/download_lua/", "fit.lua"],
    "gia-overlimit": ["/download_overlimit_gia/", "fit-overlimit.gia"],
    "gia-classic": ["/download_classic_gia/", "fit-classic.gia"],
  };
  const [route, name] = map[kind] || die("未知拟合导出类型：" + kind, 2);
  const r = await fetch(FIT_BASE + route + tid);
  if (!r.ok) die("下载 " + kind + " HTTP " + r.status, 5);
  const buf = Buffer.from(await r.arrayBuffer());
  const out = path.join(outDir, name);
  ensureDir(outDir);
  fs.writeFileSync(out, buf);
  const info = { kind, bytes: buf.length, out };
  if (kind === "lua") info.lua = checkLuaText(buf.toString("utf8"));
  else info.gia = checkGiaBuffer(buf);
  return info;
}

// ---------- 校验 ----------
function checkGiaBuffer(buf) {
  const res = { ok: true, errors: [] };
  try {
    const sizeMinus4 = buf.readUInt32BE(0);
    const schema = buf.readUInt32BE(4);
    const magic = buf.readUInt32BE(8);
    const kind = buf.readUInt32BE(12);
    const bodyLen = buf.readUInt32BE(16);
    const trailer = bodyLen + 20 + 4 <= buf.length ? buf.readUInt32BE(20 + bodyLen) : -1;
    res.sizeMinus4 = sizeMinus4; res.schema = schema; res.magic = magic; res.kind = kind; res.bodyLen = bodyLen; res.trailerHex = trailer >= 0 ? "0x" + trailer.toString(16) : "越界";
    const okSize = sizeMinus4 === buf.length - 4;
    const okKind = kind === 3;
    const okTrailer = trailer === 0x679;
    const okBody = 20 + bodyLen + 4 === buf.length;
    res.okSize = okSize; res.okKind = okKind; res.okTrailer = okTrailer; res.okBody = okBody;
    if (!okSize) res.errors.push("文件大小字段不自洽");
    if (!okKind) res.errors.push("类型字段不是 3（.gia）");
    if (!okTrailer) res.errors.push("尾标记不是 0x00000679");
    if (!okBody) res.errors.push("体长与文件大小不自洽");
  } catch (e) { res.ok = false; res.errors.push("读取容器头失败：" + String(e)); }
  if (res.errors.length) res.ok = false;
  return res;
}
function checkLuaText(text) {
  const res = { ok: true, warnings: [], errors: [], syntaxChecked: false, elements: null, textboxes: null, hasOnStart: /function\s+OnStart\s*\(/.test(text), hasOnDestroy: /function\s+OnDestroy\s*\(/.test(text) };
  const imgPrefab = text.match(/local\s+IMAGE_PREFAB_ID\s*=\s*(\d+)/);
  const txtPrefab = text.match(/local\s+TEXTBOX_PREFAB_ID\s*=\s*(\d+)/);
  res.imagePrefabId = imgPrefab ? Number(imgPrefab[1]) : null;
  res.textboxPrefabId = txtPrefab ? Number(txtPrefab[1]) : null;
  const elemMatch = text.match(/local\s+ELEMENTS\s*=\s*\{([\s\S]*?)\n\}/);
  if (elemMatch) {
    const rows = elemMatch[1].split("\n").filter((l) => /^\s*\{/.test(l));
    res.elements = rows.length;
  }
  const boxMatch = text.match(/local\s+TEXTBOXES\s*=\s*\{([\s\S]*?)\n\}/);
  if (boxMatch) res.textboxes = (boxMatch[1].match(/\{\["name"\]/g) || []).length;
  const drawOrder = text.match(/local\s+DRAW_ORDER\s*=\s*\{([\s\S]*?)\n\}/);
  if (drawOrder) res.drawOrder = (drawOrder[1].match(/^\s*\{/gm) || []).length;
  if (!res.hasOnStart) res.errors.push("缺少 OnStart");
  if (!res.hasOnDestroy) res.warnings.push("缺少 OnDestroy（重复进入可能泄漏控件）");
  if (res.elements === null && res.textboxes === null) {
    if (!/InstantiateClientUIControl/.test(text)) res.errors.push("既没有 ELEMENTS/TEXTBOXES 数据表，也没有 InstantiateClientUIControl 调用");
  }
  if (res.imagePrefabId === 0) res.warnings.push("IMAGE_PREFAB_ID=0：接入前必须填写图片控件的控件模板索引");
  if (res.textboxPrefabId === 0) res.warnings.push("TEXTBOX_PREFAB_ID=0：接入前必须填写文本框控件的控件模板索引");
  const controls = (res.elements || 0) + (res.textboxes || 0);
  res.estimatedControls = controls;
  if (controls === 0) res.warnings.push("估计控件数=0：结果为空场景？");
  if (!res.errors.length && res.ok === true) { /* keep */ }
  if (res.errors.length) res.ok = false;
  return res;
}

// ---------- 子命令 ----------
async function cmdCatalog() {
  const cat = await fetchCatalog(bool("refresh"));
  const stats = catalogStats(cat);
  if (has("id")) {
    const id = Number(o.id);
    const img = (cat.images || {})[id];
    const info = { id, category: catNameOf(cat, id), entry: img || null, spriteUrl: img ? EDITOR_BASE + "/api/library/sprite/" + id + ".png" : null };
    emit(jsonOut ? info : { text: JSON.stringify(info, null, 2), ...info });
    return;
  }
  if (has("category")) {
    const want = String(o.category);
    const c = catList(cat).find((x) => x.name === want || String(x.id) === want);
    if (!c) die("找不到分类「" + want + "」。可选：" + catList(cat).map((x) => x.name).join(" / "), 2);
    const ids = c.images;
    emit({ text: c.name + "（" + ids.length + " 个）：\n" + ids.join(", "), category: c.name, count: ids.length, ids });
    return;
  }
  const table = stats.categories.map((c) => c.name.padEnd(12, " ") + String(c.count).padStart(4) + "  " + c.min + "–" + c.max).join("\n");
  emit({ text: "素材总数 " + stats.total + "，14 类（有 border 字段 " + stats.withBorder + " 个）：\n" + table, ...stats });
}

async function cmdScene() {
  if (has("list") || !has("preset")) {
    emit({ text: "可用预设：\n" + Object.keys(PRESETS).map((k) => "  --preset=" + k).join("\n") + "\n也可用 --scene=<file> 自行提供 scene JSON。" });
    if (!has("preset")) return;
  }
  const name = String(o.preset);
  const build = PRESETS[name];
  if (!build) die("未知预设「" + name + "」。可选：" + Object.keys(PRESETS).join(" / "), 2);
  const sc = build();
  const out = str("out") || path.join(process.cwd(), "artkit-" + name + ".json");
  writeJson(out, sc);
  const n = sc.elements.length;
  emit({ text: "已生成场景 " + out + "（" + sc.canvas.width + "×" + sc.canvas.height + "，" + n + " 个元素，估计 " + n + " 个客户端控件）\n下一步：artkit export --scene=" + out + " --kind=lua", out, elements: n, width: sc.canvas.width, height: sc.canvas.height });
}

async function cmdExport() {
  if (!has("scene")) die("需要 --scene=<file>", 2);
  if (!has("kind")) die("需要 --kind=lua|gia|json|css|svg|png", 2);
  const kind = String(o.kind);
  const out = str("out") || path.join(process.cwd(), "artkit-export-" + Date.now() + "." + (kind === "gia" ? "gia" : kind));
  const info = await exportScene(kind, String(o.scene), out, str("name"));
  const lines = ["导出成功（" + kind + "，HTTP " + info.http + "，" + fmtKB(info.bytes) + "）→ " + out];
  if (info.gia) lines.push("GIA 头校验：" + (info.gia.ok ? "通过" : "失败：" + info.gia.errors.join("；")));
  if (info.lua) {
    lines.push("Lua 校验：" + (info.lua.ok ? "通过" : "失败：" + info.lua.errors.join("；")));
    lines.push("  图元控件 " + (info.lua.elements ?? "?") + " 个、文本框 " + (info.lua.textboxes ?? "?") + " 个；IMAGE_PREFAB_ID=" + info.lua.imagePrefabId + "、TEXTBOX_PREFAB_ID=" + info.lua.textboxPrefabId);
    for (const w of info.lua.warnings) lines.push("  ⚠ " + w);
  }
  emit({ text: lines.join("\n"), ...info });
}

async function cmdFit() {
  if (!has("image")) die("需要 --image=<file>", 2);
  const image = String(o.image);
  if (!fs.existsSync(image)) die("图片不存在：" + image, 2);
  const cfg = {
    primitives: Math.max(40, Math.min(3000, num("primitives", 400))),
    shapes: (str("shapes", "circle") || "circle").split(",").map((s) => s.trim()).filter((s) => ["circle", "rect", "triangle"].includes(s)),
    pngMode: bool("png-mode"),
    timeout: num("timeout", 300),
    interval: num("interval", 2000),
  };
  if (!cfg.shapes.length) cfg.shapes = ["circle"];
  const outDir = str("outdir") || path.join(process.cwd(), "artkit-fit");
  const kinds = (str("kinds", "lua") || "lua").split(",").map((s) => s.trim());
  const tid = await submitFit(image, cfg);
  const results = [];
  for (const k of kinds) results.push(await downloadFit(tid, k, outDir));
  const lines = ["拟合完成（任务 " + tid + "）→ " + outDir];
  for (const r of results) {
    lines.push("  " + r.kind + "：" + fmtKB(r.bytes) + " → " + r.out);
    if (r.lua) lines.push("    Lua 校验：" + (r.lua.ok ? "通过" : "失败：" + r.lua.errors.join("；")) + "；控件约 " + r.lua.estimatedControls + " 个；IMAGE_PREFAB_ID=" + r.lua.imagePrefabId);
    if (r.gia) lines.push("    GIA 头校验：" + (r.gia.ok ? "通过" : "失败：" + r.gia.errors.join("；")));
  }
  emit({ text: lines.join("\n"), taskId: tid, results });
}

function cmdCheck() {
  if (!has("file")) die("需要 --file=<file>", 2);
  const file = String(o.file);
  if (!fs.existsSync(file)) die("文件不存在：" + file, 2);
  const buf = fs.readFileSync(file);
  const kind = str("kind") || (file.toLowerCase().endsWith(".gia") ? "gia" : "lua");
  let info;
  if (kind === "gia") info = checkGiaBuffer(buf);
  else if (kind === "lua") info = checkLuaText(buf.toString("utf8"));
  else die("kind 只能是 gia 或 lua", 2);
  const budget = num("budget", 1000);
  let budgetExceeded = false;
  if (kind === "lua" && info.estimatedControls > budget) {
    budgetExceeded = true;
    info.warnings = info.warnings || [];
    info.warnings.push("控件数 " + info.estimatedControls + " 超过预算 " + budget + "（单界面控件组官方上限 1000）");
  }
  const ok = info.ok && (!info.warnings || info.warnings.length === 0 || !bool("strict"));
  emit({ text: JSON.stringify({ file, kind, ok, budgetExceeded, ...info }, null, 2), file, kind, ok, budgetExceeded, ...info });
  if (!ok || budgetExceeded) process.exitCode = 6;
}

async function cmdVerify() {
  const report = { editorBase: EDITOR_BASE, fitBase: FIT_BASE, checks: [] };
  const add = (name, ok, detail) => { report.checks.push({ name, ok, detail }); say((ok ? "✅ " : "❌ ") + name + "：" + detail); };
  try {
    const r = await fetch(EDITOR_BASE + "/api/library/catalog", { headers: { Accept: "application/json" } });
    const t = await r.text();
    let n = 0; try { n = Object.keys(JSON.parse(t).images || {}).length; } catch { }
    add("素材目录", r.ok && n > 0, "HTTP " + r.status + "，" + n + " 个素材，" + t.length + " 字节");
  } catch (e) { add("素材目录", false, String(e)); }
  try {
    const sc = scene(64, 64, "#00000000");
    pushEl(sc, "rectangle", { x: 32, y: 32, width: 64, height: 64, color: "#2b3a55", opacity: 1 });
    const r = await fetch(EDITOR_BASE + "/api/export/lua", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scene: sc, giaGroupName: "artkit-verify" }) });
    const t = await r.text();
    add("Lua 导出", r.ok && /ELEMENTS/.test(t), "HTTP " + r.status + "，" + t.length + " 字节");
  } catch (e) { add("Lua 导出", false, String(e)); }
  try {
    const r = await fetch(FIT_BASE + "/", { redirect: "manual" });
    add("拟合站", r.status < 500, "HTTP " + r.status);
  } catch (e) { add("拟合站", false, String(e)); }
  const ok = report.checks.every((c) => c.ok);
  emit({ text: (jsonOut ? "" : "") + (ok ? "全部可用" : "存在不可用项，见上"), ok, ...report });
  if (!ok) process.exitCode = 7;
}

function cmdRecipes() {
  emit({ text: [
    "千星复杂美术 · 路线与配方（详见《美术调查-智能体工作流》）",
    "  A1 内置素材拼图 → Lua：适合卡框/图标/HUD/头像组合；成本最低",
    "  A2 内置素材拼图 → GIA：用于编辑器静态摆放/素材组（客户端需再转 Lua）",
    "  B1 参考图拟合 → Lua：任意位图（立绘感/复杂纹样），控件数≈图元数",
    "  B2 参考图拟合 → GIA：素材组资产（超限/经典模式）",
    "  C  像素化/矩形合并 → Lua：追求高保真时的高风险路线（控件数巨大）",
    "  D  .gil 场景装饰平面：3D 场景海报，实验性，不进客户端 UI",
    "",
    "通用规律：复杂度来自「控件实例的组合」——官方 6 张基础形状(100001–100006)",
    "+ 1543 张素材 + 颜色/透明度/缩放/旋转/九宫格/层叠，而不是「新图片」。",
  ].join("\n") });
}

function usage() {
  console.log([
    "artkit.mjs —— 千星复杂美术智能体工具包（零依赖）",
    "",
    "  catalog  [--refresh] [--stats] [--id=105104] [--category=造物] [--json]",
    "  scene    --preset=card-frame|emblem|panel [--out=x.json] [--list]",
    "  export   --scene=x.json --kind=lua|gia|json|css|svg|png [--out=y] [--name=组名]",
    "  fit      --image=x.png [--primitives=400] [--shapes=circle|rect|triangle] [--png-mode]",
    "           [--kinds=lua,gia-overlimit,gia-classic] [--outdir=dir] [--timeout=300]",
    "  check    --file=x.lua|x.gia [--kind=lua|gia] [--budget=1000] [--strict]",
    "  verify   探测素材目录/导出/拟合站是否可用",
    "  recipes  查看路线与配方",
    "",
    "环境变量：ARTKIT_EDITOR_BASE、ARTKIT_FIT_BASE、ARTKIT_CACHE",
    "所有子命令均支持 --json。",
  ].join("\n"));
}

const commands = {
  catalog: cmdCatalog, scene: cmdScene, export: cmdExport, fit: cmdFit,
  check: cmdCheck, verify: cmdVerify, recipes: cmdRecipes,
  help: async () => usage(),
};
const fn = commands[cmd];
if (!fn) { usage(); die("未知子命令：" + cmd, 2); }
const EXIT_BY_CMD = { catalog: 3, export: 4, fit: 5, check: 6, verify: 7 };
try {
  await fn();
} catch (e) {
  console.error("artkit(" + cmd + "): " + (e && e.stack ? e.stack : String(e)));
  process.exit(EXIT_BY_CMD[cmd] || 1);
}
