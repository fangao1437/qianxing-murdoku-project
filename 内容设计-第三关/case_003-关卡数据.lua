--[[----------------------------------------------------------------------------
  levels/case_003.lua —— 案件 003《月谕茶会》7×7 v2b（复合线索版）
  7 枚棋子 A B C D E F V；受害者 V 魔法师；盗窃者 E 猫「墨」；roles 不声明同伙。

  墙/门（用户定，未改）：
    h,5,1..4 / h,4,5..7 / v,1..5,4
    R1 长桌厅 1-5行×1-4列(20) / R2 月窗廊 1-4行×5-7列(12) / R3 后厅 其余(17)
    门 v,2,4 / h,4,7 / v,5,4 ⇒ Adj(R2)={R1,R3}

  主题对象：
    长桌 (3,2)(4,2)(5,2) 不可站；椅子 6 格可站（长桌两侧）
    月窗 (3,6)(3,7) 不可站（R2 月窗廊，横跨两格的窗）
    玫瑰藤 (6,6) 不可站（R3 后厅）
    软垫 (7,5) 可站（R3 后厅；诗人 B 坐在上面）
    （茶壶/羽毛笔/餐刀/甜点盘/蛋糕架/烛台 = 叠加层，不在 objects，线索不引用）

  答案：A(1,2) D(2,3) E(3,1) V(4,6) F(5,4) C(6,7) B(7,5)
    R1={A,D,E,F}(4) / R2={V}(1) / R3={B,C}(2) ⇒ inno(R1)=3 > inno(R3)=2，thief 在 R1 ✔

  七张卡（卡 k = 第 k 枚棋子说的；说话人≠主体）：
    卡1 A→B：诗人坐在软垫上（on_object B 软垫）                   真
    卡2 B→D：钟表匠在掌灯人北 3 西 1（offset D←F）                 真
    卡3 C→F：掌灯人在诗人北 2 西 1（offset F←B）                   真
    卡4 D→A：司茶女仆在钟表匠北 1 西 1（offset A←D）               真
    卡5 E→E：我一下午都趴在软垫上（on_object E 软垫）                **假**（唯一假话）
    卡6 F→@thief：盗窃者在长桌旁（beside_object @thief 长桌）       真
    卡7 V→复合：魔法师独处，且甜点师在魔法师下方的不同区域
        （alone_and_below_in_other_room who=V, a=C, b=V）            真
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
    { "v", 2, 4 },
    { "h", 4, 7 },
    { "v", 5, 4 },
  },

  objects = {
    ["长桌"]   = { cells = { { r = 3, c = 2 }, { r = 4, c = 2 }, { r = 5, c = 2 } },
                   occupiable = false, kind = "table" },
    ["椅子"]   = { cells = { { r = 3, c = 1 }, { r = 3, c = 3 },
                             { r = 4, c = 1 }, { r = 4, c = 3 },
                             { r = 5, c = 1 }, { r = 5, c = 3 } },
                   occupiable = true,  kind = "chair" },
    ["月窗"]   = { cells = { { r = 3, c = 6 }, { r = 3, c = 7 } },
                   occupiable = false, kind = "window" },
    ["玫瑰藤"] = { cells = { { r = 6, c = 6 } }, occupiable = false, kind = "rose" },
    ["软垫"]   = { cells = { { r = 7, c = 5 } }, occupiable = true,  kind = "cushion" },
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
    { type = "on_object",     who = "B", object = "软垫" },                     -- 卡1 A 说
    { type = "offset",        who = "D", other = "F", dr = -3, dc = -1 },        -- 卡2 B 说
    { type = "offset",        who = "F", other = "B", dr = -2, dc = -1 },        -- 卡3 C 说
    { type = "offset",        who = "A", other = "D", dr = -1, dc = -1 },        -- 卡4 D 说
    { type = "on_object",     who = "E", object = "软垫" },                      -- 卡5 E（唯一假话）
    { type = "beside_object", who = "@thief", object = "长桌" },                 -- 卡6 F 说
    { type = "alone_and_below_in_other_room", who = "V", a = "C", b = "V" },     -- 卡7 V 说
  },

  meta = {
    false_clue = 5,
    announce   = "unknown",
  },

  solution = {
    A = { r = 1, c = 2 },
    D = { r = 2, c = 3 },
    E = { r = 3, c = 1 },
    V = { r = 4, c = 6 },
    F = { r = 5, c = 4 },
    C = { r = 6, c = 7 },
    B = { r = 7, c = 5 },
  },
}