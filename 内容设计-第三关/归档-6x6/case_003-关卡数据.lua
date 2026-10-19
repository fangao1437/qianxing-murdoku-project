--[[----------------------------------------------------------------------------
  levels/case_003.lua —— 案件 003《月谕茶会》
  6×6 / 棋子 A B C D E V（无同伙）/ 受害者 = 魔法师 V / 盗窃者 = 猫 E

  ── 区域（4 个，由墙洪泛划分）────────────────────────────────────────────
    R1 长桌厅：第 1-3 行 × 第 1-4 列（12 格）
    R2 月窗廊：第 1-4 行 × 第 5-6 列（ 8 格）
    R3 茶点间：第 4 行第 1-4 列 ＋ 第 5-6 行第 1-4 列（12 格）
    R4 玫瑰廊：第 5-6 行 × 第 5-6 列（ 4 格）
    门：R1↔R2 (v,2,4)、R2↔R4 (h,4,6)、R1↔R3 (h,3,1)、R3↔R4 (v,5,4)
    ⇒ Adj(R2) = { R1, R4 }（R3 与 R2 不相邻）
    ⇒ R3 结构：R1 的无辜数 = 2（A、B）＞ R4 的无辜数 = 1（D）
       ⇒ 盗窃者必在 R1 长桌厅。

  ── 答案座次（每行每列各 1 人）──────────────────────────────────────────
    行1 A(1,4)／行2 E(2,2)／行3 B(3,3)／行4 V(4,6)／行5 C(5,1)／行6 D(6,5)
    R1={A,B,E}（3 人） R2={V} R3={C} R4={D}

  ── 六张卡（卡 i 由第 i 枚棋子 A,B,C,D,E,V 说出；说话人 ≠ 线索主体）────
    卡1 A → B：羽毛笔    卡2 B → C：蛋糕架
    卡3 C → D：怀表      卡4 D → A：茶壶
    卡5 E → E：软垫（唯一假话）  卡6 V → @thief：长桌（月谕圣牌的占卜）
    meta.false_clue = 5，announce = "unknown"

  ── 备注 ────────────────────────────────────────────────────────────────
    · 家具互锁是"精确钉人"的设计：每件器物在房间内的可站四邻只留主人一格
      （茶壶/羽毛笔/蛋糕架/怀表），因此卡 1-4 各自把一个人钉死在唯一格。
    · (1,1)(2,2)(3,1)(4,2)(5,3) 保持可站（tests/gray_unplace 的夹具格）。
    · 本案不声明同伙：engine 的 Solve 仍会枚举"幻影同伙"，因此解表里会出现
      同摆位、同盗窃者、仅 accomplice 字段不同的条目；玩家侧只指认盗窃者，
      按 (摆位, thief) 去重后恰好 1 个解。
----------------------------------------------------------------------------]]--

return {
  id = "case_003",
  name = "案件 003 · 月谕茶会",
  subtitle = "午后三点的茶会少了一点光。魔法师独坐月窗 —— 唯有猫的牌，在说谎。",
  difficulty = "hard",

  size = { rows = 6, cols = 6 },

  rules = {
    one_per_row  = true,
    one_per_col  = true,
    one_per_room = false,
    place_all    = true,
    tie_policy   = "forbid",
  },

  -- 墙 = 区域边界
  walls = {
    { "v", 1, 4 }, { "v", 2, 4 }, { "v", 3, 4 },                  -- R1 | R2
    { "v", 4, 4 },                                                -- R3 | R2
    { "h", 3, 1 }, { "h", 3, 2 }, { "h", 3, 3 }, { "h", 3, 4 },   -- R1 | R3/R4 侧
    { "h", 4, 5 }, { "h", 4, 6 },                                 -- R2 | R4
    { "v", 5, 4 }, { "v", 6, 4 },                                 -- R3 | R4
  },

  -- 门径（不改变区域划分，只建立区域相邻）
  doors = {
    { "v", 2, 4 },   -- R1 ↔ R2：长桌厅 ↔ 月窗廊
    { "h", 4, 6 },   -- R2 ↔ R4：月窗廊 ↔ 玫瑰廊
    { "h", 3, 1 },   -- R1 ↔ R3：长桌厅 ↔ 茶点间
    { "v", 5, 4 },   -- R3 ↔ R4：茶点间 ↔ 玫瑰廊
  },

  objects = {
    ["长桌"]   = { cells = { { r = 1, c = 2 }, { r = 2, c = 1 } }, occupiable = false, kind = "table" },
    ["茶壶"]   = { cells = { { r = 2, c = 4 } }, occupiable = false, kind = "teapot" },
    ["羽毛笔"] = { cells = { { r = 3, c = 4 } }, occupiable = false, kind = "quill" },
    ["糖罐"]   = { cells = { { r = 2, c = 3 } }, occupiable = false, kind = "jar" },
    ["椅子"]   = { cells = { { r = 3, c = 2 } }, occupiable = true,  kind = "chair" },
    ["月窗"]   = { cells = { { r = 4, c = 5 } }, occupiable = false, kind = "window" },
    ["蛋糕架"] = { cells = { { r = 6, c = 1 } }, occupiable = false, kind = "cake" },
    ["餐刀"]   = { cells = { { r = 6, c = 2 } }, occupiable = false, kind = "knife" },
    ["怀表"]   = { cells = { { r = 5, c = 5 } }, occupiable = false, kind = "watch" },
    ["玫瑰藤"] = { cells = { { r = 5, c = 6 } }, occupiable = false, kind = "rose" },
    ["软垫"]   = { cells = { { r = 6, c = 6 } }, occupiable = true,  kind = "cushion" },
  },
  blocked = {},
  water   = {},

  suspects = {
    { id = "A", name = "司茶女仆", portrait = "portrait.A", gender = "female" },
    { id = "B", name = "午后诗人", portrait = "portrait.B", gender = "male" },
    { id = "C", name = "甜点师",   portrait = "portrait.C", gender = "female" },
    { id = "D", name = "钟表匠",   portrait = "portrait.D", gender = "male" },
    { id = "E", name = "猫「墨」", portrait = "portrait.E", gender = "female" },
    { id = "V", name = "魔法师",   portrait = "portrait.V", is_victim = true },
  },

  victim = { id = "V", name = "魔法师" },

  roles = {
    thief = "E",
  },

  -- 卡 i 由第 i 枚棋子说出：A, B, C, D, E, V（说话人 ≠ 线索主体）
  clues = {
    { type = "beside_object", who = "B", object = "羽毛笔" },      -- 卡1 A 说：诗人在羽毛笔旁
    { type = "only_beside",   who = "C", object = "蛋糕架" },      -- 卡2 B 说：甜点师守在蛋糕架旁
    { type = "only_beside",   who = "D", object = "怀表" },        -- 卡3 C 说：钟表匠离怀表只有一步
    { type = "beside_object", who = "A", object = "茶壶" },        -- 卡4 D 说：女仆整晚在茶壶边
    { type = "on_object",     who = "E", object = "软垫" },        -- 卡5 E 说：我一直在软垫上（假话）
    { type = "beside_object", who = "@thief", object = "长桌" },   -- 卡6 V 说：月谕圣牌·盗窃者在长桌旁
  },

  meta = {
    false_clue = 5,
    announce   = "unknown",
  },

  solution = {
    A = { r = 1, c = 4 },   -- R1 长桌厅（茶壶旁）
    E = { r = 2, c = 2 },   -- R1 长桌厅（长桌旁；盗窃者）
    B = { r = 3, c = 3 },   -- R1 长桌厅（羽毛笔旁/椅子旁）
    V = { r = 4, c = 6 },   -- R2 月窗廊（受害者，独处）
    C = { r = 5, c = 1 },   -- R3 茶点间（蛋糕架旁）
    D = { r = 6, c = 5 },   -- R4 玫瑰廊（怀表旁）
  },
}