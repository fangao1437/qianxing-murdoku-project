--[[----------------------------------------------------------------------------
  tools/perf_faithful/fake_engine.lua —— 用**存档里的真实控件树**搭的假千星客户端引擎（v362）

  与 tests/ 里各套假件的区别：树不是手搭的，而是 `export_tree.mjs` 从 .gil 原样导出
  （runtime `root` 子树 + 全部顶层模板，含几何），所以"树里有什么、排在哪"与存档一致
  （项目规矩第 ④ 条：探针的树必须与存档对账 —— 这里直接就是存档）。

  计数口径：控件上的每一次**属性读写**和**方法调用**、每一次 `game.*` 调用都记一笔 ——
  真机上它们都要跨 Lua↔引擎边界。`nodes_instantiated` 单独记实例化出来的模板节点数。
  ⚠️ 这是**次数**，不是毫秒；毫秒与帧率只有真机能给。

  用法：local E = dofile("tools/perf_faithful/fake_engine.lua"); E.load(tree_lua); E.install()
----------------------------------------------------------------------------]]--
local E = {}
local CNT = {}
E.CNT = CNT
E.ATTR_ON = false
E.ATTR = {}
local function caller_key()
  for lv = 4, 10 do
    local info = debug.getinfo(lv, "Sl")
    if info == nil then break end
    if info.what == "Lua" and (info.lastlinedefined - info.linedefined) > 3 and not info.short_src:find("fake_engine") then
      return info.short_src:match("[^/]*$") .. ":" .. info.linedefined
    end
  end
  return "?"
end
local function cnt(k, n)
  CNT[k] = (CNT[k] or 0) + (n or 1)
  if E.ATTR_ON and k ~= "method_lookup" and k ~= "grid_cb" and k ~= "nodes_instantiated" then
    local ck = caller_key() .. " " .. k
    E.ATTR[ck] = (E.ATTR[ck] or 0) + (n or 1)
  end
end
E.cnt = cnt

local D = setmetatable({}, { __mode = "k" })   -- proxy -> data
E.D = D
local METHODS = {}
E.METHODS = METHODS
local PROPS = { showCursor = true, disableCursorEventPassthrough = true, text = true, imageId = true, referencedPrefabIndex = true, itemPrefabIndex = true,
  itemCount = true, raycastTarget = true, visible = true, color = true, fontSize = true,
  scrollProgress = true, interactable = true }

local META = {}
META.__index = function(t, k)
  local m = METHODS[k]
  if m ~= nil then cnt("method_lookup"); return m end
  local d = D[t]
  if d == nil then return nil end
  if k == "name" then cnt("get:name"); return d.name end
  if PROPS[k] then cnt("get:" .. k); return d.props[k] end
  return nil
end
META.__newindex = function(t, k, v)
  local d = D[t]
  cnt("set:" .. tostring(k))
  if k == "name" then d.name = v else d.props[k] = v end
end

local created = 0
local function new_ctrl(name, w, h, x, y, id)
  local p = setmetatable({}, META)
  D[p] = { name = name, kids = {}, parent = nil, w = w or 0, h = h or 0, x = x or 0, y = y or 0,
    vis = true, active = true, props = {}, listeners = {}, id = id }
  created = created + 1
  return p
end
E.new_ctrl = new_ctrl
local function attach(parent, child, at)
  local pd, cd = D[parent], D[child]
  if cd.parent ~= nil then
    local sib = D[cd.parent].kids
    for i = 1, #sib do if sib[i] == child then table.remove(sib, i) break end end
  end
  cd.parent = parent
  if at == nil then pd.kids[#pd.kids + 1] = child else table.insert(pd.kids, at, child) end
end
E.attach = attach

local function M(name, fn) METHODS[name] = function(self, ...) cnt(name); return fn(D[self], self, ...) end end
M("GetChildren", function(d) local t = {}; for i = 1, #d.kids do t[i] = d.kids[i] end; return t end)
M("GetChild", function(d, _, name)
  if type(name) == "number" then return d.kids[name + 1] end
  for i = 1, #d.kids do if D[d.kids[i]].name == name then return d.kids[i] end end
  return nil
end)
M("GetChildCount", function(d) return #d.kids end)
M("GetParent", function(d) return d.parent end)
M("GetSiblingIndex", function(d, s)
  if d.parent == nil then return 0 end
  local k = D[d.parent].kids
  for i = 1, #k do if k[i] == s then return i - 1 end end
  return 0
end)
M("SetSiblingIndex", function(d, s, i)
  if d.parent == nil then return end
  local p = d.parent; local k = D[p].kids
  for j = 1, #k do if k[j] == s then table.remove(k, j) break end end
  i = math.max(0, math.min(math.floor(tonumber(i) or 0), #k))
  table.insert(k, i + 1, s)
end)
M("SetAsLastSibling", function(d, s) if d.parent then local p = d.parent; attach(p, s) end end)
M("SetAsFirstSibling", function(d, s) if d.parent then local p = d.parent; attach(p, s, 1) end end)
M("GetSizeDelta", function(d) return d.w, d.h end)
M("SetSizeDelta", function(d, _, w, h) d.w, d.h = w, h end)
M("GetAnchoredPosition", function(d) return d.x, d.y end)
M("SetAnchoredPosition", function(d, _, x, y) d.x, d.y = x, y end)
M("GetUIPos", function(d) return d.x, d.y end)
for _, n in ipairs({ "SetAnchorMin", "SetAnchorMax", "SetPivot", "SetLocalScale", "SetScale",
  "SetLocalRotation", "SetColor", "SetAlpha" }) do M(n, function(d, _, a, b, c) d[n] = { a, b, c } end) end
M("SetVisible", function(d, _, v) d.vis = v and true or false; d.props.visible = d.vis end)
M("SetActive", function(d, _, v) d.active = v and true or false end)
M("SetImage", function(d, _, v) d.props.imageId = v end)
M("SetText", function(d, _, v) d.props.text = v end)
M("AddCursorEventListener", function(d, _, ev, fn) d.listeners[ev] = d.listeners[ev] or {}; table.insert(d.listeners[ev], fn) end)
M("AddKeyEventListener", function(d, _, ev, fn) d.listeners["key:" .. tostring(ev)] = fn end)
M("RemoveAllCursorEventListener", function(d) d.listeners = {} end)
M("Destroy", function(d, s) E.destroy(s) end)
M("Play", function() end)
-- list control (网格视窗) per official API; real-device metrics from tests/grid_cost.lua
M("GetItemSize", function() return 360, 96 end)
M("GetItemSpacing", function() return 8, 8 end)
M("GetPadding", function() return 20, 20, 20, 20 end)
M("GetContentLength", function() return 760 end)
M("GetItemIndex", function(_, _, item) return item and D[item] and D[item].item_index or nil end)
local VISIBLE_ITEMS = 5
M("RefreshItems", function(d, s, n, cb)
  d.props.itemCount = n
  d.grid_cb, d.grid_n = cb, n
  d.items = d.items or {}
  local vis = math.min(n or 0, VISIBLE_ITEMS)
  for i = 1, vis do
    local it = d.items[i]
    if it == nil then
      it = E.instantiate(d.props.itemPrefabIndex, s)
      if it == nil then it = new_ctrl("item"); attach(s, it) end
      D[it].item_index = i - 1
      d.items[i] = it
    end
    cnt("grid_cb"); cb(it, i - 1)
  end
  for i = vis + 1, #d.items do d.items[i] = nil end
  return true
end)
-- engine re-enters the item callbacks every frame (禁区 5 in the project docs)
function E.grid_reenter()
  for p, d in pairs(D) do
    if d.grid_cb ~= nil and d.items ~= nil then
      for i = 1, #d.items do cnt("grid_cb"); pcall(d.grid_cb, d.items[i], i - 1) end
    end
  end
end

E.templates, E.tpl_by_name = {}, {}
local function build(rows, idmap)
  local nodes = {}
  for i, r in ipairs(rows) do
    local c = new_ctrl(r[1] ~= "" and r[1] or nil, r[4], r[5], r[6], r[7], r[3])
    nodes[i] = c
    if idmap then idmap[r[3]] = c end
    if r[2] > 0 then attach(nodes[r[2]], c) end
  end
  return nodes[1], nodes
end

local REF = { ["tpl.cell.face"] = "cell.face", ["tpl.cell"] = "cell.1.1" }
function E.load(path)
  local data = dofile(path)
  E.templates = data.templates
  E.tpl_by_name = data.template_by_name
  local byid = {}
  E.root, E.nodes = build(data.root, byid)
  E.byid = byid
  -- reference controls expose referencedPrefabIndex (things/furn.* and tpl.*)
  for _, c in ipairs(E.nodes) do
    local d = D[c]
    local nm = d.name
    local tgt = (nm and REF[nm]) or nil
    if nm and D[d.parent or c] and D[d.parent or c].name == "things" then tgt = nm end
    if tgt and E.tpl_by_name[tgt] then d.props.referencedPrefabIndex = E.tpl_by_name[tgt] end
    if nm == "clues.grid" then d.props.itemPrefabIndex = -1 end
    if nm and (nm:match("^hit%.") or nm:match("^hex%.") or nm:match("%.btn%.") or nm:match("^select%.card%.%d$")) then
      d.props.raycastTarget = false
    end
  end
  created = 0
end

function E.instantiate(prefab, parent)
  local rows = E.templates[prefab]
  if rows == nil then cnt("instantiate_unknown"); return nil end
  local top = build(rows)
  cnt("nodes_instantiated", #rows)
  local tn = rows[1] and rows[1][1] or "?"
  cnt("inst:" .. tn)
  if parent ~= nil then attach(parent, top) end
  return top
end
function E.destroy(c)
  local d = D[c]
  if d == nil then return end
  if d.parent then
    local k = D[d.parent].kids
    for i = 1, #k do if k[i] == c then table.remove(k, i) break end end
  end
  d.parent = nil
end

function E.find(name, from)
  local function walk(c)
    local d = D[c]
    if d.name == name then return c end
    for i = 1, #d.kids do local h = walk(d.kids[i]); if h then return h end end
  end
  return walk(from or E.root)
end
function E.count_nodes(from)
  local n = 0
  local function walk(c) n = n + 1; for _, k in ipairs(D[c].kids) do walk(k) end end
  walk(from or E.root); return n
end
-- fire a cursor event on a control (by handle)
function E.fire(c, ev)
  local d = D[c]
  local l = d and d.listeners[ev]
  if l == nil then return false end
  for _, fn in ipairs(l) do pcall(fn, c) end
  return true
end

local function tween()
  local t = {}
  for _, n in ipairs({ "SetEase", "SetOnComplete", "SetOnStepComplete", "SetLoops", "SetRelative", "Play", "Kill", "Append", "Join" }) do
    t[n] = function(self) cnt("tween:" .. n); return self end
  end
  return t
end

function E.install(canvas_w, canvas_h)
  _G.Enum = { CursorEventType = { CursorClick = 1, CursorDown = 2, CursorUp = 3, CursorLongPress = 4,
    CursorDrag = 5, CursorEnter = 6, CursorExit = 7 }, KeyEventType = { KeyDown = 1, KeyUp = 2 } }
  _G.game = {
    GetUICanvasSize = function() cnt("game.GetUICanvasSize"); return canvas_w or 1600.0, canvas_h or 900.0 end,
    GetClientUIRoots = function() cnt("game.GetClientUIRoots"); return { E.root } end,
    InstantiateClientUIControl = function(prefab, parent) cnt("game.Instantiate"); return E.instantiate(prefab, parent) end,
    DestroyClientUIControl = function(c) cnt("game.Destroy"); E.destroy(c) end,
    GetCursorUIPos = function() return 0, 0 end,
    GetDevice = function() return "KeyboardAndMouse" end,
    PrintClientUITree = function() end,
    ServerSignal = function()
      local s = {}
      for _, n in ipairs({ "AddInt", "AddFloat", "AddString", "AddBool", "SendSignal", "Send" }) do s[n] = function() end end
      return s
    end,
    PlayAudio = function() end, PlayAudio2D = function() end,
    GetText = function() return "" end,
    Tween = function() cnt("game.Tween"); return tween() end,
    TweenSequence = function() cnt("game.TweenSequence"); return tween() end,
  }
  _G.script = {
    EnableUpdate = function() end, RegisterServerSignalHandler = function() end,
    RegisterCustomVariableChangedHandler = function() end, Invoke = function() end,
    GetParam = function() return nil end,
  }
end

function E.reset() for k in pairs(CNT) do CNT[k] = nil end end
function E.snapshot() local t = {}; for k, v in pairs(CNT) do t[k] = v end; return t end
-- "interop" = everything that crosses into the engine
function E.interop(t)
  t = t or CNT
  local n = 0
  for k, v in pairs(t) do
    if k ~= "method_lookup" and k ~= "grid_cb" and k ~= "nodes_instantiated" then n = n + v end
  end
  return n
end
return E
