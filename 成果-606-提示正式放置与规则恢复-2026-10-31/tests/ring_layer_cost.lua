-- tests/ring_layer_cost.lua  <基线 engine_adapter_qianxing.lua 路径> [当前路径]
-- 从两个版本的适配器源码抽取圆环/家具层相关方法，用假控件记录每个属性写入、读取和方法调用：
--   1. 每一步之后的可见状态（visible/fillAmount/imageColor/fillType）两版必须一致
--   2. 失效条件（句柄更换、初始化失败重试、fillType 被重置）覆盖
--   3. 统计调用次数
-- 本机 Lua 运行，不是引擎耗时或 FPS。
local base_path = arg[1]
local cur_path = arg[2] or "lua/engine_adapter_qianxing.lua"
assert(base_path, "usage: lua tests/ring_layer_cost.lua baseline.lua [current.lua]")

local function read(p) local f = assert(io.open(p, "rb")); local s = f:read("a"); f:close(); return (s:gsub("\r\n", "\n")) end

local function extract(src, name)
  local s = src:find("\nfunction Adapter:" .. name .. "%(")
  assert(s, "missing " .. name)
  local e = select(2, src:find("\nend\n", s, true))
  return src:sub(s + 1, e)
end

local NAMES = {"_paint_progress_ring", "_reset_ring_state", "set_verdict_ring", "clear_hold_ring",
  "clear_verdict_rings", "set_hold_ring", "_prepare_furn_layer"}

local function build(path)
  local src = read(path)
  local Adapter = {}
  local log = {n = 0}
  local env = setmetatable({Adapter = Adapter, M = {RING_GREEN = 1, RING_RED = 2}}, {__index = _G})
  env.E = function(name) return name end
  env.game = {}
  for _, n in ipairs(NAMES) do
    local code = src:find("\nfunction Adapter:" .. n .. "%(") and extract(src, n)
    if code then assert(load(code, "=" .. n, "t", env))() end
  end
  Adapter.warn_once = function() end
  return Adapter, log
end

local function fake(log, opts)
  opts = opts or {}
  local d = {name = "x", fillType = nil, fillAmount = 0}
  local o = {}
  local function bump() log.n = log.n + 1 end
  local methods = {
    SetVisible = function(_, v) bump(); if opts.fail_hide and not v then error("hide failed") end; d.visible = v end,
    SetActive = function(_, v) bump(); d.active = v end,
    SetFillRadial360 = function(_, t, a) bump(); if opts.fail_radial then error("no radial") end; d.fillAmount = a end,
    SetAnchorMin = function() bump() end, SetAnchorMax = function() bump() end, SetPivot = function() bump() end,
    SetSizeDelta = function(_, w, h) bump(); d.w, d.h = w, h end, SetAnchoredPosition = function() bump() end,
  }
  setmetatable(o, {
    __index = function(_, k) if methods[k] then return methods[k] end; if k ~= "name" then bump() end; return d[k] end,
    __newindex = function(_, k, v) bump(); d[k] = v end,
  })
  return o, d
end

local function snap(d) return table.concat({tostring(d.visible), tostring(d.fillAmount), tostring(d.imageColor), tostring(d.fillType)}, "|") end

local function run(path)
  local A, log = build(path)
  local a, da = fake(log); local b, db = fake(log)
  local trace = {}
  local function rec() trace[#trace + 1] = snap(da) .. "#" .. snap(db) end
  A._ring_inst, A._hold_ring_inst = {}, {}
  local function mk(cur) return function(self, id)
    local o = cur(id)
    if o then
      self._ring_inst[id] = o; self._hold_ring_inst[id] = o
      self._ring_active = self._ring_active or {}; self._ring_active[o] = true
    end
    return o
  end end
  local function pick(id) if id == "A" then return a elseif id == "B" then return b end end
  A._ensure_cell_ring = mk(pick); A._ensure_hold_ring = A._ensure_cell_ring
  for round = 1, 3 do
    for _, amt in ipairs({0.1, 0.5, 1}) do
      A:set_verdict_ring("A", true, amt); rec()
      A:set_verdict_ring("B", round % 2 == 0, amt); rec()
    end
    A:clear_verdict_rings(); rec()
    A:set_hold_ring("A", 0.2); rec(); A:set_hold_ring("A", 0.9); rec()
    A:clear_hold_ring(); rec()
  end
  -- fillType reset by engine while hidden -> must re-initialise
  A:set_verdict_ring("A", true, 0.4); da.fillType = nil; A:clear_verdict_rings(); da.fillType = nil
  A:set_verdict_ring("A", true, 0.6); rec()
  -- Every radial configuration field can be reset while hidden.
  for _, field in ipairs({"imageType", "enableMask", "reverseMaskArea", "enableSoftEdge", "fillRadialType"}) do
    A:clear_verdict_rings()
    da[field] = "reset"
    assert(A:set_verdict_ring("A", true, 0.7))
    assert(da.imageType == "ImageType.Basic" and da.enableMask == true
      and da.reverseMaskArea == false and da.enableSoftEdge == false
      and da.fillRadialType == "ImageFillRadialType.Top")
    rec()
  end
  -- A failed hide must remain eligible for subsequent clear retries.
  local failopts = {}
  local failed, fd = fake(log, failopts)
  A._ensure_cell_ring = mk(function() return failed end)
  A:set_verdict_ring("C", true, 0.4)
  failopts.fail_hide = true; A:clear_verdict_rings()
  failopts.fail_hide = false; A:clear_verdict_rings()
  assert(fd.visible == false, "failed hide must retry on next clear")
  -- handle change -> new object fully initialised
  local c, dc = fake(log); A._ensure_cell_ring = mk(function() return c end)
  A:set_verdict_ring("A", false, 0.3); trace[#trace + 1] = snap(dc)
  -- failed init is retried after a clear
  local f, df = fake(log, {fail_radial = true}); A._ensure_cell_ring = mk(function() return f end)
  assert(A:set_verdict_ring("A", true, 0.5) == false); A:clear_verdict_rings()
  df.fillAmount = 0
  local calls_before = log.n
  A:set_verdict_ring("A", true, 0.5)
  assert(log.n > calls_before, "failed init must be retried")
  -- cost: repeated set/clear cycle on two rings; exclude fault fixtures.
  A._ring_inst, A._ring_active = {}, {}
  A._ensure_cell_ring = mk(pick)
  for i = 1, 100 do A:set_verdict_ring("A", true, 0.5); A:set_verdict_ring("B", true, 0.5); A:clear_verdict_rings() end
  local n0 = log.n
  for i = 1, 1000 do
    A:set_verdict_ring("A", true, 0.5); A:set_verdict_ring("B", true, 0.5); A:clear_verdict_rings()
  end
  local ring_calls = (log.n - n0) / 1000
  local repeated_start = log.n
  for i = 1, 1000 do A:clear_verdict_rings() end
  local repeated_calls = (log.n - repeated_start) / 1000
  collectgarbage("collect"); collectgarbage("stop")
  local heap = collectgarbage("count")
  for i = 1, 1000 do
    A:set_verdict_ring("A", true, 0.5); A:set_verdict_ring("B", true, 0.5); A:clear_verdict_rings()
  end
  local bytes = (collectgarbage("count") - heap) * 1024 / 1000
  collectgarbage("restart")
  -- furniture layer restore
  local lay, dl = fake(log)
  A.sub = function() return lay end
  A:_prepare_furn_layer("cell.1.1", "furn", 108, 108)
  local m0 = log.n
  local vis_arg = true
  for i = 1, 1000 do A:_prepare_furn_layer("cell.1.1", "furn", 108, 108, vis_arg) end
  local layer_calls = (log.n - m0) / 1000
  trace[#trace + 1] = tostring(dl.visible) .. tostring(dl.active) .. dl.w
  return table.concat(trace, "\n"), ring_calls, layer_calls, repeated_calls, bytes
end

local t0, r0, l0, c0, b0 = run(base_path)
local t1, r1, l1, c1, b1 = run(cur_path)
local base_visible_equal = (t0 == t1)
print("observable state trace equal:", base_visible_equal)
print(string.format("ring set+set+clear cycle, engine accesses per cycle: base %.1f  current %.1f", r0, r1))
print(string.format("furniture layer visibility restore, calls per restore: base %.1f  current %.1f", l0, l1))
print(string.format("repeated inactive clear accesses: %.1f -> %.1f; cycle allocation bytes: %.1f -> %.1f", c0, c1, b0, b1))
if not base_visible_equal then
  local a, b = {}, {}
  for l in t0:gmatch("[^\n]+") do a[#a + 1] = l end
  for l in t1:gmatch("[^\n]+") do b[#b + 1] = l end
  for i = 1, math.max(#a, #b) do if a[i] ~= b[i] then print("first diff at", i, a[i], b[i]); break end end
  os.exit(1)
end
