--[[----------------------------------------------------------------------------
  tests/settlement608.lua —— 三种结算结果（完美 / 成功 / 失败）与「再玩一次」（608）
  跑法：lua tests/settlement608.lua
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
  local a = { clears = 0 }
  function a:set_verdict_ring() end
  function a:clear_verdict_rings() self.clears = self.clears + 1 end
  return a
end

local function make(swap_a, swap_b)
  local core = Core.new(L1)
  local c = UIC.new(core, { skip_intro = true })
  c.screen = nil
  local sol = L1.solution
  for i = 1, #core.pieces do
    local id = core.pieces[i].id
    local p = sol[id]
    if id == swap_a then p = sol[swap_b] elseif id == swap_b then p = sol[swap_a] end
    core:select_suspect(id); core:hold_cell(p.r, p.c)
  end
  local ad = fake_adapter(); c._last_adapter = ad
  return c, core, ad
end
local function run(c, seconds) local t = 0 while t < seconds do c:tick(0.05); t = t + 0.05 end end

local thief = L1.roles.thief
local others = {}
for _, id in ipairs({ "A", "B", "C", "D", "V" }) do if id ~= thief and id ~= L1.victim_id and id ~= "V" then others[#others + 1] = id end end

local function find(plan_nodes, id)
  for _, n in ipairs(plan_nodes) do if n.id == id then return n end end
end

print("== 1. 全部摆对 → 完美 ==")
do
  local c, core = make()
  c:do_submit(); run(c, 4)
  ok(core.status == "solved" and c.modal and c.modal.kind == "result", "结算弹窗出现")
  ok(c.modal and c.modal.outcome == "perfect", "outcome = perfect", c.modal and c.modal.outcome)
end

print("== 2. 只有盗窃者摆对（其余摆反）→ 成功 ==")
do
  local a, b = others[1], others[2]
  local c, core = make(a, b)
  local res = core:submit()
  ok(res.ok, "摆反两名非盗窃者后摆位仍成立（" .. tostring(a) .. "," .. tostring(b) .. "）", res.message)
  c:do_submit(); run(c, 4)
  ok(c._verdict ~= nil and c._verdict.wrong == 2, "摆错 2 个")
  ok(c.modal and c.modal.kind == "result" and c.modal.win == true, "弹出胜利弹窗", tostring(c.modal and c.modal.kind))
  ok(c.modal and c.modal.outcome == "success", "outcome = success", c.modal and c.modal.outcome)
end

print("== 3. 盗窃者摆错 → 失败弹窗 ==")
do
  local other = (thief == "D") and "V" or "D"
  local c, core = make(thief, other)
  c:do_submit(); run(c, 4)
  ok(c.modal and c.modal.kind == "result" and c.modal.win == false and c.modal.outcome == "fail", "失败弹窗", c.modal and tostring(c.modal.outcome))
  ok(core.status ~= "solved", "未判胜", tostring(core.status))
  -- 布局：只显示对应那一颗标题与说明；下一关 / 存档并结算 禁用；home 键动作为 replay
  local plan = c:build_layout()
  if plan then
    local nodes = plan.nodes or plan
    local t3, t1 = find(nodes, "result.title.3"), find(nodes, "result.title.1")
    ok(t3 and t3.visible == true and t1 and t1.visible == false, "仅 result.title.3 可见")
    local m3, m2 = find(nodes, "result.msg.3"), find(nodes, "result.msg.2")
    ok(m3 and m3.visible == true and m2 and m2.visible == false, "仅 result.msg.3 可见")
    local nx = find(nodes, "result.next")
    ok(nx and nx.enabled ~= false, "失败时「下一关」可用")
    local hm = find(nodes, "result.home")
    ok(hm and hm.event and hm.event.action == "replay" and hm.text == "再玩一次", "result.home = 再玩一次 / replay")
  else
    ok(false, "取不到布局计划（layout_plan）")
  end
  -- 再玩一次：重置关卡 + 关闭弹窗 + 清圈
  local clears = c._last_adapter.clears
  c:on_input({ action = "replay" })
  ok(c.modal == nil, "再玩一次：弹窗关闭")
  ok(c._verdict == nil and c._last_adapter.clears > clears, "再玩一次：判定圈已清")
  local placed = 0
  for r = 1, core.rows do for cc = 1, core.cols do if core.grid[r][cc] then placed = placed + 1 end end end
  ok(placed == 0, "再玩一次：棋盘已重置", tostring(placed))
  ok(c.result_seconds == nil, "再玩一次：定格用时已清")
end

print("== 4. 完美通关后再玩一次 ==")
do
  local c, core = make()
  c:do_submit(); run(c, 4)
  c:on_input({ action = "replay" })
  ok(c.modal == nil and core.status ~= "solved", "弹窗关闭且状态复位", tostring(core.status))
end

print(string.format("\n%d passed, %d failed", pass, fail))
os.exit(fail == 0 and 0 or 1)
