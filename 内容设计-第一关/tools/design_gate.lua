--[[----------------------------------------------------------------------------
  tools/design_gate.lua —— 内容设计【设计期】闸门（离线，不改关卡文件）

  跑法（仓库根目录）：
      lua tools/design_gate.lua              # 跑 tools/design_clues.lua 里登记的全部关卡
      lua tools/design_gate.lua case_001     # 只跑一关

  每关做四件事 ✓：

  ① 格式闸门      Core.validate_level
  ② 假话自洽      若声明 meta.false_clue，则【答案上恰好那一条不成立】
  ③ 闸门 A        常规唯一解：线索 + 结构 R3/R4 ⇒ 恰好 1 个 (摆位 × 角色) 解
                  （直接调 Core:solve，所以天然支持"至多一条假话"）
  ④ 闸门 B        「主动因素」规则（2026-10-17 定）：
                    S    = 与【全部真线索 + 每行每列一人 + 家具占格】相容的摆位集合
                    P(X) = 嫌疑人 X 在 S 里出现过的格子集合
                    判据 = 嫌疑人里恰好一个 |P(X)| > 1 ⇒ 那个人是盗窃者（V 豁免）
                  再把该盗窃者代回结构闸门 ⇒ 解应恰好 1 个
                  ★ 这里的"真线索" = 全部线索去掉 meta.false_clue 声明的那一条

  ★ 每关用哪条闸门当判据，在 tools/design_clues.lua 里用 rule = "ambiguity" | "standard" 声明；
    另一条只作信息项打印。

  退出码：0 = 全部通过；1 = 有失败
----------------------------------------------------------------------------]]--

local here = (arg and arg[0]) or "tools/design_gate.lua"
local root = here:gsub("tools[/\\]design_gate%.lua$", "")
package.path = table.concat({
  package.path,
  root .. "lua/?.lua",
  root .. "lua/?/init.lua",
  root .. "?.lua",
  root .. "tools/?.lua",
}, ";")

local Core = require("murdoku_core")
local Design = require("design_clues")

local only = arg and arg[1] or nil
local fails = 0
local function bad(msg) fails = fails + 1; print("  [FAIL] " .. msg) end
local function ok(msg) print("  [PASS] " .. msg) end

local function cfgKeyOf(g, rows, cols)
  local t = {}
  for r = 1, rows do for c = 1, cols do
    if g[r][c] then t[#t + 1] = g[r][c] .. "(" .. r .. "," .. c .. ")" end
  end end
  table.sort(t); return table.concat(t, " ")
end

--------------------------------------------------------------------------------
local function analyse(level_id, spec)
  print("")
  print(string.rep("=", 74))
  print(string.format("关卡 %s   （rule = %s）", level_id, tostring(spec.rule or "ambiguity")))
  print(string.rep("=", 74))

  local ok_req, LV = pcall(require, "levels." .. level_id)
  if not ok_req or type(LV) ~= "table" then
    bad("关卡模块加载失败：" .. tostring(LV))
    return
  end

  local function clone(t) local o = {} for k, v in pairs(t or {}) do o[k] = v end return o end
  local level = clone(LV)
  if spec.objects then level.objects = spec.objects end
  level.blocked = {}; level.water = {}
  level.clues = spec.clues or {}
  local meta = clone(LV.meta or {})
  for k, v in pairs(spec.meta or {}) do meta[k] = v end
  level.meta = meta

  local rule = spec.rule or "ambiguity"
  local lieIdx = tonumber(meta.false_clue)

  -- ① 格式
  local vok, verrs = Core.validate_level(level)
  if vok then ok("① 格式闸门 Core.validate_level") else
    bad("① 格式闸门")
    for _, e in ipairs(verrs or {}) do print("        - " .. e) end
  end

  local core, cerr = Core.new(level)
  if not core then
    bad("构造 Core 失败" .. (cerr and ("：" .. tostring(cerr[1])) or ""))
    return
  end

  -- 把 LV.solution（按棋子 id 索引）折成网格，才能和求解器返回的 placement 比
  local ansGrid = {}
  for r = 1, core.rows do ansGrid[r] = {} end
  for id, p in pairs(LV.solution or {}) do
    if type(p) == "table" and p.r and p.c then ansGrid[p.r][p.c] = id end
  end
  local KEY_ANS = cfgKeyOf(ansGrid, core.rows, core.cols)
  local DECLARED = LV.roles and LV.roles.thief or nil
  local DECLARED_ACC = LV.roles and LV.roles.accomplice or nil

  -- ② 假话自洽（在答案上逐条判定）
  do
    for id, p in pairs(core.solution) do core:select_suspect(id); core:hold_cell(p.r, p.c) end
    local res = core:clue_results()
    local nFail, failedAt = 0, {}
    for i = 1, #res do
      if not res[i].satisfied then nFail = nFail + 1; failedAt[#failedAt + 1] = i end
    end
    print(string.format("      答案上不成立的条数 = %d%s", nFail,
      (#failedAt > 0) and ("（第 " .. table.concat(failedAt, ",") .. " 条）") or ""))
    if lieIdx then
      if nFail == 1 and failedAt[1] == lieIdx then
        ok(string.format("② 假话自洽：声明第 %d 条为假，答案上恰好它不成立", lieIdx))
      else
        bad(string.format("② 假话不自洽：声明第 %s 条为假，答案上不成立 %d 条（%s）",
          tostring(lieIdx), nFail, table.concat(failedAt, ",")))
      end
    else
      if nFail == 0 then ok("② 无假话：五条/全部线索在答案上均成立")
      else bad(string.format("② 未声明假话，但答案上有 %d 条不成立", nFail)) end
    end
    -- 结构
    local sok, serrs, sinfo = core:structure_report()
    if sok then
      ok(string.format("   结构闸门：受害者区域 #%s，k=%d，门相邻 %s，无辜最多 %s",
        tostring(sinfo.victim_room), sinfo.k or 0,
        table.concat(sinfo.adjacent or {}, ","), tostring(sinfo.best)))
    else
      bad("   结构闸门")
      for _, e in ipairs(serrs or {}) do print("        - " .. e) end
    end
  end

  -- 真线索（去掉声明为假的那条）—— 闸门 B 与 S 都用它
  local trueClues = {}
  for i = 1, #(level.clues or {}) do
    if i ~= lieIdx then trueClues[#trueClues + 1] = level.clues[i] end
  end

  -- ③ 闸门 A：直接问引擎
  print("\n  ── 闸门 A：线索 + 结构规则（Core:solve）──")
  local sols = core:solve(60)
  print(string.format("     解数 = %d%s", #sols, (#sols >= 60) and "（达上限 60）" or ""))
  local A_ok = false
  if #sols == 1 then
    local s = sols[1]
    local k = cfgKeyOf(s.placement, core.rows, core.cols)
    print(string.format("     解1：盗窃者=%s 同伙=%s ｜ %s%s", tostring(s.thief), tostring(s.accomplice), k,
      (k == KEY_ANS) and "  ★ 答案摆位" or "  （非答案摆位！）"))
    A_ok = (s.thief == DECLARED) and (s.accomplice == DECLARED_ACC) and (k == KEY_ANS)
  else
    for i = 1, math.min(#sols, 6) do
      local s = sols[i]
      print(string.format("     解%d：盗窃者=%-2s 同伙=%-4s ｜ %s", i, tostring(s.thief),
        tostring(s.accomplice), cfgKeyOf(s.placement, core.rows, core.cols)))
    end
    if #sols > 6 then print("     ……") end
  end
  if rule == "standard" then
    if A_ok then ok("③ 闸门 A 通过：恰好 1 个解且 = 声明的答案")
    else bad(string.format("③ 闸门 A 未通过（rule=standard）：期望 1 解 / 盗窃者 %s / 同伙 %s",
      tostring(DECLARED), tostring(DECLARED_ACC))) end
  else
    print(string.format("     （信息项：本关 rule=%s，闸门 A 不作判据）", rule))
  end

  -- ④ 闸门 B：主动因素规则
  print("\n  ── 闸门 B：盗窃者 = 唯一「位置没被钉死」的嫌疑人（V 豁免）──")
  local ids = {}
  for i = 1, #core.pieces do ids[i] = core.pieces[i].id end
  local grid = {}
  for r = 1, core.rows do grid[r] = {} end
  local function install(g)
    local sg, sp, src, scc = core.grid, core.pos, core.row_count, core.col_count
    core.grid = g; core.pos = {}; core.row_count, core.col_count = {}, {}
    for r = 1, core.rows do core.row_count[r] = 0 end
    for c = 1, core.cols do core.col_count[c] = 0 end
    for r = 1, core.rows do for c = 1, core.cols do
      local id = g[r][c]
      if id then core.pos[id] = { r = r, c = c }
        core.row_count[r] = core.row_count[r] + 1; core.col_count[c] = core.col_count[c] + 1 end
    end end
    return function() core.grid, core.pos, core.row_count, core.col_count = sg, sp, src, scc end
  end
  local S = {}
  local nAll = 0
  do
    local keep = core.clues
    local function consider()
      local restore = install(grid)
      core.clues = trueClues
      local res = core:clue_results({ thief = DECLARED, accomplice = DECLARED_ACC, victim = core.victim_id })
      core.clues = keep
      local all = true
      for k = 1, #res do if not res[k].satisfied then all = false break end end
      restore()
      nAll = nAll + 1
      if all then
        local s = {}
        for r = 1, core.rows do s[r] = {} for c = 1, core.cols do s[r][c] = grid[r][c] end end
        S[#S + 1] = s
      end
    end
    local function place_at(k)
      if k > #ids then return consider() end
      local id = ids[k]
      for r = 1, core.rows do for c = 1, core.cols do
        if not grid[r][c] and not core:is_blocked(r, c) then
          local rh, ch = false, false
          for cc = 1, core.cols do if grid[r][cc] then rh = true end end
          for rr = 1, core.rows do if grid[rr][c] then ch = true end end
          if not rh and not ch then grid[r][c] = id; place_at(k + 1); grid[r][c] = nil end
        end
      end end
    end
    place_at(1)
  end
  print(string.format("     摆位总数 = %d ｜ 与全部真线索相容的 S = %d", nAll, #S))

  local P = {}
  for _, id in ipairs(ids) do P[id] = {} end
  for _, g in ipairs(S) do
    for r = 1, core.rows do for c = 1, core.cols do
      local id = g[r][c]
      if id then P[id]["(" .. r .. "," .. c .. ")"] = true end
    end end
  end
  local ambiguous = {}
  for _, id in ipairs(ids) do
    local ks = {}
    for k in pairs(P[id]) do ks[#ks + 1] = k end
    table.sort(ks)
    print(string.format("       %-2s ∈ {%s}   共 %d 格", id, table.concat(ks, ","), #ks))
    if #ks > 1 and id ~= core.victim_id then ambiguous[#ambiguous + 1] = id end
  end

  local B_ok = false
  if #ambiguous ~= 1 then
    local msg = string.format("模糊嫌疑人 %d 个（%s）—— 规则选不出唯一盗窃者",
      #ambiguous, (#ambiguous == 0) and "无" or table.concat(ambiguous, ","))
    if rule == "ambiguity" then bad("④ " .. msg) else print("     （信息项：" .. msg .. "）") end
  else
    local thief = ambiguous[1]
    print(string.format("     唯一模糊嫌疑人 = %s ⇒ 判定盗窃者 = %s", thief, thief))
    local B = {}
    for _, g in ipairs(S) do
      local restore = install(g)
      local sok2 = core:structure_report({ thief = thief, accomplice = DECLARED_ACC, victim = core.victim_id })
      restore()
      if sok2 then B[#B + 1] = g end
    end
    print(string.format("     代回结构闸门后的解数 = %d", #B))
    B_ok = (#B == 1 and thief == DECLARED and cfgKeyOf(B[1], core.rows, core.cols) == KEY_ANS)
    if rule == "ambiguity" then
      if B_ok then ok("④ 闸门 B 通过：唯一解且 = 声明的答案（盗窃者 " .. thief .. "）")
      else bad("④ 闸门 B 未通过（rule=ambiguity）") end
    else
      print(string.format("     （信息项：本关 rule=%s，闸门 B 不作判据；判定 = %s）",
        rule, B_ok and "与答案一致" or "与答案不一致"))
    end
  end
end

--------------------------------------------------------------------------------
print("== 内容设计期闸门（离线）==")
local n = 0
for id, spec in pairs(Design.levels) do
  if not only or only == id then analyse(id, spec); n = n + 1 end
end
if n == 0 then
  print("!! design_clues.lua 里没有登记关卡（或用参数筛掉了全部）")
  os.exit(1)
end

print("")
if fails > 0 then
  print(string.format("== 合计 %d 关，未通过 %d 项 ==", n, fails))
  os.exit(1)
end
print(string.format("== 合计 %d 关，全部通过 ==", n))
