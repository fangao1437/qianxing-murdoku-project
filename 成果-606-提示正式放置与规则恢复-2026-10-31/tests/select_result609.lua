package.path = "lua/?.lua;lua/?/init.lua;" .. package.path
local Core = require("murdoku_core")
local UIC  = require("ui_controller")
local L1   = require("levels.case_001")
local pass, fail = 0, 0
local function ok(c, l) if c then pass = pass + 1; print("  [PASS] " .. l) else fail = fail + 1; print("  [FAIL] " .. l) end end
local function card(p)
  local c = UIC.new(Core.new(L1), { skip_intro = true, progress = function() return p end })
  return c:level_card_parts({ id = "x", name = "x" }).result
end
print("== 选关卡片成绩文本 ==")
ok(card(nil) == "", "无成绩留空")
ok(card({ started = true, outcome = nil }) == "", "只失败或进行中留空")
ok(card({ outcome = "perfect", seconds = 75 }) == "完美\n耗时 01:15", "完美：完美 + 耗时")
ok(card({ outcome = "success", wrong = 2, seconds = 9 }) == "成功 · 误判2人\n耗时 00:09", "成功：误判人数 + 耗时")
print("== 一分钟结算门控 ==")
do
  local core = Core.new(L1)
  local c = UIC.new(core, { skip_intro = true }); c.screen = nil
  ok(not c:can_settle(), "刚进关不可结算")
  for _ = 1, 590 do c:tick(0.1) end
  ok(not c:can_settle(), "59 秒仍不可结算")
  for _ = 1, 20 do c:tick(0.1) end
  ok(c:can_settle(), "满一分钟可结算（失败也适用）")
  c:do_restart(); ok(c:can_settle(), "再玩一次保持试玩结算解锁")
end
do
  local sol, core = L1.solution, Core.new(L1)
  local c = UIC.new(core, { skip_intro = true }); c.screen = nil
  for _, p in ipairs(core.pieces) do core:select_suspect(p.id); core:hold_cell(sol[p.id].r, sol[p.id].c) end
  c._last_adapter = { set_verdict_ring = function() end, clear_verdict_rings = function() end }
  c:do_submit(); for _ = 1, 80 do c:tick(0.05) end
  ok(core.status == "solved" and c:can_settle(), "胜利后立即可结算")
end
print(string.format("\n%d passed, %d failed", pass, fail))
os.exit(fail == 0 and 0 or 1)
