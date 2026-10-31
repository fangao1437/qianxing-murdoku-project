--[[----------------------------------------------------------------------------
  tests/verdict_ring.lua —— 提交后红/绿判定圈（v368）
  钉住：① 按卡序依次出圈 ② 摆对绿、摆错红、且摆错时不结算 ③ 全对时圈绘完才结算
        ④ 每圈 0.4s、间隔 0.15s，fillAmount 0→1 ⑤ 摆位变了圈立刻清 ⑥ 无 solution 保持旧行为
  跑法：lua tests/verdict_ring.lua
------------------------------------------------------------------------------]]--
package.path = "lua/?.lua;lua/?/init.lua;" .. package.path

local Core = require("murdoku_core")
local UIC  = require("ui_controller")
local L1   = require("levels.case_001")

local pass, fail = 0, 0
local function ok(cond, label, detail)
  if cond then pass = pass + 1; print("  [PASS] " .. label .. (detail and ("   " .. detail) or ""))
  else fail = fail + 1; print("  [FAIL] " .. label .. (detail and ("   " .. detail) or "")) end
end

local function fake_adapter()
  local a = { calls = {}, clears = 0 }
  function a:set_verdict_ring(cell, good, amount)
    self.calls[#self.calls + 1] = { cell = cell, ok = good, a = amount }
  end
  function a:clear_verdict_rings() self.clears = self.clears + 1 end
  function a:last_of(cell)
    for i = #self.calls, 1, -1 do if self.calls[i].cell == cell then return self.calls[i] end end
  end
  function a:first_index(cell)
    for i, c in ipairs(self.calls) do if c.cell == cell and c.a > 0 then return i end end
  end
  return a
end

local function make(level, swap)
  local core = Core.new(level)
  local c = UIC.new(core, { skip_intro = true })
  c.screen = nil
  local ids = {}
  for i = 1, #core.pieces do ids[i] = core.pieces[i].id end
  local function put(id, r, cc) core:select_suspect(id); core:hold_cell(r, cc) end
  local sol = level.solution
  for _, id in ipairs(ids) do
    local p = sol[id]
    if swap and id == "D" then p = sol.V elseif swap and id == "V" then p = sol.D end
    put(id, p.r, p.c)
  end
  return c, core, ids
end

local function run(c, seconds, ad)
  c._last_adapter = ad
  local t = 0
  while t < seconds do c:tick(0.05); t = t + 0.05 end
end

print("== 1. 全部摆对：绿圈、卡序依次、绘完再结算 ==")
do
  local c, core = make(L1, false)
  local ad = fake_adapter()
  c._last_adapter = ad
  c:do_submit()
  ok(c._verdict ~= nil and #c._verdict.list == 5, "提交后生成 5 个判定", c._verdict and #c._verdict.list)
  ok(core.status ~= "solved", "刚提交时还没结算（圈要先画）", tostring(core.status))
  run(c, 0.2, ad)
  local a = ad:last_of("cell.3.1")
  ok(a ~= nil and a.a > 0 and a.a < 1 and a.ok == true, "0.2s：第一枚（A）圈画了一半且为绿", a and string.format("a=%.2f", a.a))
  ok(ad:last_of("cell.2.2") == nil or ad:last_of("cell.2.2").a == 0, "0.2s：第二枚（B）还没开始")
  run(c, 0.3, ad) -- 共 0.5s：A 完成，B 刚开始(0.55 开始)→ 仍 0
  ok(ad:last_of("cell.3.1").a == 1, "0.5s：A 圈已满")
  run(c, 0.2, ad) -- 0.7s：B 开始
  ok(ad:last_of("cell.2.2").a > 0, "0.7s：B 开始绘制")
  ok(core.status ~= "solved", "0.7s：仍未结算")
  run(c, 2.5, ad)
  local order = {}
  for _, cell in ipairs({ "cell.3.1", "cell.2.2", "cell.5.4", "cell.1.3", "cell.4.5" }) do order[#order + 1] = ad:first_index(cell) or 9999 end
  local mono = true
  for i = 2, #order do if order[i] <= order[i - 1] then mono = false end end
  ok(mono, "出圈顺序 = 卡序 A,B,C,D,V", table.concat(order, ","))
  local allgreen = true
  for _, cl in ipairs(ad.calls) do if cl.ok ~= true then allgreen = false end end
  ok(allgreen, "全部为绿")
  ok(core.status == "solved", "圈绘完后结算", tostring(core.status))
end

print("== 2. D、V 摆反：D/V 红圈、其余绿圈、不结算 ==")
do
  local c, core = make(L1, true)
  local ad = fake_adapter()
  c._last_adapter = ad
  c:do_submit()
  ok(c._verdict ~= nil and c._verdict.wrong == 2, "摆错 2 个", c._verdict and c._verdict.wrong)
  ok(c.toast ~= nil and c.toast:find("3 / 5") ~= nil, "提示语显示 3 / 5", tostring(c.toast))
  run(c, 3.5, ad)
  ok(core.status ~= "solved", "有摆错不结算", tostring(core.status))
  ok(ad:last_of("cell.4.5").ok == false and ad:last_of("cell.1.3").ok == false, "D、V 所在格为红（摆反后 D 在 (4,5)，V 在 (1,3)）")
  ok(ad:last_of("cell.3.1").ok == true and ad:last_of("cell.2.2").ok == true and ad:last_of("cell.5.4").ok == true, "A、B、C 为绿")
end

print("== 3. 摆位变了，圈立刻清掉 ==")
do
  local c, core = make(L1, true)
  local ad = fake_adapter()
  c._last_adapter = ad
  c:do_submit(); run(c, 0.3, ad)
  local before = ad.clears
  core:undo()
  run(c, 0.1, ad)
  ok(c._verdict == nil, "撤销一步后判定被清除")
  ok(ad.clears > before, "适配器收到 clear_verdict_rings")
end

print("== 4. 无 solution 的关卡：保持旧行为（摆位成立即结算，不画圈）==")
do
  local sol = L1.solution
  local core = Core.new(L1)
  core.solution = {}      -- 模拟「关卡没有答案」
  local c = UIC.new(core, { skip_intro = true }); c.screen = nil
  for _, id in ipairs({ "A", "B", "C", "D", "V" }) do core:select_suspect(id); core:hold_cell(sol[id].r, sol[id].c) end
  local ad = fake_adapter(); c._last_adapter = ad
  c:do_submit()
  ok(c._verdict == nil, "没有生成判定")
  ok(core.status == "solved", "直接结算", tostring(core.status))
end

print("== 5. 适配器：实例化圈控件、环形填充、降级 ==")
do
  local Q = require("engine_adapter_qianxing")
  local function new_img()
    local o = { name = "x", fill = nil, visible = true }
    function o:SetImage(src, id) self.image = id end
    function o:SetSizeDelta(w, h) self.w, self.h = w, h end
    function o:SetVisible(v) self.visible = v end
    function o:SetAsLastSibling() self.top = true end
    function o:SetFillRadial360(t, a) self.fill = a; self.ftype = t end
    return o
  end
  local content = { children = {} }
  function content:GetChild(n) return self.children[n] end
  local made = 0
  rawset(_G, "game", { InstantiateClientUIControl = function(prefab, parent)
    made = made + 1
    local o = new_img(); parent.children[#parent.children + 1] = o; return o end })
  rawset(_G, "Enum", { ImageFillRadialType = { Top = "TOP" } })
  local ad = setmetatable({}, { __index = Q.Adapter })
  ad.rects = { ["cell.1.1"] = { w = 108, h = 108 } }
  function ad:sub(_, name) if name == "content" then return content end end
  function ad:find() return content end
  function ad:_face_prefab() return 123 end
  function ad:warn_once() end
  local used = ad:set_verdict_ring("cell.1.1", true, 0.5)
  local o = ad._ring_inst["cell.1.1"]
  ok(used == true and o ~= nil and o.fill == 0.5 and o.ftype == "TOP", "SetFillRadial360(Top, 0.5) 被调用")
  ok(o.image == Q.RING_IMAGE_ID and o.w == 97 and o.top == nil, "圈底图 = 100006，尺寸 = 格子 0.9 倍，保留创建顺序", tostring(o.w))
  ok(o.imageColor == Q.RING_GREEN, "绿色")
  ad:set_verdict_ring("cell.1.1", false, 1)
  ok(made == 1 and o.imageColor == Q.RING_RED and o.fill == 1, "复用同一实例，改为红色、填满")
  ad:clear_verdict_rings()
  ok(o.fill == 0 and o.visible == false, "清除：填充归零并隐藏")
  o.SetFillRadial360 = nil
  local u2 = ad:set_verdict_ring("cell.1.1", true, 0.5)
  ok(u2 == false and o.imageColor == Q.pack_color(0x4F, 0xAE, 0x5A, 127.5), "没有环形填充接口时降级为透明度渐显")
end

-- 599: explicit lifecycle cleanup must not depend on a later tick.
for _, action in ipairs({"back", "restart", "close_modal"}) do
  local c = make(L1, true)
  local ad = fake_adapter(); c._last_adapter = ad
  c:do_submit(); run(c, 0.2, ad)
  local before = ad.clears
  if action == "back" then c:do_back()
  elseif action == "restart" then c:do_restart()
  else c:on_input({action="close_modal"}) end
  ok(c._verdict == nil and ad.clears > before, action .. " clears immediately without tick")
end
do
  local Q = require("engine_adapter_qianxing")
  local obj = {visible=true,imageColor=123}
  function obj:SetVisible(v) self.visible=v end
  function obj:SetFillRadial360() error("unsupported") end
  local ad = setmetatable({_ring_inst={a=obj}}, {__index=Q.Adapter})
  ad:clear_verdict_rings()
  ok(obj.visible == false and obj.imageColor == 0, "fill error cannot prevent hiding")
end

print(string.format("\n%d passed, %d failed", pass, fail))
os.exit(fail == 0 and 0 or 1)
