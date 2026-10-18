--[[----------------------------------------------------------------------------
  tools/design_check_case_001.lua —— 第一关【设计期】唯一解闸门（离线，不改关卡文件）

  ★ 为什么单独一个脚本 ✗：
    项目已定案「真关卡不写手写线索表」✓（见 tests/clue_slots.lua 第 2/3 节 ✓），
    线索卡的 who/what/letter/face 由编辑器里的 `row.1.*` 填 ✓
    ⇒ `case_001.lua` 里【没有】带 `type` 的线索 ⇒ `tools/validate_levels.lua` 只能报「未测」✓
    ⇒ ★★ 所以内容设计阶段的"恰好 1 个解"闸门**必须离线做** ✓ —— 就是这个脚本 ✓

  ★ 本脚本同时跑三套，用来对比 ✓：
      甲 = 当前 v2 五条（a 已改"地毯上唯一的人"）        ⇒ 预期 3 个解
      乙 = 卡4 换成「盗窃者不在桌子旁」                    ⇒ 预期 1 个解（= D）
      丙 = 保留"我在植物旁"，卡5 换成「盗窃者不在桌子旁」   ⇒ 预期 1 个解（= D）

  ★ 跑法 ✓：在仓库根目录执行  lua tools/design_check_case_001.lua
----------------------------------------------------------------------------]]--

local here = (arg and arg[0]) or "tools/design_check_case_001.lua"
local root = here:gsub("tools[/\\]design_check_case_001%.lua$", "")
package.path = table.concat({
  package.path,
  root .. "lua/?.lua",
  root .. "lua/?/init.lua",
  root .. "?.lua",
}, ";")

local Core = require("murdoku_core")
local LV   = require("levels.case_001")

-- ★★★ 家具（整段替换；旧的 书架 / 展示柜 / 地毯(4,2) 已撤除）
local OBJECTS = {
  ["桌子"] = { cells = { { r = 1, c = 1 }, { r = 2, c = 1 } },                                  occupiable = false, kind = "table"  },
  ["植物"] = { cells = { { r = 1, c = 2 }, { r = 5, c = 1 }, { r = 5, c = 3 } },                 occupiable = false, kind = "plant"  },
  ["地毯"] = { cells = { { r = 3, c = 1 }, { r = 3, c = 2 }, { r = 2, c = 4 }, { r = 2, c = 5 } }, occupiable = true,  kind = "carpet" },
  ["椅子"] = { cells = { { r = 4, c = 2 }, { r = 5, c = 4 } },                                   occupiable = true,  kind = "chair"  },
}

local VARIANTS = {
  { tag = "甲 · 当前 v2（a = 地毯上唯一的人）", expect = 3, clues = {
      { type = "only_on_object", who = "A", object = "地毯" },
      { type = "beside_object",  who = "B", object = "桌子" },
      { type = "on_object",      who = "C", object = "椅子" },
      { type = "beside_object",  who = "D", object = "植物" },
      { type = "in_col",         who = "V", c = 5 },
    } },
  { tag = "乙 · 卡4 改「盗窃者不在桌子旁」", expect = 1, clues = {
      { type = "only_on_object",    who = "A", object = "地毯" },
      { type = "beside_object",     who = "B", object = "桌子" },
      { type = "on_object",         who = "C", object = "椅子" },
      { type = "not_beside_object", who = "@thief", object = "桌子" },
      { type = "in_col",            who = "V", c = 5 },
    } },
  { tag = "丙 · 保留植物旁，卡5 改「盗窃者不在桌子旁」", expect = 1, clues = {
      { type = "only_on_object",    who = "A", object = "地毯" },
      { type = "beside_object",     who = "B", object = "桌子" },
      { type = "on_object",         who = "C", object = "椅子" },
      { type = "beside_object",     who = "D", object = "植物" },
      { type = "not_beside_object", who = "@thief", object = "桌子" },
    } },
}

local function clone(t) local o = {} for k, v in pairs(t or {}) do o[k] = v end return o end

local function buildLevel(clues)
  local S = clone(LV)
  S.objects = OBJECTS
  S.blocked = {}; S.water = {}
  S.clues = clues
  local meta = clone(LV.meta)
  meta.false_clue = nil          -- 引导关：不设假话
  meta.announce = "none"
  S.meta = meta
  return S
end

local totalFail = 0
local function ok(cond, msg)
  if cond then print("  [PASS] " .. msg)
  else totalFail = totalFail + 1; print("  [FAIL] " .. msg) end
end

--------------------------------------------------------------------------------
-- 穷举：结构合法组合数 + 通过全部线索的解（含摆位）
--------------------------------------------------------------------------------
local ANS = {}
for id, p in pairs(LV.solution) do ANS[id] = { r = p.r, c = p.c } end
local function ansKey()
  local t = {}
  for id, p in pairs(ANS) do t[#t + 1] = id .. "(" .. p.r .. "," .. p.c .. ")" end
  table.sort(t); return table.concat(t, " ")
end
local function cfgKey(cfg, rows, cols)
  local t = {}
  for r = 1, rows do for c = 1, cols do
    if cfg[r][c] then t[#t + 1] = cfg[r][c] .. "(" .. r .. "," .. c .. ")" end
  end end
  table.sort(t); return table.concat(t, " ")
end

local function analyse(variant)
  print(string.format("\n===== %s =====", variant.tag))
  local lv = buildLevel(variant.clues)

  local vok, verrs = Core.validate_level(lv)
  ok(vok, "格式闸门 Core.validate_level")
  if not vok then for _, e in ipairs(verrs) do print("        - " .. e) end; return end

  local core, cerr = Core.new(lv)
  ok(core ~= nil, "能构造 Core" .. (cerr and ("  —— " .. tostring(cerr[1] or "")) or ""))
  if not core then return end

  -- 答案上的逐条判定
  for id, p in pairs(core.solution) do core:select_suspect(id); core:hold_cell(p.r, p.c) end
  local res = core:clue_results()
  local allTrue = true
  for i = 1, #res do
    print(string.format("        线索 %d [%s] %s ⇒ %s", i, tostring(res[i].type),
      res[i].text, res[i].satisfied and "成立" or "不成立"))
    if not res[i].satisfied then allTrue = false end
  end
  ok(allTrue, "五条线索在答案上全部成立（无假话）")

  local sok, serrs, sinfo = core:structure_report()
  ok(sok, string.format("结构闸门：受害者区域 #%s，k=%d，门相邻 %s，无辜最多 %s",
    tostring(sinfo.victim_room), sinfo.k or 0,
    table.concat(sinfo.adjacent or {}, ","), tostring(sinfo.best)))
  if not sok then for _, e in ipairs(serrs or {}) do print("        - " .. e) end end

  -- 穷举
  local ids = {}
  for i = 1, #core.pieces do ids[i] = core.pieces[i].id end
  local rpairs = {}
  for i = 1, #ids do
    local t = ids[i]
    if t ~= core.victim_id then
      rpairs[#rpairs + 1] = { thief = t, accomplice = nil }
      for j = 1, #ids do
        local a = ids[j]
        if a ~= t and a ~= core.victim_id then
          rpairs[#rpairs + 1] = { thief = t, accomplice = a }
        end
      end
    end
  end
  local grid = {}
  for r = 1, core.rows do grid[r] = {} end
  local function install(g)
    local sg, sp, src, scc = core.grid, core.pos, core.row_count, core.col_count
    core.grid = g; core.pos = {}
    core.row_count, core.col_count = {}, {}
    for r = 1, core.rows do core.row_count[r] = 0 end
    for c = 1, core.cols do core.col_count[c] = 0 end
    for r = 1, core.rows do
      for c = 1, core.cols do
        local id = g[r][c]
        if id then
          core.pos[id] = { r = r, c = c }
          core.row_count[r] = core.row_count[r] + 1
          core.col_count[c] = core.col_count[c] + 1
        end
      end
    end
    return function() core.grid, core.pos, core.row_count, core.col_count = sg, sp, src, scc end
  end

  local nStruct, survivors = 0, {}
  local function consider()
    local restore = install(grid)
    for i = 1, #rpairs do
      local roles = { thief = rpairs[i].thief, accomplice = rpairs[i].accomplice, victim = core.victim_id }
      if core:structure_report(roles) then
        nStruct = nStruct + 1
        local rctx = core:clue_results(roles)
        local all = true
        for k = 1, #rctx do if not rctx[k].satisfied then all = false break end end
        if all then
          local snap = {}
          for r = 1, core.rows do snap[r] = {} for c = 1, core.cols do snap[r][c] = grid[r][c] end end
          survivors[#survivors + 1] = { placement = snap, thief = roles.thief, accomplice = roles.accomplice }
        end
      end
    end
    restore()
  end
  local function place_at(k)
    if k > #ids then return consider() end
    local id = ids[k]
    for r = 1, core.rows do
      for c = 1, core.cols do
        if not grid[r][c] and not core:is_blocked(r, c) then
          local rh, ch = false, false
          for cc = 1, core.cols do if grid[r][cc] then rh = true end end
          for rr = 1, core.rows do if grid[rr][c] then ch = true end end
          if not rh and not ch then
            grid[r][c] = id
            place_at(k + 1)
            grid[r][c] = nil
          end
        end
      end
    end
  end
  place_at(1)

  print(string.format("        结构合法 (摆位 × 角色) 组合 = %d", nStruct))
  local byPlace, order = {}, {}
  for _, s in ipairs(survivors) do
    local k = cfgKey(s.placement, core.rows, core.cols)
    if not byPlace[k] then byPlace[k] = {}; order[#order + 1] = k end
    table.insert(byPlace[k], s)
  end
  print(string.format("        通过全部线索的解 = %d（不同摆位 %d）", #survivors, #order))
  for n, k in ipairs(order) do
    print(string.format("        摆位 %d：%s   %s", n, k,
      (k == ansKey()) and "★ 就是关卡声明的答案" or "（不是答案！）"))
    for _, s in ipairs(byPlace[k]) do
      print(string.format("            盗窃者 = %s   同伙 = %s", s.thief, tostring(s.accomplice)))
    end
  end

  ok(#survivors == variant.expect,
    string.format("解数应为 %d（实测 %d）", variant.expect, #survivors))

  -- 引擎自己的 solve
  local sols = core:solve(20)
  print(string.format("        Core:solve 找到 = %d", #sols))
  if variant.expect == 1 then
    ok(#sols == 1 and sols[1].thief == LV.roles.thief
       and cfgKey(sols[1].placement, core.rows, core.cols) == ansKey(),
      "唯一解且就是关卡声明的答案（盗窃者 " .. tostring(LV.roles.thief) .. "）")
  end
end

print("== 第一关设计期闸门（v2 新家具版）==")
for _, v in ipairs(VARIANTS) do analyse(v) end

print("")
if totalFail > 0 then
  print(string.format("== 闸门未通过：%d 项失败 ==", totalFail))
  os.exit(1)
end
print("== 全部符合预期 ==")
