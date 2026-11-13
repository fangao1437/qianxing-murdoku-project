# Murdoku 官网深度调研（第二轮） · 设计思路检验 · 线索语言设计 · 设计方案升级

> 依据：本地提交 `2754b545ce20`（v11 关卡设计与《Murdoku线索设计-研究报告》）。
> 本轮日期：2026-11-13。本轮为**证据升级**，不是推翻上一轮：上一轮主要依据 12 套可打印 PDF 与 3 套解答；
> 本轮额外取得官网在线关卡的**全量结构化数据**（74 关目录、73 关题目 JSON、657 条线索原句、32 关官方提示步骤）
> 与前端内置的**规则、FAQ、术语表、进阶技巧**原文，因此可以对上一轮的归纳做逐条核验与量化补正。
>
> 本文所有"官网结论"均注明来源层级；本地项目的谎言规则、区域无辜人数规则仍是**本地扩展**，不得回写成原站事实。

---

## 0. 证据基础与边界

| 来源 | 内容 | 用途 |
|---|---|---|
| `https://www.murdoku.com/play/` | 公开目录、难度标签、棋盘规模 | 难度分布、标签一致性 |
| `https://www.murdoku.com/print?lang=en` | 12 套可打印题目 + 解答 PDF 链接 | 题目/解答原文 |
| 12 套 `*-bw.pdf` / `*-solution.pdf` + 3 套额外 Hard/Expert 解答 | 15 份 PDF 全文 | 逐案例核验上一轮九案归纳 |
| `/play_puzzles/_puzzleCatalog.json` | 74 关元数据（难度、规模、category、releaseAt/leavingAt） | 目录与轮转状态 |
| `/play_puzzles/en/{id}.json` | 73 关完整题目数据：`char_quote_en_N`、`char_subquote_en_N`、`clue_custom_text*`、官方 `player_hint_*_en`、`solution_x/y` | 线索语料库、解答步骤结构 |
| `/play/assets/app-core-*.js` | 官方 HowToPlay / Rules / FAQ / Spatial Glossary / Advanced Techniques 原文 | 语义契约、规则边界 |

**统计口径**：73 个有效关卡 JSON（1 个 `puzzle-lisboa-feiradolivro` 返回损坏数据，未纳入），657 条线索卡原句（含 73 条固定受害者卡），31 关带通用线索，32 关带官方提示步骤。

**边界**：
1. 未逐关通关，未采访作者；官方提示只是**一条**解法路径，不代表最短路径。
2. `category=secret/uncategorized` 与 `leavingAt` 已过期的关卡不出现在公开选关页，但 JSON 仍在服务器，可作为语料，不代表当前在线可玩。
3. 难度标签存在三处口径（目录 / PDF 页内 / 关卡内 `title_en_`），不能当机器标尺。
4. 上一轮"在线人物卡正文未被浏览器读取完整"的限制，本轮通过关卡 JSON 已补足。

---

## 1. 检验上一轮总结的设计思路

### 1.1 九案归纳逐条核验：全部与官方解答一致

| 案例 | 2754b54 报告归纳 | 官方解答原文对应 | 结论 |
|---|---|---|---|
| Car Repair | D 独占等候区 → C 只剩接待区椅子 → 连续排除 | 解答第 1 步："D is alone in the Waiting Room, so there is only one remaining chair C can sit on, in the Reception Hall"；第 2–5 步 oil slick→car→Waiting Room→shelf | ✅ |
| The Backyard Garden | A/E 同处客厅，E 坐该区椅子 → E 占行列 → A → 地毯 F → 卧室 D | 解答第 1 步："A and E are both in the Living Room, so E is on the Living Room chair in R9C5"；第 3/4 步 F/D | ✅ |
| Preppers | 底行被 E 占用 → C 无法在控制室容纳"同区床上男子" → 未识别男子必占第 5 行 | 解答第 1 步："Because E is in the bottom row, C cannot fit in the Command Room with a man. This sets C in the Bedroom, and the unknown man on the bed in R5. Block the rest of R5." | ✅ |
| The Art School | 画廊独处女性在 D 上一行 → 先排除 B/F/A，后识别女性=C | 解答第 1/2/3 步排除 B、F、A；第 5 步："The woman alone in the Gallery one row north of D can only be C" | ✅ |
| The Horse Track | 试 E 在首列 → K、J 争第 2 行 → E 必在末列 → 成组封锁前四行 | 解答第 1 步："If E was in the first column with I, this would then set K in row 2 … and J also in R2 … which is impossible. So E has to be in the last column."；第 2 步 K/F/I/E 占 R1–R4 | ✅ |
| Sleeping with the Fishes | 一船为空；排除"两船皆空"分支；空船需落在两条空列内 | 解答第 1 步两船皆空矛盾；第 2 步"The empty boat must be inside two empty columns"；通用线索"There are exactly two empty columns. One boat is inside the two empty columns." | ✅ |
| The Golf Course | 未知女性占第 12 行 → 旗位 → 奇偶容量 → 两候选交叉封锁 | 解答第 1 步"an unknown woman in a cart, either in R12C1 or R12C4. Block the rest of R12"；第 3/5 步奇偶；第 4 步"J is either in R11C5 or R14C9, block the intersecting squares" | ✅ |
| The Movie Studio | 前六行恰有六份需求，整组饱和 → 排除其他人 | 解答第 1 步："in R1 to R6, three people are beside cameras. Also … F beside a cactus, D beside some flowers, and M beside a catapult. That accounts for everyone in R1 to R6." | ✅ |
| The Zoo | 五栖息区容量限制哪些人可同区 | 解答第 1/2 步："No Habitat is empty … So only M+K and V+the murderer are together, the other Zookeepers must be alone in a Habitat" | ✅ |

上一轮报告的核心判断——**难度来自中间结论的依赖与覆盖范围，不是把坐标改成隐晦说法**——在九案上成立。

### 1.2 需要补正/限定的五点

**(1) 语言复杂度确实随难度上升，但它是"结构载体"而非"隐晦化"。**
上一轮"不是把坐标改成隐晦说法"容易被读成"高阶题用词同样朴素"。数据不支持这个强读法：

| 难度 | 非受害者卡数 | 平均词数 | 复合卡占比 | `exactly` | 数字词 | 匿名类别 | 方位词 | 析取 either/or |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Very Easy | 42 | 6.1 | 7% (3/42) | 0/51 | 1/51 | 3/51 | 3/51 | 1/51 |
| Easy | 140 | 6.4 | 9% (13/140) | 3/161 | 6/161 | 10/161 | 9/161 | 2/161 |
| Medium | 135 | 6.8 | 12% (16/135) | 6/152 | 12/152 | 20/152 | 16/152 | 4/152 |
| Hard | 166 | 7.3 | 14% (23/166) | 11/185 | 15/185 | 24/185 | 26/185 | 6/185 |
| Expert | 101 | 8.9 | 41% (41/101) | 6/108 | 16/108 | 12/108 | 18/108 | 9/108 |

但同时，**`beside` / 家具词 / 区域名的占比在各档几乎恒定**（`beside` 约 25–31%，家具约 42–49%）。也就是说：难度上升的不是"把家具说得更绕"，而是**逻辑类型**从"单点属性"升级为"匿名端点、精确量词、析取、区域状态、全局容量"。措辞始终直白（`exactly one row north of Damien` 精确而非隐晦）。因此原结论成立，但应表述为：

> 难度来自**约束的逻辑类型与中间结论的覆盖范围**；语言复杂度是这些结构的必要载体，不是靠生僻坐标或模糊措辞制造。

**(2) 官方解答链长与"集合级结论"占比同步上升，直接支持"依赖深度"判断。**
32 关带官方 `player_hint_*_en` 步骤，按难度统计：

| 难度 | 有提示关数 | 提示段数 | 平均段数 | 单点隔离 `This isolates` | 成组封锁 `Block the rest of` | 未识别人 | 区域状态 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Very Easy | 3 | 11 | **3.7** | 8/11 | 1/11 | 0/11 | 1/11 |
| Easy | 14 | 66 | **4.7** | 48/66 | 5/66 | 6/66 | 15/66 |
| Medium | 8 | 50 | **6.2** | 36/50 | **13/50** | 6/50 | 9/50 |
| Hard | 5 | 38 | **7.6** | 25/38 | 8/38 | **11/38** | 15/38 |
| Expert | 2 | 22 | **11.0** | 13/22 | 3/22 | 6/22 | 10/22 |

Easy→Medium 最显著的变化是**成组封锁从 8% 升到 26%**、"单点隔离"从 73% 降到 72%（基本不变）；Hard 起"未识别人"显著增加。这与上一轮"中间结论先传播、后落位"的判断一致。

**(3) 棋盘规模是混杂变量，不能把难度纯归因于依赖深度。**

| 难度 | 规模分布（73 关） |
|---|---|
| Very Easy | 6×6 ×6、5×5 ×3 |
| Easy | 9×9 ×8、7×7 ×7、6×6 ×4、12×12 ×1、5×5 ×1 |
| Medium | 9×9 ×11、8×8 ×4、12×12 ×1、10×10 ×1 |
| Hard | 9×9 ×9、10×10 ×3、12×12 ×2、9×10 ×2、11×9/11×11/12×14 各 1 |
| Expert | 16×16 ×6、12×12 ×1 |

前端生成器还有 `{"very easy":4, easy:6, medium:10, hard:12, expert:16}` 的规模映射。链长 3.7→11.0 与格数同步增长，**不能**据此断言"同一机制搬到 6×6 仍属 Medium"——上一轮已提示此点，本轮给出量化依据。

**(4) 官方明确否定谎言与猜测，上一轮的"规则分离"结论应加强。**
前端内置 FAQ 原文：

- `Are the clues always true?` → **"Yes. There are no tricks."**
- `Do I ever have to guess?` → **"No. Every puzzle can be solved by deduction alone."**
- `Is there always exactly one solution?` → "Only one solution is valid, but there can be multiple paths to reach it."
- Rules：`Exactly one person per row and per column.` / `"Beside" means directly adjacent (up, down, left, or right) AND in the same area.` / `The murderer was alone with the victim (in the same area).`

全量语料检索：657 条线索 + 全部通用线索中，`lie / liar / lying / false / truth / true / honest` **零命中**；73 关的凶手识别一律靠"受害者与凶手同区独处"，不靠说谎。因此：

> 上一轮"不能将原站当作摘卡真假机制的证据"不仅成立，应升级为：**官网规则与该机制直接冲突**。
> 本地的谎言规则是独立的本地扩展；v11 第 4 关"必须一次试位"也与官网"无需猜测"相悖，是本轮优化的直接依据。

**(5) 三处状态修正。**

- `Solitary Confinement`：公开目录确已下架（`leavingAt=2026-02-06`），但 `puzzle-solitary-confinement-expert.json` 仍在服务器且可完整读取（16 条线索 + 通用线索）。上一轮"未作为案例"仍成立，但"无法取得"已不成立。
- `The Art School`：同样已轮转下架（`leavingAt=2026-06-18`），JSON 完整可用。
- 难度标签不一致不止两处：`Car Repair` 目录 Very Easy / PDF 页内 `difficulty: easy`；`The Art School` 目录 Medium / PDF 题目 medium、**解答页 easy**；新增发现 **`The Library` 目录 Medium，关卡内 `title_en_ = "The Library (Hard)"`**。

### 1.3 官方三条进阶技巧与上一轮工作流的对应

前端 `advanced.techniques` 给出三条明确技巧，与 2754b54 报告第 5/7/8 步高度对应，可作为工作流正当性背书：

| 官方技巧 | 原文要点 | 对应上一轮工作流 |
|---|---|---|
| `scan` | "If you see any row or column with exactly one available square, someone must be there, **even if you don't know who it is yet**" | 第 4 步"指定中间结论（未识别人先占空间）" |
| `overload` | "If you know that two people are in two rows or columns, **even without knowing who's in which**, this means no one else can be there" | 第 7 步"集合信息先传播 / 成组封锁" |
| `intersect` | "If a person can only occupy two squares, **no one else can occupy the other two corners of the rectangle** they form" | 第 8 步"寻找替代解占用格并封堵" |

同时官方 FAQ `Do I ever have to guess? No.` 支持上一轮"必要猜测是可选工具、不是铁律"的修正。

---

## 2. 网站关卡线索的语言设计

### 2.1 人称与视角：卡片归属隐含自指

| 句首模式 | 条数 | 占 657 条 |
|---|---:|---:|
| `He was …` | 281 | 42.8% |
| `She was …` | 241 | 36.7% |
| `The Victim. He/She was alone with the murderer.` | 73 | 11.1% |
| 其他（`Jockey.` / `There was …` / `Exactly …` / `Everyone …` 等） | 62 | 9.4% |
| **第一人称 `I …`** | **0** | **0%** |

关键机制：**线索用第三人称过去时，但描述的是持卡人自己**。姓名与头像印在卡上，句子里不写自己的名字——自指由"卡片归属"承载，不由代词承载。指称**他人**时才出现实名（`one row north of Damien`、`with Elyse in the Living Room`、`ahead of Blake`）或匿名类别（`a woman alone in the Gallery`、`a man on the bed in her room`、`someone else beside a shelf`）。

这个设计有两个好处：①所有卡句式统一，阅读负担低；②实名/匿名切换可以精确控制"关系端点是否已识别"，正是难度旋钮。

### 2.2 句法模板库（按实测频次）

| 模板 | 实例 | 频次特征 |
|---|---|---|
| `He/She was + 介词短语` | `He was in a car.` / `She was on a carpet.` / `He was beside a shelf.` / `He was at the Judge's Bench.` | 最高频；`beside` 全档稳定 25–31% |
| `He/She was the only person …` | `She was the only person sitting in a chair.` / `He was the only man to occupy a golf tee.` | Medium+ 增多（Very Easy 3/51 → Hard 11/185） |
| `He/She was alone / alone with X / with X in R` | `He was alone.` / `She was alone with Mara.` / `He was with Elyse in the Living Room.` | `alone` 全档常见（含受害者卡） |
| `There was + 匿名类别 + 地点` | `There was a woman alone in the Gallery one row north of her.` / `There was a man on the bed in her room.` / `Someone else was beside a shelf in her area.` | Easy 10/161 → Hard 24/185 |
| `There was + 全局计数`（通用线索） | `There was exactly one person on a chair.` / `No area contained exactly one person.` / `Odd-numbered holes have an odd number of occupants.` | 只在 Medium+ 通用线索出现 |
| `否定` | `He was not beside any box.` / `She was not sitting.` / `He did not occupy the hole immediately before Naomi's hole.` | Very Easy 3/51 → Hard 18/185 |
| `析取` | `She was in the Bedroom or in the Sunroom.` / `She occupied the golf tee on either the Hole 6, 7 or 8.` | Expert 9/108 最高 |
| `方位关系（无精确量）` | `He was north of Vlimbo.` / `She was east of Antonio` / `She was northwest of Flor, and in the same hole.` | Hard/Expert 显著增多 |
| `精确方位（带量词）` | `exactly one row north of Gemma` / `six rows south of Joseph, who was on the same island` / `directly south of it` | Medium+；必须带 `exactly` 或 `directly` |
| `绝对行列` | `She was in the bottom row.` / `She was in the fifth column.` / `He was in the northmost row and beside a tree.` | Easy 起少量出现 |
| `固定收口卡` | `The Victim. He was alone with the murderer.` | **73/73，逐字一致** |

### 2.3 语义契约：官方术语表（前端 `Spatial keyword definitions`）

这一节是官网最容易被低估的语言设计——**每个空间词都有唯一释义，且做成鼠标悬停提示**：

| 词 | 官方释义 | 设计含义 |
|---|---|---|
| `beside / next to / adjacent / neighbor / touching` | to the left, right, up, or down of something, **in the same area** | 五个词同义，避免同义词制造歧义 |
| `in front / in front of` | the two squares directly connected to a door or window | 门是几何资源 |
| `with / together` | in the same area as someone | 同区，不要求相邻 |
| `alone` | no one else was in this person's area | 区域状态，不是"没有邻居" |
| `alone with` | in the same area as someone. **No one else was in that area.** | 区域恰好两人 |
| `north / south / east / west / above / below / left / right` | **any square** in that direction, **in any area** | 只比轴，不要求同行同列、不要求同区 |
| `directly` | in a straight line (same row or column) with no obstructions | 加 `directly` 才收紧到同行列 |
| `diagonal` | at a 45-degree angle (not sharing a row or column) | —— |
| `corner / edge / border` | 两墙交点 / 沿墙 / 沿外边界 | 环境参与几何 |
| `same room / different room` | 同一封闭区域 / 不同封闭区域 | —— |

**难度杠杆非常清晰**：`north of X`（宽）与 `exactly one row north of X`（窄）差一个量词；`beside`（同区四邻）与 `directly south of it`（同行列）差一个副词。官网用**词汇精度**而非谜面长度控制候选集大小。

### 2.4 难度—语言梯度（可直接用于本地选题）

| 档 | 允许句式 | 禁用/限用 | 词数 | 复合卡 |
|---|---|---|---:|---:|
| Very Easy | 家具、区域、单一 `beside`、单一方向词 | 无否定、无 `only`、无匿名类别、无数字 | ~6 | ≤7% |
| Easy | 加 `alone`、`只有…`、`或`、绝对行列、实名方向 | 无精确量词距离、无全局计数 | ~6.4 | ≤9% |
| **Easy↔Medium（本轮目标带）** | **加 1 处集合级中间结论（同室/两来源交集）、最多 1 条否定** | **禁 `exactly N 行/列`、禁匿名类别、禁全局容量/奇偶、禁反证** | **≤7** | **≤1/6 张** |
| Medium | `exactly one row north of`、匿名类别、成组封锁、区域状态 | —— | ~6.8 | 12% |
| Hard | 多复合卡、未识别人、空/满区域、析取 | —— | ~7.3 | 14% |
| Expert | 全局计数/奇偶/容量、类别资格规则、多重复合 | —— | ~8.9 | 41% |

### 2.5 官网**没有**的语言

- **谎言语言零命中**：657 条线索 + 全部通用线索，无 `lie/liar/false/true`；没有任何"某人可能说谎"的提示。
- **无第一人称**：0 条 `I …`；无"我"式自述。
- **无坐标直呼**：不写 `(R3, C4)` 之类，坐标只出现在**解答/提示**里，不出现在题面。
- **无精确数字距离滥用**：`比…靠下 1 行` 这种写法在官网对应 `exactly one row north of`，只出现在 Medium+；Easy/Very Easy 数字词命中率仅 1/51、6/161。

### 2.6 对本地卡面的语言建议（含一处必须标注的口径冲突）

1. **把人称契约从"显示层"下沉到"数据层"**。复核后发现 v11 的契约本身是自洽的：**自指用「我」、指他人用字母 + 第三人称**（`我在B上方、C左方` / `A在植物旁边` / `我与A在同一房间` / `D在我上方`），且全关不出现「他/她」——这一点与官网"第三人称 + 卡片归属隐含自指"是等价的本地化，不需要推翻。真正的问题是：该契约**只写在 `display_cards`**，`cards` 谓词数据一律用字母，改写卡面时必须按卡序重新推导「我」指谁，容易漂移（历史上 v3→v11 多次调整卡归属即属此类风险）。本轮 v12 在数据结构中为每条子句显式标注 `speaker` 与 `self_ref`，卡面由数据生成。
   另外：本地第 1、2 关用**角色名**（"收藏家在第五列"），第 3、4 关用**字母**（"A在植物旁边"），属两套题面风格；若日后统一，须连同 UI 卡片标题一起改，本轮不改。
2. **⚠️ 口径冲突必须写明**：本地两份规范互相打架——
   《关卡设计-当前口径-两关.md》（2026-10-29 快照）第 87–89 行写引擎的 `left_of/right_of/above/below` 是"同行/同列"判定，因 `one_per_row+one_per_col` 而**恒假**、只能用作故意假话；
   但《当前两关运行规则_内部.md》（2026-11-05 起为"唯一规范入口"）第 12 行明确"第二关线索 d 中的『上方』只比较行号，不要求同列"。
   官网术语表同样是"任意该方向格、不要求同行同列"。v11 与本轮 v12 的谓词都按**只比轴**计算。
   **两套语义不能混用**：按现行规范以"只比轴"为准，接入引擎时须确认实现与之一致，不要拿旧快照的"恒假"去解释第 3、4 关。
3. **Easy↔Medium 卡面禁用精确数字距离**（`比…靠下N行/列`），改用纯方向 + 同室 + 家具交集导出位置——这正是 v11 第三关已经做过、第四关还没做的改造。
4. **谎言不写进卡面**：靠"全真无解"这一几何事实让玩家察觉（本地第 2 关教程已用 `b/d/e 不能同真`），而不是在卡上标注真假。
5. **量词即难度**：若日后要升到 Medium，优先加 `exactly` / `directly`，而不是加长句子或堆家具。

---

## 3. 进一步总结：升级版设计方案

### 3.1 难度带的可验收闸门（本地 6×6，Easy↔Medium）

| 维度 | 闸门 | 依据 |
|---|---|---|
| 规模 / 家具 | 6×6、6 人、4 区；家具 5–7 格 | 官网 Very Easy/Easy 规模与本地前两关惯例 |
| 卡面复杂度 | 每卡 1 句，**至多 1 张复合卡（2 子句）**；V 卡恒 1 句 | 官网 Easy 9% / Medium 12% 复合卡 |
| 词汇预算 | 0 精确数字距离、≤1 否定、0 全局计数/奇偶/容量、0 匿名类别、0 `only`（或最多 1） | §2.4 梯度 |
| 单卡强度 | 任一卡单独作用后，每个人仍有 ≥2 个可能格 | 官网"线索不直接定位"与依赖关系 |
| 推理结构 | 1–2 个中间结论；**至少 1 处两来源交集**；解答链 3–5 步 | §1.2 链长 3.7→4.7→6.2 |
| 猜测深度 | **广义弧一致传播深度 = 0**（无需试位）；身份分支 ≤3 | 官方 FAQ "No. Every puzzle can be solved by deduction alone." |
| 非冗余 | 删除任一真卡，最终有效解空间必须变宽 | 2754b54 工作流第 10 步 |
| 四层验收 | 规则合法性 / 有限可复核推理可达 / 完整摆位唯一 / 盗窃者身份唯一 | 2754b54 工作流第 11 步 |
| 同步交付 | 谓词数据、卡面、设计图、说明、验证结果同版；不预告真假 | 2754b54 工作流第 12 步 |

### 3.2 谎言要素专项准则（本地扩展，官网无先例）

| 编号 | 准则 | 可验收判据 |
|---|---|---|
| L1 | 真假是**推导结果**，不是题面告知 | `announce=unknown`；不预告全真或有假话 |
| L2 | "必有假话"或"六卡全真"必须有可察信号 | 有谎关：六卡同真的摆法数 = 0；无谎关：六卡同真的摆法数 > 0，且区域规则随后收口 |
| L3 | 假卡必须是**简单正向断言**，单独看不荒谬 | 单句、复杂度 1、与 ≥4 张真卡各自可共存；禁用结构性恒假（如"与某人同行"） |
| L4 | 假卡应被**其余真卡联合否证**，而非靠穷举到最后 | `AND(五张真卡) & 假卡 = 0`；且 `AND(五张真卡) & ¬假卡 ≠ 0` |
| L5 | 摘卡真假必须**全身份重算** | 假定身份 h → 排除其卡 → 统计本人不同格数：0 不成立 / 1 必须假 / ≥2 必须真；家具移动会改变该格数 |
| L6 | 不让"假"藏在复合卡里 | 假卡恒 1 句；复合卡按合取判真，整卡假只需一项假，会显著降低可察性 |

L2–L4 构成本轮"谎言要素额外考量"的核心：**用"全真不可能"把谎言做成一条可以正向推理出来的中间结论**，而不是身份枚举的副产品。

### 3.3 工作流升级（相对 2754b54 的 12 步）

- **新增步骤 0（前置）**：先定难度带与词汇预算（§3.1），再冻结房间/门/答案/身份。
- **改写步骤 3**：按 §2.2 模板库分配句式，**同一关尽量不重复模板**；自指/他指人称契约统一。
- **强化步骤 8–9**：家具改动后，除重算唯一解外，必须重算 `alltrue`、摘卡本人格数与 L2–L4 三条谎言闸门。
- **新增步骤 13（语言闸门）**：扫描精确数字距离、第一/第三人称混用、方向词语义冲突（§2.6-2）、同义模板重复。
- **新增步骤 14（猜测闸门）**：GAC 深度必须为 0；若需试位，写明具体矛盾见证并判定是否超出目标难度带。
- 保留原步骤 5（依赖图）、7（环境优先）、10（删除试验）、11（四层验收）、12（同步交付）。

### 3.4 对 v11 两关的诊断（为什么还要再优化）

| 项 | 第 3 关 v11 | 第 4 关 v11 | 目标带要求 |
|---|---|---|---|
| 最终真假 | 六卡全真（推导结果） | 仅 E 卡假（推导结果） | 两关形成"无谎 / 有谎"对照，保留 |
| 假卡文案 | —— | `B比D靠下1行`（**精确数字距离**） | 禁；改纯方向断言 |
| GAC 试位深度 | 0 ✅ | **1（需一次试位）** | 0 |
| 身份分支（非空候选） | 3（A/B/C） | 2（A=6 盘 3 格 / E=1 盘） | ≤3，越少越好 |
| 家具格数 | 7 | 6 | 可精简 |
| 复合卡 | A 卡 2 子句 | A 卡 2 子句 | ≤1 张，保留 |
| 卡面人称契约 | 已自洽，但只落在显示层 | 同左 | 下沉到数据层（`speaker`/`self_ref`） |
| 谎言可察性 | `alltrue=2`（全真可能，可推出无谎）✅ | `alltrue=0`（全真不可能）✅ | 两关均已达 L2 |

结论：**第 3 关结构已基本达标，优化重心是人称契约下沉到数据层、降低身份分支与精简家具负载；第 4 关需要做实质改造**——换掉数字距离假卡、把试位深度降到 0、减少 A 假设的候选盘数，同时保持房间划分、人物分布与盗窃者 E 不变。

---

## 4. 参考来源（本轮新增/复核）

- 在线目录与规则：`https://www.murdoku.com/play/`、`/play/assets/app-core-BEfE3huk.js`（HowToPlay / Rules / FAQ / Spatial Glossary / Advanced Techniques）
- 关卡目录：`https://www.murdoku.com/play_puzzles/_puzzleCatalog.json`（74 关）
- 关卡数据：`https://www.murdoku.com/play_puzzles/en/{id}.json`（73 关有效）
- 可打印目录：`https://www.murdoku.com/print?lang=en`
- 15 份官方题目/解答 PDF：`car-repair`、`netflix-and-kill`、`a-walk-in-the-park`、`the-courtroom`、`the-backyard-garden`、`the-art-school`、`preppers`、`holiday-shopping`、`the-botanical-garden`、`the-golf-course`、`the-zoo`、`the-mystery-islands`、`the-horse-track`、`sleeping-with-the-fishes`、`the-movie-studio`
- 本地规范：`murdoku-project/当前两关运行规则_内部.md`、`关卡设计-当前口径-两关.md`、`第三四关内容设计/design_selected_v11.json`、`两关几何关联复核_v11.md`
- 上一轮成果：提交 `2754b545ce20`（《Murdoku线索设计-研究报告》与 v11 全套验证）

> 本轮调研与 v12 优化为**离线内容设计**：未导入游戏存档、未改运行代码与规则、未做实机渲染或玩家试玩。
> 枚举唯一不等于人类解法优美；GAC 深度只针对声明的传播操作集，不是所有解法的绝对下界。
