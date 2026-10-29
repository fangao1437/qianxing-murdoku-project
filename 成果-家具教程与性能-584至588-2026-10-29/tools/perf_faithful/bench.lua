--[[----------------------------------------------------------------------------
  tools/perf_faithful/bench.lua —— 加载时间 / 关键操作的引擎调用账（真实控件树，v362）

  用法（在工程根目录；路径用 ASCII 相对路径 —— Lua 在中文路径下拿不到参数）：
    lua tools/perf_faithful/bench.lua <tree.lua> <client_script.lua> <标签> [--attr]
      tree.lua           node tools/perf_faithful/export_tree.mjs <存档.gil> 的产物
      client_script.lua  要量的打包产物（例如 dist/client_script.lua，或旧版存档里抽出来的那份）
      标签               输出文件名后缀：out/result_<标签>.txt、out/state_<标签>.txt、out/log_<标签>.txt
      --attr             每个阶段额外列出"引擎调用最多的前 4 个调用方"

  场景（与真机流程一致）：开局 → 首页 → 选关 → 第一关（教程翻页、点线索卡、选人、点格子、撤销、
    返回确认、按答案放完、提交、指认、结算）→ 第二关 → 第三关 → 回首页。

  每阶段记：引擎调用次数（跨 Lua↔引擎边界的总笔数）、GetChildren/GetChild、`.name` 读、
    实例化的模板节点数、SetVisible、该阶段日志里的 [ERR] 行数、Lua CPU 毫秒（本机，仅供参考）。
  结束时把**最终界面状态**（每个控件：路径+兄弟序号 / 显隐 / 激活 / 尺寸 / 位置 / 文字 / 图片 / 缩放）
    写进 out/state_<标签>.txt —— 两个版本跑同一场景，这个文件逐行相同 = 界面结果相同。
  对比两次：lua tools/perf_faithful/compare.lua <旧标签> <新标签>
----------------------------------------------------------------------------]]--
local HERE = ((arg and arg[0] or ""):match("^(.*)[/\\][^/\\]*$") or ".") .. "/"
local TREE, SCRIPT, LABEL = arg[1], arg[2], arg[3] or "run"
local ATTR_PHASES = false
for i = 4, #arg do if arg[i] == "--attr" then ATTR_PHASES = true end end
if TREE == nil or SCRIPT == nil then
  print("用法：lua tools/perf_faithful/bench.lua <tree.lua> <client_script.lua> <标签> [--attr]")
  os.exit(2)
end
local OUTDIR = HERE .. "out/"

local E = dofile(HERE .. "fake_engine.lua")
local out = print
local LOG = {}
_G.print = function(...)
  local t = {}
  for i = 1, select("#", ...) do t[#t + 1] = tostring((select(i, ...))) end
  LOG[#LOG + 1] = table.concat(t, " ")
end
_G.printerr = function(...) _G.print("[ERR]", ...) end

E.load(TREE)
E.install(1600.0, 900.0)
E.ATTR_ON = ATTR_PHASES

local rows = {}
local function phase(name, fn)
  LOG[#LOG + 1] = "=== PHASE " .. name
  E.reset()
  for k in pairs(E.ATTR) do E.ATTR[k] = nil end
  local before = #LOG
  local c0 = os.clock()
  local ok, err = pcall(fn)
  local ms = (os.clock() - c0) * 1000
  local s = E.snapshot()
  local errs = 0
  for i = before + 1, #LOG do if LOG[i]:find("[ERR]", 1, true) then errs = errs + 1 end end
  local top = nil
  if ATTR_PHASES then
    local t = {}
    for k, v in pairs(E.ATTR) do t[#t + 1] = { k, v } end
    table.sort(t, function(a, b) return a[2] > b[2] end)
    local o = {}
    for i = 1, math.min(4, #t) do o[#o + 1] = t[i][1] .. "=" .. t[i][2] end
    top = table.concat(o, "  ")
  end
  rows[#rows + 1] = { name = name, ok = ok, err = err, ms = ms, interop = E.interop(s), s = s, errs = errs, top = top }
end

local function frames(n, dt) for _ = 1, n do E.grid_reenter(); OnUpdate(dt or 1 / 60) end end

phase("compile+chunk", function() assert(loadfile(SCRIPT))() end)
phase("OnInit+OnStart", function() OnInit(); OnStart() end)
phase("first 30 frames", function() frames(30) end)
phase("next 120 frames", function() frames(120) end)

local dbg = _G.__murdoku_debug
local cur = dbg and dbg.Murdoku and dbg.Murdoku.current and dbg.Murdoku.current()
local ctrl = cur and cur.controller
local core = ctrl and ctrl.core
if ctrl == nil then out("!! 拿不到 __murdoku_debug.Murdoku.current().controller —— 开局失败？看 out/log_" .. LABEL .. ".txt") end
local function input(ev) ctrl:on_input(ev) end
local function fire_named(name, ev)
  local c = E.find(name)
  if c == nil then return false end
  return E.fire(c, ev or 1)
end

phase("steady home 60f", function() frames(60) end)
phase("go levelselect", function() input({ action = "levelselect" }); frames(1) end)
phase("levelselect +30f", function() frames(30) end)
phase("pick case_001", function() input({ action = "pick_level", id = "case_001" }); frames(1) end)
phase("case_001 +30f", function() frames(30) end)
phase("case_001 +120f", function() frames(120) end)
phase("steady level 60f", function() frames(60) end)
phase("tutorial l1 next x3", function() for _ = 1, 3 do fire_named("td.l1.btn.next", 1); frames(1) end end)
phase("tutorial l1 prev+close", function()
  fire_named("td.l1.btn.prev", 1); frames(1); fire_named("td.l1.btn.close", 1); frames(2)
end)
phase("grid card clicks", function()
  local grid = E.find("clues.grid")
  local d = grid and E.D[grid]
  if d and d.items then for i = 1, #d.items do E.fire(d.items[i], 1); frames(1) end end
end)
local sus = nil
pcall(function() for id in pairs(core.level.solution or {}) do if sus == nil or id < sus then sus = id end end end)
phase("tap suspect +1f", function() input({ action = "suspect", id = sus or "A" }); frames(1) end)
phase("click cell(1,1) +1f", function()
  input({ phase = "down", action = "click", r = 1, c = 1, x = 0, y = 0 })
  input({ phase = "up", action = "click", r = 1, c = 1, x = 0, y = 0 })
  input({ action = "click", r = 1, c = 1 }); frames(1)
end)
phase("after place +10f", function() frames(10) end)
phase("undo +1f", function() input({ action = "undo" }); frames(1) end)
phase("back_confirm +1f", function() input({ action = "back_confirm" }); frames(1) end)
phase("close_modal +1f", function() input({ action = "close_modal" }); frames(1) end)
phase("solve case_001", function()
  local sol = core.level and core.level.solution or {}
  local ids = {}
  for id in pairs(sol) do ids[#ids + 1] = id end
  table.sort(ids)
  for _, id in ipairs(ids) do
    local p = sol[id]
    input({ action = "suspect", id = id }); frames(1)
    pcall(function() ctrl:do_place(p.r, p.c) end); frames(1)
  end
  frames(5)
end)
phase("submit + accuse", function()
  input({ action = "submit" }); frames(2)
  input({ action = "confirm_yes" }); frames(5)
  input({ action = "accuse", id = "D" }); frames(5)
end)
local solved = core and core.status
phase("result +30f", function() frames(30) end)
phase("pick case_002", function()
  input({ action = "levelselect" }); frames(2); input({ action = "pick_level", id = "case_002" }); frames(1)
end)
phase("case_002 +60f", function() frames(60) end)
phase("pick case_003", function()
  input({ action = "levelselect" }); frames(2); input({ action = "pick_level", id = "case_003" }); frames(1)
end)
phase("case_003 +60f", function() frames(60) end)
phase("home", function() input({ action = "home" }); frames(1) end)
phase("home +30f", function() frames(30) end)

-- ── 输出 ────────────────────────────────────────────────────────────────────
local R = {}
local function w(line) R[#R + 1] = line; out(line) end
w(string.format("== %s  起始树 %d 节点  第一关结果 status=%s ==", LABEL, #E.nodes, tostring(solved)))
w(string.format("%-24s %9s %9s %9s %8s %8s %4s %8s", "phase", "interop", "GetChild", "getName", "inst", "SetVis", "err", "lua_ms"))
for _, r in ipairs(rows) do
  local s = r.s
  w(string.format("%-24s %9d %9d %9d %8d %8d %4d %8.1f%s", r.name, r.interop, (s.GetChildren or 0) + (s.GetChild or 0),
    s["get:name"] or 0, s.nodes_instantiated or 0, s.SetVisible or 0, r.errs, r.ms,
    r.ok and "" or ("  FAIL " .. tostring(r.err))))
  if r.top and r.top ~= "" then w("      " .. r.top) end
end
w(string.format("最终树 %d 节点", E.count_nodes()))

local function write(path, text)
  local fh = io.open(path, "wb")
  if fh == nil then out("!! 写不了 " .. path .. "（先建 tools/perf_faithful/out/ 目录）"); return end
  fh:write(text); fh:close()
end
write(OUTDIR .. "result_" .. LABEL .. ".txt", table.concat(R, "\n") .. "\n")
do -- 最终界面状态（逐控件，排序后写出）
  local D = E.D
  local lines = {}
  local function f(v) return type(v) == "number" and string.format("%.2f", v) or tostring(v) end
  local function walk(c, path, idx)
    local d = D[c]
    local p = path .. "/" .. tostring(d.name) .. "#" .. tostring(idx or 0)
    lines[#lines + 1] = table.concat({ p, tostring(d.vis), tostring(d.active), f(d.w), f(d.h), f(d.x), f(d.y),
      tostring(d.props.text), tostring(d.props.imageId),
      d.SetLocalScale and (f(d.SetLocalScale[1]) .. "," .. f(d.SetLocalScale[2])) or "-" }, "|")
    for i, k in ipairs(d.kids) do walk(k, p, i) end
  end
  walk(E.root, "", 0)
  table.sort(lines)
  write(OUTDIR .. "state_" .. LABEL .. ".txt", table.concat(lines, "\n") .. "\n")
end
write(OUTDIR .. "log_" .. LABEL .. ".txt", table.concat(LOG, "\n") .. "\n")
