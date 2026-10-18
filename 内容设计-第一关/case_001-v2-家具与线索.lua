--[[----------------------------------------------------------------------------
  案件 001《夜盗独行》—— v2 家具与线索片段（可直接粘进 lua/levels/case_001.lua）

  ★ 内容设计第一阶段 · 2026-10-17 · 第二稿
  ★ 人物分布与答案【不变】：D(1,3) B(2,2) A(3,1) V(4,5) C(5,4)，盗窃者 = D
  ★ 家具【全部换新】：旧的 书架 / 展示柜 / 地毯(4,2) 已撤除
  ★ 卡序固定 A → B → C → D → V（= suspects 顺序，见 _person_id_for_pos）
----------------------------------------------------------------------------]]--

local M = {}

-- ★★★ 家具（整段替换关卡里的 objects；blocked / water 保持空表）
--   桌子 + 植物 occupiable = false ⇒ 引擎会把它们所在的格设为"不可站人"
--   地毯 + 椅子 occupiable = true  ⇒ 可站人
M.OBJECTS = {
  ["桌子"] = { cells = { { r = 1, c = 1 }, { r = 2, c = 1 } },                               occupiable = false, kind = "table"  },
  ["植物"] = { cells = { { r = 1, c = 2 }, { r = 5, c = 1 }, { r = 5, c = 3 } },              occupiable = false, kind = "plant"  },
  ["地毯"] = { cells = { { r = 3, c = 1 }, { r = 3, c = 2 }, { r = 2, c = 4 }, { r = 2, c = 5 } }, occupiable = true, kind = "carpet" },
  ["椅子"] = { cells = { { r = 4, c = 2 }, { r = 5, c = 4 } },                                occupiable = true,  kind = "chair"  },
}

-- ★★★ 你现在这一版（a 已改「地毯上唯一的人」）—— ★ 在「主动因素」规则下【不用改，就是唯一解】
--   · 常规规则（只看线索 + 结构 R3/R4）：Core:solve 找到 3 个解（盗窃者 A / B / D）
--   · 主动因素规则（盗窃者 = 唯一「位置没被钉死」的嫌疑人，V 豁免）：
--       相容摆位 S = 2；A/B/C 各 1 格；只有 D 剩 2 格 ⇒ 判盗窃者 = D
--       代回结构闸门 ⇒ 解数 1，摆位 = 关卡答案 ✔
--   · 复算：lua tools/design_gate.lua
M.CLUES_V2 = {
  { type = "only_on_object", who = "A", object = "地毯" },   -- a 只有值班保安站在地毯上
  { type = "beside_object",  who = "B", object = "桌子" },   -- b 前台姑娘在桌子旁
  { type = "on_object",      who = "C", object = "椅子" },   -- c 夜班清洁工站在椅子上
  { type = "beside_object",  who = "D", object = "植物" },   -- d 旧识古董商在植物旁
  { type = "in_col",         who = "V", c = 5 },             -- v 收藏家在第5列
}

-- ★★★ 修法（推荐）：卡 4 换成引用「盗窃者」身份的那一句
--   实测：Core:solve 找到【1 个解】= 盗窃者 D，同伙 nil，摆位 = 关卡答案
--   原理：桌子只有 (1,1)(2,1)，"在桌子旁"只有 (2,2)=B 与 (3,1)=A 两格
--         ⇒ 一句就同时排除 A 与 B；剩下 {C, D}，而 C 在区域 3 过不了结构闸门 ⇒ 只剩 D
M.CLUES_FIXED = {
  { type = "only_on_object",    who = "A", object = "地毯" },
  { type = "beside_object",     who = "B", object = "桌子" },
  { type = "on_object",         who = "C", object = "椅子" },
  { type = "not_beside_object", who = "@thief", object = "桌子" },   -- ★ 卡4 改这一条
  { type = "in_col",            who = "V", c = 5 },
}

-- ★ 另一条同样唯一的走法：保留卡4「我在植物旁」，改卡5（V）
M.CLUES_FIXED_KEEP_PLANT = {
  { type = "only_on_object",    who = "A", object = "地毯" },
  { type = "beside_object",     who = "B", object = "桌子" },
  { type = "on_object",         who = "C", object = "椅子" },
  { type = "beside_object",     who = "D", object = "植物" },        -- ★ 保留"我在植物旁"
  { type = "not_beside_object", who = "@thief", object = "桌子" },   -- ★ 卡5 改这一条
}

-- ★ meta：引导关不设假话，并明说"线索全部为真"
M.META = {
  false_clue = nil,
  announce   = "none",   -- none | one | unknown ⇒ none 时界面显示「※ 线索全部为真」
}

-- ★ 编辑器 row.1.<k> 的四个子控件要填的值（方案丁：线索内容由 row.* 承载）
--   ★ what 建议【逐字照抄】引擎渲染文案，别另写一版 —— 两处各写一份必然漂移
M.ROW_CARD_TEXT = {
  { pos = 1, piece = "A", who = "值班保安",   letter = "A", face = "portrait.A", what = "只有 值班保安 站在 地毯 上" },
  { pos = 2, piece = "B", who = "前台姑娘",   letter = "B", face = "portrait.B", what = "前台姑娘 在 桌子 旁边" },
  { pos = 3, piece = "C", who = "夜班清洁工", letter = "C", face = "portrait.C", what = "夜班清洁工 站在 椅子 上" },
  -- ⚠️ 卡 4 是真问题：who 填「盗窃者」不剧透；face / letter 留空还是填 D 的资料，需要你拍板
  { pos = 4, piece = "D", who = "盗窃者",     letter = nil, face = nil,           what = "盗窃者 不在 桌子 旁边" },
  { pos = 5, piece = "V", who = "收藏家",     letter = "V", face = "portrait.V", what = "收藏家 在第5列" },
}

return M
