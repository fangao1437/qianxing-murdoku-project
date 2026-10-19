--[[----------------------------------------------------------------------------
  levels/case_003.lua —— 案件 003《月谕茶会》7×7 版（7 枚棋子 A B C D E F V）
  受害者 = V 魔法师；盗窃者 = E 猫「墨」；roles 不声明同伙。

  ── 区域（墙位按用户指定）──────────────────────────────────────────────
    墙：h,5,1..4 / h,4,5..7 / v,1..5,4
    R1 长桌厅：第 1-5 行 × 第 1-4 列（20 格）
    R2 月窗廊：第 1-4 行 × 第 5-7 列（12 格）
    R3 后厅：  第 5 行第 5-7 列 ＋ 第 6-7 行全部（17 格）
    门：v,2,4（R1↔R2）、h,4,7（R2↔R3）、v,5,4（R1↔R3）
    ⇒ Adj(R2) = { R1, R3 }

  ── 答案座次（每行每列各 1 人）──────────────────────────────────────────
    A(1,2) V(2,7) E(3,1) F(4,3) D(5,4) B(6,5) C(7,6)
    R1 = {A, E, F, D}（4 人；E=盗窃者，无辜 3）  R2 = {V}（1 人）
    R3 = {B, C}（2 人，皆无辜）
    ⇒ inno(R1)=3 ＞ inno(R3)=2，thief 在 R1 ✔

  ── 家具（用户指定；茶壶/烛台等叠加层一律不写入 objects）──────────────
    长桌：(3,2)(4,2)(5,2) 不可站（参与线索）
    椅子：(3,1)(3,3)(4,1)(4,3)(5,1)(5,3) 可站（参与线索）
    月窗：(1,1) 不可站（参与线索：钉 A）
    玫瑰藤：(2,1) 不可站（参与线索：@thief 占卜）
    软垫：(6,7) 可站（参与线索：猫的假话）

  ── 七张卡（卡 k = 第 k 枚棋子 A,B,C,D,E,F,V 说的）────────────────────
    卡1 A：F 在 A 的南 3 东 1（offset）              真
    卡2 B：D 在 A 的南 4 东 2（offset）              真
    卡3 C：B 在 D 的南 1 东 1（offset）              真
    卡4 D：A 在月窗旁（beside_object）                真
    卡5 E：E 在软垫上（on_object）                    **假**（唯一假话）
    卡6 F：C 在 B 的南 1 东 1（offset）              真
    卡7 V：盗窃者在玫瑰藤旁（beside_object @thief）  真
    meta.false_clue = 5，announce = "unknown"
----------------------------------------------------------------------------]]--

return {
  id = "case_003",
  name = "案件 003 · 月谕茶会",
  subtitle = "午后三点的茶会少了一点光。魔法师独坐月窗 —— 唯有猫的牌，在说谎。",
  difficulty = "hard",

  size = { rows = 7, cols = 7 },

  rules = {
    one_per_row  = true,
    one_per_col  = true,
    one_per_room = false,
    place_all    = true,
    tie_policy   = "forbid",
  },

  walls = {
    { "h", 5, 1 }, { "h", 5, 2 }, { "h", 5, 3 }, { "h", 5, 4 },
    { "h", 4, 5 }, { "h", 4, 6 }, { "h", 4, 7 },
    { "v", 1, 4 }, { "v", 2, 4 }, { "v", 3, 4 }, { "v", 4, 4 }, { "v", 5, 4 },
  },

  doors = {
    { "v", 2, 4 },   -- R1 ↔ R2：长桌厅 ↔ 月窗廊
    { "h", 4, 7 },   -- R2 ↔ R3：月窗廊 ↔ 后厅
    { "v", 5, 4 },   -- R1 ↔ R3：长桌厅 ↔ 后厅
  },

  objects = {
    ["长桌"]   = { cells = { { r = 3, c = 2 }, { r = 4, c = 2 }, { r = 5, c = 2 } },
                   occupiable = false, kind = "table" },
    ["椅子"]   = { cells = { { r = 3, c = 1 }, { r = 3, c = 3 },
                             { r = 4, c = 1 }, { r = 4, c = 3 },
                             { r = 5, c = 1 }, { r = 5, c = 3 } },
                   occupiable = true,  kind = "chair" },
    ["月窗"]   = { cells = { { r = 1, c = 1 } }, occupiable = false, kind = "window" },
    ["玫瑰藤"] = { cells = { { r = 2, c = 1 } }, occupiable = false, kind = "rose" },
    ["软垫"]   = { cells = { { r = 6, c = 7 } }, occupiable = true,  kind = "cushion" },
  },
  blocked = {},
  water   = {},

  suspects = {
    { id = "A", name = "司茶女仆", portrait = "portrait.A", gender = "female" },
    { id = "B", name = "午后诗人", portrait = "portrait.B", gender = "male" },
    { id = "C", name = "甜点师",   portrait = "portrait.C", gender = "female" },
    { id = "D", name = "钟表匠",   portrait = "portrait.D", gender = "male" },
    { id = "E", name = "猫「墨」", portrait = "portrait.E", gender = "female" },
    { id = "F", name = "掌灯人",   portrait = "portrait.F", gender = "male" },
    { id = "V", name = "魔法师",   portrait = "portrait.V", is_victim = true },
  },

  victim = { id = "V", name = "魔法师" },

  roles = {
    thief = "E",
  },

  clues = {
    { type = "offset",        who = "F", other = "A", dr = 3, dc = 1 },  -- 卡1 A 说
    { type = "offset",        who = "D", other = "A", dr = 4, dc = 2 },  -- 卡2 B 说
    { type = "offset",        who = "B", other = "D", dr = 1, dc = 1 },  -- 卡3 C 说
    { type = "beside_object", who = "A", object = "月窗" },              -- 卡4 D 说
    { type = "on_object",     who = "E", object = "软垫" },              -- 卡5 E（唯一假话）
    { type = "offset",        who = "C", other = "B", dr = 1, dc = 1 },  -- 卡6 F 说
    { type = "beside_object", who = "@thief", object = "玫瑰藤" },       -- 卡7 V 的月谕占卜
  },

  meta = {
    false_clue = 5,
    announce   = "unknown",
  },

  solution = {
    A = { r = 1, c = 2 },
    V = { r = 2, c = 7 },
    E = { r = 3, c = 1 },
    F = { r = 4, c = 3 },
    D = { r = 5, c = 4 },
    B = { r = 6, c = 5 },
    C = { r = 7, c = 6 },
  },
}