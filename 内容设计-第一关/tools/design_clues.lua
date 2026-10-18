--[[----------------------------------------------------------------------------
  tools/design_clues.lua —— 设计期线索表（不进运行时，只给离线闸门用）

  ★ 为什么单独放这里 ✗：
    项目已定案「真关卡不写手写线索表」✓（tests/clue_slots.lua 第 2/3 节 ✓），
    线索卡内容由编辑器 `row.<关>.<行>.who/what/letter/face` 承载 ✓
    ⇒ 关卡文件里没有带 type 的线索 ⇒ 运行时校验器只能报「未测」✓
    ⇒ 所以内容设计阶段的闸门**全部离线跑** ✓ —— 线索就登记在这个文件里 ✓

  ★ 加一关就在这里加一条 ✓（关卡本体仍从 lua/levels/<id>.lua 读，不复制）
----------------------------------------------------------------------------]]--

local M = {}

-- 键 = 关卡 id（对应 lua/levels/<id>.lua）
M.levels = {

  case_001 = {
    -- ★ 本关用哪条闸门 ✓：
    --   "ambiguity" = 盗窃者由「主动因素」规则判定（唯一位置没被钉死的嫌疑人，V 豁免）
    --   "standard"  = 盗窃者由线索直接给（含引用 @thief 的线索），闸门 A 必须过
    rule = "ambiguity",
    -- 家具（整段替换关卡里的 objects；旧的 书架/展示柜/地毯(4,2) 已撤除）
    objects = {
      ["桌子"] = { cells = { { r = 1, c = 1 }, { r = 2, c = 1 } },                                   occupiable = false, kind = "table"  },
      ["植物"] = { cells = { { r = 1, c = 2 }, { r = 5, c = 1 }, { r = 5, c = 3 } },                  occupiable = false, kind = "plant"  },
      ["地毯"] = { cells = { { r = 3, c = 1 }, { r = 3, c = 2 }, { r = 2, c = 4 }, { r = 2, c = 5 } }, occupiable = true,  kind = "carpet" },
      ["椅子"] = { cells = { { r = 4, c = 2 }, { r = 5, c = 4 } },                                    occupiable = true,  kind = "chair"  },
    },
    -- 卡序 = suspects 顺序 = A B C D V（见 ui_controller 的 _person_id_for_pos）
    clues = {
      { type = "only_on_object", who = "A", object = "地毯" },   -- a 只有值班保安站在地毯上
      { type = "beside_object",  who = "B", object = "桌子" },   -- b 前台姑娘在桌子旁
      { type = "on_object",      who = "C", object = "椅子" },   -- c 夜班清洁工站在椅子上
      { type = "beside_object",  who = "D", object = "植物" },   -- d 旧识古董商在植物旁
      { type = "in_col",         who = "V", c = 5 },             -- v 收藏家在第5列
    },
    meta = { false_clue = nil, announce = "none" },
  },

  -- ══════════════════════════════════════════════════════════════════
  -- 案件 002《双影》—— 第二关：强调【同伙】与【谎言】
  --   规模 6×6，6 枚棋子（A/B/C/D/E + 受害者 V），答案 D(1,1) C(2,4) A(3,3) B(4,2) V(5,6) E(6,5)
  --   盗窃者 = D，同伙 = C
  --   ★ 结构：区域 1（左上 4×4，16 格）/ 区域 2（右侧 6×2，12 格）/ 区域 3（左下，8 格，答案里是空的）
  --   ★ 教学点 1：馆长与随行记者【单独共处一室】⇒ k=2 ⇒ 必有同伙
  --   ★ 教学点 2：同伙在盗窃者的南 1 格、东 3 格 ⇒ 同伙与盗窃者同区
  --   ★ 谎言：第 9 条（搬运工在倒数第 1 列）—— 实际在第 4 列
  --   ★ 走常规闸门（rule = "standard"）：身份由引用 @thief / @accomplice 的线索给出
  -- ══════════════════════════════════════════════════════════════════
  case_002 = {
    rule = "standard",
    -- 家具保持关卡原样（书架/展示柜/地毯），不在这里覆盖
    clues = {
      { type = "at",           who = "V", r = 5, c = 6 },                              -- 1 馆长在 (5,6)
      { type = "alone_with",   a = "V", b = "E" },                                     -- 2 ★ 教学点1
      { type = "offset",       who = "E", other = "V", dr = 1, dc = -1 },              -- 3 记者在馆长南1格西1格
      { type = "at",           who = "@thief", r = 1, c = 1 },                         -- 4 盗窃者在 (1,1)
      { type = "offset",       who = "@accomplice", other = "@thief", dr = 1, dc = 3 },-- 5 ★ 教学点2
      { type = "at",           who = "A", r = 3, c = 3 },                              -- 6 门卫在 (3,3)
      { type = "at",           who = "B", r = 4, c = 2 },                              -- 7 助理在 (4,2)
      { type = "not_role",     who = "D", role = "accomplice" },                       -- 8 ★ 身份判别
      { type = "abs_col_from", who = "C", n = 1, from = "right" },                     -- 9 ★ 假话
    },
    meta = { false_clue = 9, announce = "one" },
  },

}

return M
