--[[----------------------------------------------------------------------------
  案件 002《双影》—— 线索片段（可直接粘进 lua/levels/case_002.lua）

  ★ 内容设计第一阶段 · 2026-10-17
  ★ 规模 6×6，6 枚棋子；答案 D(1,1) C(2,4) A(3,3) B(4,2) V(5,6) E(6,5)
  ★ 盗窃者 = D（鉴定师）｜同伙 = C（临时搬运工）｜受害者 = V（馆长）
  ★ 卡序固定 A → B → C → D → E → V（= suspects 顺序）
  ★ 教学点 1：馆长与随行记者单独共处一室 ⇒ k=2 ⇒ 必有同伙
  ★ 教学点 2：同伙在盗窃者的南 1 格、东 3 格 ⇒ 同伙与盗窃者同区
  ★ 谎言：第 9 条（搬运工在倒数第 1 列）—— 实际在第 4 列

  ★★★ 实测（Core:solve）：
      9 条（本方案）              ⇒ 1 个解，盗窃者 D、同伙 C、摆位 = 答案 ✔
      只拿前 8 条（无假话）        ⇒ 1 个解 ⇒ 假话可被识破 ✔
      6 条（每人一条 at，摆位全钉死）⇒ 12 个解 ⇒ 只钉摆位定不出角色 ✗
      6 条（再去掉身份判别）        ⇒ 2 个解（C/D 镜像）✗
      ★ 所以本关需要 9 条，而卡容量只有 6 —— 见 案件002-设计说明.md §六
----------------------------------------------------------------------------]]--

local M = {}

-- ★★★ 九条线索（整段替换关卡里的 clues）
M.CLUES = {
  -- ① 受害者
  { type = "at",           who = "V", r = 5, c = 6 },                               -- 馆长在 (5,6)
  -- ② ★ 教学点 1：玩家由此知道那间屋子恰好 2 人 ⇒ k = 2 ⇒ 必有同伙
  { type = "alone_with",   a = "V", b = "E" },                                      -- 馆长与随行记者单独共处一室
  -- ③ 记者
  { type = "offset",       who = "E", other = "V", dr = 1, dc = -1 },               -- 记者在馆长南1格西1格
  -- ④ 盗窃者（角色别名，不泄露真名）
  { type = "at",           who = "@thief", r = 1, c = 1 },                          -- 盗窃者在 (1,1)
  -- ⑤ ★ 教学点 2：同伙格 = (2,4)，与盗窃者同在区域 1
  { type = "offset",       who = "@accomplice", other = "@thief", dr = 1, dc = 3 }, -- 同伙在盗窃者南1格东3格
  -- ⑥⑦ 两名嫌疑人
  { type = "at",           who = "A", r = 3, c = 3 },                               -- 门卫在 (3,3)
  { type = "at",           who = "B", r = 4, c = 2 },                               -- 助理在 (4,2)
  -- ⑧ ★ 身份判别：破 C/D 镜像（D 不能站同伙格）
  { type = "not_role",     who = "D", role = "accomplice" },                        -- 鉴定师不是同伙
  -- ⑨ ★ 假话：搬运工实际在第 4 列
  { type = "abs_col_from", who = "C", n = 1, from = "right" },                      -- 搬运工在倒数第1列（假）
}

-- ★★★ meta：第二关首次出现谎言，且告诉玩家"恰好一句假话"
M.META = {
  false_clue = 9,        -- ★ 第 9 条是假话
  announce   = "one",    -- one ⇒ 界面显示「※ 线索中有一句假话」
}

-- ★★★ 精简参照（不推荐，仅备查）
--   去掉 ②（alone_with）后 8 条 ⇒ 也唯一，但玩家就得自己从棋盘看出 k=2
M.CLUES_LEAN = {
  { type = "at",           who = "V", r = 5, c = 6 },
  { type = "offset",       who = "E", other = "V", dr = 1, dc = -1 },
  { type = "at",           who = "@thief", r = 1, c = 1 },
  { type = "offset",       who = "@accomplice", other = "@thief", dr = 1, dc = 3 },
  { type = "at",           who = "A", r = 3, c = 3 },
  { type = "at",           who = "B", r = 4, c = 2 },
  { type = "not_role",     who = "D", role = "accomplice" },
  { type = "abs_col_from", who = "C", n = 1, from = "right" },
}

-- ★★★ 卡面文案（编辑器 row.<关>.<行> 的 who / letter / face / what）
--   ⚠️ 9 条事实要装进 6 张卡时需要合并；下面给的是"一卡一句"的展开版
M.ROW_CARD_TEXT = {
  { pos = 1, piece = "A", who = "夜班门卫",   letter = "A", face = "portrait.A", what = "夜班门卫 在 第3行第3列" },
  { pos = 2, piece = "B", who = "画廊助理",   letter = "B", face = "portrait.B", what = "画廊助理 在 第4行第2列" },
  { pos = 3, piece = "C", who = "临时搬运工", letter = "C", face = "portrait.C", what = "临时搬运工 在倒数第 1 列" },
  { pos = 4, piece = "D", who = "鉴定师",     letter = "D", face = "portrait.D", what = "鉴定师 不是同伙" },
  { pos = 5, piece = "E", who = "随行记者",   letter = "E", face = "portrait.E", what = "随行记者 在 馆长 的 南 1 格、西 1 格" },
  { pos = 6, piece = "V", who = "馆长",       letter = "V", face = "portrait.V", what = "馆长 在 第5行第6列" },
  -- 剩下 3 条（盗窃者 / 同伙 / 单独共处一室）目前没有卡位 —— 见 design 说明 §六
}

return M
