--[[----------------------------------------------------------------------------
  lua/tutorial_ui.lua —— 13 页教程逐页静态复刻控制器（v352）

  设计稿中的所有文字、颜色、棋盘家具、墙门、棋子、候选和标记都已预建为：
    td.<tag>.page.<n>.*
  本模块只负责显隐与按钮，不写文字、不改颜色、不创建或销毁控件。
----------------------------------------------------------------------------]]--
local M = {}

-- 与正式关卡相同：things/furn.* 只提供模板索引，运行时实例化并整树缩放。
-- 坐标沿用设计棋盘；存档只保存格子与提示层，不保存家具图层副本。
local FURN = {
  -- 首页棋盘原植物格；最后两项是已测量的棋盘局部中心。
  home = {
    { "plant_2",0,0,96,96,108,108,258.412689,139.758377 },
    { "table_h2",0,0,216,108,216,108,148.783066,66.671959 },
    { "chair",0,0,108,108,108,108,404.585541,-6.414462 },
    { "rug",0,0,108,108,108,108,185.326279,-152.587296 },
  },
  l1 = {
    { "table_v2",676,262,108,216,108,216 }, { "plant_2",788,206,108,108,108,108 },
    { "plant_2",676,654,108,108,108,108 }, { "plant_2",900,654,108,108,108,108 },
    { "rug_2",732,430,216,108,216,108 }, { "rug_2",1068,318,216,108,216,108 },
    { "chair",788,542,108,108,108,108 }, { "chair",1012,654,108,108,108,108 },
  },
  l2 = {
    { "chair",667.5,197.5,89,89,108,108 }, { "table_h2",807,197.5,178,89,216,108 },
    { "rug",946.5,197.5,89,89,108,108 }, { "statue",1132.5,197.5,89,89,108,108 },
    { "chair",946.5,290.5,89,89,108,108 }, { "plant",760.5,383.5,89,89,108,108 },
    { "rug_2",900,383.5,178,89,216,108 }, { "rug_3",667.5,616,89,178,108,216 },
    { "plant",946.5,569.5,89,89,108,108 }, { "shelf",760.5,662.5,89,89,108,108 },
    { "plant",946.5,662.5,89,89,108,108 }, { "table",1039.5,662.5,89,89,108,108 },
  },
}
local SCALE = 1480 / 2268
local BOARD_X = 60 + (1256 - 36) * SCALE + 620 * SCALE / 2
local BOARD_Y = 121 + (302 - 36) * SCALE + 620 * SCALE / 2

-- ★ v362：`limit` = 本次最多新建几件（nil = 全部）。按同一个 `order` 逐件补，
--   所以分几帧建完与一次建完的**兄弟次序完全相同**（每件都 SetAsLastSibling，地毯先于家具）。
--   日志"家具实例化 … 新建=N"只在**全部建完**时打一行（N = 累计件数），与原来一次建完时同一行。
function M:furniture_done()
  local spec = FURN[self.tag]
  if spec == nil then return true end
  if self.furniture == nil then return false end
  for i = 1, #spec do if self.furniture[i] == nil then return false end end
  return true
end

function M:_ensure_furniture(limit)
  local spec = FURN[self.tag]
  if spec == nil or game == nil or game.InstantiateClientUIControl == nil then return end
  local parent = self:_find(self.root_name .. ".board")
  if parent == nil then
    self:_note("家具实例化跳过 tag=" .. self.tag .. "：找不到 " .. self.root_name .. ".board")
    return
  end
  local prefabs = nil
  pcall(function() prefabs = self.adapter:_furn_prefab_map() end)
  if type(prefabs) ~= "table" then
    self:_note("家具实例化跳过 tag=" .. self.tag .. "：things 模板映射为空")
    return
  end
  self.furniture = self.furniture or {}
  -- ★ v357（2026-10-28）**层序修正：家具必须追加到 board 子控件末尾（最上层）**。
  --   旧代码照搬正式关卡的 `SetSiblingIndex(地毯=1 / 家具=2)` —— 那是"格子 content"里的序号
  --   （0=face、1=地毯、2=家具、3+=墙/门/笔记/头像）。但教程棋盘 `td.*.board` 是**存档静态底图**：
  --   它的子控件是 25 个格子底板 + 墙等（在 v356 存档里 td.l1.board 共 27 个子控件），
  --   把家具塞到 1/2 号位 = 落到格子底板**下面** ⇒ 运行时实例化了但真机一片空白（"卡住"的根因）。
  --   正确做法：本关棋盘底图之上、按"地毯先建 → 其它家具后建"的顺序 append（后建=更靠上）。
  local order = {}
  for pass = 1, 2 do
    for i, f in ipairs(spec) do
      local is_rug = tostring(f[1]):find("rug", 1, true) ~= nil
      if (pass == 1) == is_rug then order[#order + 1] = i end
    end
  end
  local made = 0
  for _, i in ipairs(order) do
    local f = spec[i]
    if limit ~= nil and made >= limit then break end
    if self.furniture[i] == nil and prefabs[f[1]] ~= nil then
      local ok, obj = pcall(game.InstantiateClientUIControl, prefabs[f[1]], parent)
      if ok and obj ~= nil then
        self.furniture[i] = obj
        local w, h = f[4] * SCALE, f[5] * SCALE
        local x = BOARD_X - 656 * SCALE / 2 + (f[2] - 572) * SCALE - 800
        local y = 450 - (BOARD_Y - 656 * SCALE / 2 + (f[3] - 102) * SCALE)
        pcall(function() if obj.SetAnchorMin then obj:SetAnchorMin(0.5, 0.5) end end)
        pcall(function() if obj.SetAnchorMax then obj:SetAnchorMax(0.5, 0.5) end end)
        pcall(function() if obj.SetPivot then obj:SetPivot(0.5, 0.5) end end)
        pcall(function() if obj.SetSizeDelta then obj:SetSizeDelta(w, h) end end)
        pcall(function() if obj.SetAnchoredPosition then obj:SetAnchoredPosition(x, y) end end)
        if f[8] ~= nil then
          pcall(function() obj:SetAnchoredPosition(f[8], f[9]) end)
        end
        local scaled = false
        pcall(function()
          if self.adapter._furn_scale_layers ~= nil then
            self.adapter:_furn_scale_layers(obj, w / f[6], h / f[7]); scaled = true
          end
        end)
        if not scaled then pcall(function() if obj.SetLocalScale then obj:SetLocalScale(w / f[6], h / f[7], 1) end end) end
        -- 追加到末尾（最上层）；没有 SetAsLastSibling 时退化为"最后一个兄弟索引"
        pcall(function()
          if obj.SetAsLastSibling ~= nil then
            obj:SetAsLastSibling()
          elseif obj.SetSiblingIndex ~= nil and parent.GetChildren ~= nil then
            local kids = nil
            pcall(function() kids = parent:GetChildren() end)
            if type(kids) == "table" and #kids > 0 then obj:SetSiblingIndex(#kids - 1) end
          end
        end)
        pcall(function() obj:SetVisible(true); obj:SetActive(true) end)
        made = made + 1
      end
    end
  end
  self._furn_made = (self._furn_made or 0) + made
  if self._furn_made > 0 and not self._furn_logged and self:furniture_done() then
    self._furn_logged = true
    self:_note("家具实例化 tag=" .. self.tag .. " 新建=" .. self._furn_made)
  end
end

-- ★ v362：**空闲时预热**家具（每次最多 `n` 件）。返回 true = 已全部建好。
--   为什么：原来 `init()` 在开局就把 l1 / l2 两套教程的 20 件家具（2125 个模板节点）一次实例化，
--   那时玩家还在首页、离进关卡至少隔好几次点击 ⇒ 白白压在加载时间上（`583` 假引擎实测）。
--   现在由入口在开局稳定之后每帧补一件；万一预热没建完就打开，`open_ui()` 会当场补齐（与原来一致）。
function M:prewarm(n)
  if self:furniture_done() then return true end
  if not self.inited then return false end
  self:_ensure_furniture(n or 1)
  return self:furniture_done()
end

function M.new(adapter, opts)
  if type(opts) ~= "table" then opts = {} end
  return setmetatable({
    adapter = adapter,
    tag = tostring(opts.tag or "?"),
    root_name = tostring(opts.root or ("td." .. tostring(opts.tag or "?"))),
    pages = tonumber(opts.pages) or 1,
    page = 1,
    open = false,
    inited = false,
    eager_furniture = (opts.eager_furniture == true),
    bound = {},
    log = {},
  }, { __index = M })
end

function M:_note(msg)
  self.log[#self.log + 1] = msg
  if print then print("[tutorial] " .. msg) end
end

function M:_find(name)
  local ctrl = nil
  pcall(function() ctrl = self.adapter:find(name) end)
  return ctrl
end

function M:_visible(name, want)
  local ctrl = self:_find(name)
  if ctrl == nil then return false end
  pcall(function() ctrl:SetVisible(want and true or false) end)
  if want then pcall(function() ctrl:SetActive(true) end) end
  return true
end

function M:_bind(name, fn, resolved)
  local ctrl = resolved or self:_find(name)
  if ctrl == nil or self.bound[ctrl] then return ctrl ~= nil end
  if ctrl.AddCursorEventListener == nil then return false end
  local ok = pcall(function()
    local ev = Enum and Enum.CursorEventType and Enum.CursorEventType.CursorClick
    if ev == nil then error("CursorClick unavailable") end
    if ctrl.raycastTarget ~= nil then ctrl.raycastTarget = true end
    if ctrl.interactable ~= nil then ctrl.interactable = true end
    ctrl:AddCursorEventListener(ev, function() fn() end)
  end)
  if ok then self.bound[ctrl] = true end
  return ok
end

-- Bind only the displayed page; every hit layer routes to the same target.
function M:_bind_steps()
  if self.pages < 2 then return end
  self._steps_bound = self._steps_bound or {}
  if self._steps_bound[self.page] then return end
  local prefix = self.root_name .. ".page." .. tostring(self.page)
  local complete = true
  local controls = {}
  local page_ctrl = self:_find(prefix)
  local kids = nil
  if page_ctrl and page_ctrl.GetChildren then pcall(function() kids = page_ctrl:GetChildren() end) end
  if type(kids) == "table" then
    for _, child in ipairs(kids) do
      local name = nil
      pcall(function() name = child.name end)
      if name then controls[name] = child end
    end
  end
  local function bind(name, fn)
    if type(kids) == "table" and controls[name] == nil then return false end
    return self:_bind(name, fn, controls[name])
  end
  for i = 1, self.pages do
    local target = i
    local fn = function() if self.open then self:go(target) end end
    if not bind(prefix .. ".stephit." .. tostring(i), fn) then complete = false end
  end
  if complete then self._steps_bound[self.page] = true end
end

function M:_paint()
  if self.open then self:_bind_steps() end
  for i = 1, self.pages do
    self:_visible(self.root_name .. ".page." .. tostring(i), i == self.page)
  end
  self:_visible(self.root_name .. ".btn.prev", self.page > 1)
  self:_visible(self.root_name .. ".btn.next", true)
  return self
end

function M:init()
  if self.inited then return self end
  if self:_find(self.root_name) == nil then return self end
  self.inited = true
  self:_visible("teach", false)
  self:_visible("teach.text", false)
  self:_bind(self.root_name .. ".btn.prev", function() self:prev() end)
  self:_bind(self.root_name .. ".btn.next", function() self:next() end)
  self:_bind(self.root_name .. ".btn.close", function() self:close() end)
  self:_bind(self.root_name .. ".btn.skip", function() self:close() end)
  self.page = 1
  self:_paint()
  -- ★ v362：家具不在 init 里建（见 `M:prewarm`）；`opts.eager_furniture = true` 可恢复旧行为
  if self.eager_furniture then self:_ensure_furniture() end
  self:_visible(self.root_name, false)
  self:_note("静态教程 init 完成 tag=" .. self.tag .. " pages=" .. tostring(self.pages))
  return self
end

function M:open_ui()
  self.open = true
  self:_visible(self.root_name, true)
  self:_ensure_furniture()
  self:_paint()
  self:_note("打开 tag=" .. self.tag .. " 第 " .. tostring(self.page) .. " 页")
  return self
end

function M:close()
  self.open = false
  self:_visible(self.root_name, false)
  return self
end

function M:go(n)
  local p = tonumber(n) or 1
  if p < 1 then p = 1 end
  if p > self.pages then p = self.pages end
  self.page = p
  self:_paint()
  return self
end

function M:next()
  if self.page >= self.pages then return self:close() end
  return self:go(self.page + 1)
end
function M:prev() return self:go(self.page - 1) end
M["goto"] = M.go

return M
