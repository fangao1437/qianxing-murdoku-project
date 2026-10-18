--[[----------------------------------------------------------------------------
  案件 001《夜盗独行》—— 线索片段（可直接粘进 lua/levels/case_001.lua）

  ★ 内容设计第一阶段 · 2026-10-17
  ★ 五条线索 = 棋盘容量 min(5,5) = 5 = 棋子数（一人一条）
  ★ 卡序固定 A → B → C → D → V（= suspects 顺序，见 _person_id_for_pos）
  ★ 全部为真（本关不设假话）★ 不涉及"同伙"概念

  ⚠️ 粘哪一段取决于你选的方案（见 案件001-设计说明.md §7）：
     方案甲 ⇒ 用下面的 CLUES_TYPED 整段替换关卡里的 clues（今天就能被校验器吃）
     方案乙 / 丁 ⇒ 关卡里【不要】写 clues，只把 ROW_CARD_TEXT 填进编辑器 row.1.*
----------------------------------------------------------------------------]]--

local M = {}

-- ★★★ 方案甲：手写类型化 clues（粘进关卡表即可）
--   注意：走这条路会让 tests/clue_slots.lua 的 L91 / L106 两条哨兵转红
M.CLUES_TYPED = {
  { type = "in_row",        who = "A",      r = 3 },              -- 卡1 值班保安：在第3行
  { type = "in_col",        who = "B",      c = 2 },              -- 卡2 前台姑娘：在第2列
  { type = "beside_object", who = "C",      object = "展示柜" },   -- 卡3 夜班清洁工：在展示柜旁
  { type = "at",            who = "@thief", r = 1, c = 3 },       -- 卡4 盗窃者（角色别名）：在第1行第3列
  { type = "at",            who = "V",      r = 4, c = 5 },       -- 卡5 收藏家：在第4行第5列
}

-- ★★★ 方案乙：槽位由引擎生成，逻辑另放一张表（需要工程侧让 core 认这个字段）
M.CLUE_RULES = {
  { slot = 1, type = "in_row",        who = "A",      r = 3 },
  { slot = 2, type = "in_col",        who = "B",      c = 2 },
  { slot = 3, type = "beside_object", who = "C",      object = "展示柜" },
  { slot = 4, type = "at",            who = "@thief", r = 1, c = 3 },
  { slot = 5, type = "at",            who = "V",      r = 4, c = 5 },
}

-- ★★★ meta：引导关不设假话，并明说"线索全部为真"
M.META = {
  false_clue = nil,
  announce   = "none",   -- none | one | unknown ⇒ none 时界面显示「※ 线索全部为真」
}

-- ★★★ 方案丁：这五句就是编辑器 row.1.<k> 下 who / letter / face / what 四个子控件要填的值
--   ★ what 建议【逐字照抄】引擎渲染文案，别另写一版 —— 两处各写一份必然漂移
M.ROW_CARD_TEXT = {
  { pos = 1, piece = "A", who = "值班保安",   letter = "A", face = "portrait.A", what = "值班保安 在第3行" },
  { pos = 2, piece = "B", who = "前台姑娘",   letter = "B", face = "portrait.B", what = "前台姑娘 在第2列" },
  { pos = 3, piece = "C", who = "夜班清洁工", letter = "C", face = "portrait.C", what = "夜班清洁工 在 展示柜 旁边" },
  -- ⚠️ 卡 4 是真问题：who 填「盗窃者」不剧透；face / letter 留空还是填 D 的资料，需要你拍板
  { pos = 4, piece = "D", who = "盗窃者",     letter = nil, face = nil,           what = "盗窃者 在 第1行第3列" },
  { pos = 5, piece = "V", who = "收藏家",     letter = "V", face = "portrait.V", what = "收藏家 在 第4行第5列" },
}

return M
