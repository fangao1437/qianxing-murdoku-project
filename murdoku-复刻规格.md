# Murdoku（https://murdoku.com/play/）玩法规则 + 页面框架 复刻规格

> 调研方式：抓到的是 Vite 生产包（压缩/混淆后的 JS）+ 完整 CSS + 真实关卡 JSON + 目录 JSON。
> 标签约定：**[实证]** = 我直接从抓到的代码/数据里读到的（附出处）；**[文章]** = 来自网络评测/介绍文章；**[推断]** = 我的推理，未被代码直接证实。
> 重要说明：本次运行的 shell（pwsh）在此环境完全无法启动（`STATUS_DLL_INIT_FAILED`，exit 3221225794），因此所有资源是通过 `web_fetch` + `https://www.w3.org/services/html2txt?url=...` 文本代理抓取的。该代理会把 JS 里 `<` 与 `>` 之间的文本当成 HTML 标签吃掉，所以部分代码片段（主要是比较运算附近）不可读；凡不可读处我都标注了。JS 文件本身（`application/javascript`）无法被 `web_fetch` 直接读取，这是本报告的主要取证限制。

---

## 结论摘要

1. **规格不是固定的 5×5 或 6×6**：棋盘是 **N×N 正方形**，N = 角色总数（含 1 名受害者），代码校验允许 `3 ≤ N ≤ 24`（parse 时 `grid<3||grid>24` 抛错），线上目录出现过的尺寸为 **5×5、6×6、7×7、8×8、9×9、10×10、12×12、16×16**，且每关 `suspects == gridSize`。**[实证]** [catalog + puzzle-core]
2. **核心规则**：每行、每列恰好 1 个角色（含受害者）；角色只能放在「可占据格」（empty/chair/bed/carpet/sand/horse/car 等）上，桌子/电视/架子/树/植物/花等不可站人；**凶手 = 与受害者同处一室、且该房间内只有这两人**。**[实证]**
3. **「墙」不是障碍物而是房间边界**：每格有一个 `room_code`，相邻格 `room_code` 不同（或处于棋盘外边界）处画**粗线墙**（`--wall-thick`），同房间内部是**细网格线**（`--wall-thin`）。房间=被墙围出的连通区域，有名字、颜色、地板材质、名称标签位置。**[实证]**（数据字段 + CSS + glossary 文案）
4. **线索是手写自然语言文本**，不存在"类型化线索对象"：个人线索存在 `CHARACTERS.char_quote_{lang}_{n}` + `char_subquote_{lang}_{n}`；全局线索存在 `clue_1..clue_10`（数字代码，映射 11 条固定文案）或 `clue_custom_text1..3` / `general_clue_N`。游戏本体**不生成**线索文案，只用多语言**关键词表**做高亮/提示；只有 Arcade 生成器会按"线索原子(atom)类型"生成英文句子。**[实证]**
5. **交互骨架 = 选中头像 → 长按格子放置（大字母）；轻点只写铅笔笔记；X 标记不可能；橡皮擦；撤销/重做；计时器；提交判题；提示/解答视频；打印。** 长按是核心（教程原文：*"PRESS AND HOLD a square - keep your finger down until the big letter appears"*）。**[实证]**
6. **数据全部是静态 JSON，无需鉴权**：`/play_puzzles/_puzzleCatalog.json`（目录）、`/play_puzzles/en/{id}.json`（关卡）、`/play_puzzles/{lang}/{id}-{lang}.json`（翻译补丁）。**[实证]** 另有 Firebase + Cloud Functions 用于账号/进度/购买/排行榜/判题。
7. `/play/` 首页**是关卡列表页**（副标题 "Select a puzzle to play"），`/play/{puzzleId}` 才是对局页。**[实证]**

---

## 棋盘与墙

### 尺寸与坐标 [实证]

* `PROPERTIES.grid_w` / `grid_h`：网格列数/行数（字符串数字）。合法范围 **3..24**；`grid_w===grid_h` 在线上全部样本中成立（正方形）。**[实证]**
* `PROPERTIES.cellsize`：每格像素边长（样本为 `150`）。
* `PROPERTIES.grid_rx` / `grid_ry`：网格原点（场景图上的像素坐标）。
* 像素→格：`col = trunc((letter_xpos - grid_rx)/cellsize)`，`row = trunc((letter_ypos - grid_ry)/cellsize)`，并 clamp 到 `[0, N-1]`。**[实证]**（`An()` 函数）
* 例：The Courtroom，`grid_rx=1820, grid_ry=920, cellsize=150`；角色 Arthur 的 `letter_xpos_0=2336, letter_ypos_0=1142` → `col=3, row=1` → **R2C4**，与该关官方提示文本 "A is in the Judge's Bench in R2 … (A) down to R2 C4" 完全吻合。**[实证]**
* 场景本身不是"格子背景"，而是：背景图/主题（`PROPERTIES.background_no`、`background_path`、`grid_theme`、`grid_objets_theme`）+ 每个房间的底色与纹理 + 逐格家具 + 房间名标签。渲染时以格坐标系叠加。

### 墙与房间 [实证 + 推断]

* 数据：`GRID.room_code_{a}_{b}` = 该格所属房间 id（0..n）。房间元数据：`room_name_{id}`、`room_name_xpos_{id}`/`room_name_ypos_{id}`、`room_color_0_{id}`/`room_color_1_{id}`（整数色，见下）、`room_color_sat_*`、`room_floortex_{id}`、`floor_type_{id}`、`room_class_medieval_{id}`。**[实证]**
* `GRID.room_subroom_{id}` / `room_subroom_mainroom_{id}`：**子区域**（例如一条船占多格）通过 `wallRoomIdByIndex` 映射回主房间，使子区域与主房间共享墙体轮廓。**[实证]**（`jn()` 返回 `roomIdByIndex` 与 `wallRoomIdByIndex`）
* 墙的生成：**[推断]** 相邻两格 `room_code` 不同 → 该边画粗墙；棋盘外边界也画粗墙（glossary 原文：*"wall: Any thick black border, including the outer grid border."*）。同房间内部为细线。
  * 支撑实证：CSS 同时定义 `--wall-thin` 与 `--wall-thick`（打印态 `#000` vs `rgba(0,0,0,.3)` vs `rgba(0,0,0,.9)`）；`mrd-roomwall` 类 + `--wall-thickness` 选项（`mrd_wall_thickness`，默认 5，范围 2..10）；`highlightRoomWalls` 选项（悬停房间时墙变蓝）。
* 渲染层级（z-index 常量，`app-core`）：`CELL_BASE:0, CARPET:1, HIGHLIGHT:3, WALLS:4, OBJECT:6, NOTE:7, BIG_LETTER:8, HOVER:10, HOLD_RING:50`。**[实证]** → 地板→地毯→高亮→**墙**→家具→**笔记小字**→**放置大字母**→悬停→长按进度环。
* **角(corner) 的官方定义**：`"corner: Where two walls of a room meet."` / `"A cell at the intersection of two walls"`（≥2 条粗边）。`edge` = 沿墙的格，`border` = 沿棋盘外框的格。**[实证]**
* `GRID.corner_objects_{y}_{x}`：摆在格点（四格交点）上的装饰物（如雕像、盆栽），`kn()` 会按 `(h_i+_ )` 转成 `cornerObjByIndex`（大小 `(w+1)*(h+1)`）。**[实证]**
* `GRID.room_windows_h_{i}_{j}` / `room_windows_v_{i}_{j}`：格边上的**门/窗**（横边 `h` 尺寸 `(w)×(h+1)`，竖边 `v` 尺寸 `(w+1)×(h)`）。语义：`"in front of: The two squares connected to a door or window."` **[实证]**

### 每格能放什么（对象系统）[实证]

* `GRID.room_objects_{a}_{b}` = 家具对象 id（0..151，见 `OBJECT` 表），`room_objects_frame_{a}_{b}` = 叠在该格上的"框"层对象。
* `GRID.carpet_objects_{a}_{b}`（值 5 表示该格是地毯）+ `carpet_objects_frame_{a}_{b}`。
* `GRID.corner_objects_{y}_{x}`：格点装饰。
* `GRID.ship_objects_{a}_{b}`：多格船（73 Sloop 2×1、74 Frigate 3×2、111 Galleon 4×3，`In` 常量表）。**[实证]**
* 颜色：`OBJECT.obj_color_0_{objId}`（主色）/ `obj_color_1_{objId}`（叠色），整数编码为 **0x00BBGGRR**（`Rt()` 取低字节当红）。**[实证]**
* **可占据性由对象表决定**：`OBJECT` 表每项形如 `{id, name, occupiable, file}`，其中 `occupiable: id===-1 ? null : !!flag`。**[实证]**
  * `flag=1`（可站人）：Chair(2)、Carpet(5)、Bed(6/7/119/120)、Horse(15)、Car(21/22)、Sand(24)、Rowboat(25)、House(27)、Puddle(34)、Camel(40)、Cat(50)、Bus(56)、Flag/"hole"(58)、Mammoth(59)、Bow(61)、Fish(62)、Berries(63)、Wolf(64)、Tool(65)、Golf Cart(71)、Sloop(73)、Frigate(74)、Boat(76)、Sloop(77)、Tee(78)、Carriage(90)、Ox(91)、Monkey(96)、Anubis/Ra Symbol(108/109)、Brig(110)、Galleon(111/112/113)、Hammock(129/130)、Drum Set? (145=0)、Portable Toilet(147)、Black Cat(151)…
  * `flag=0`（不可站人）：Plant(1)、TV(3)、Table(4)、Crate(9)、Tree(10/11/69/99/100)、Fire(12)、Shelf(13)、Trashcan(14)、Cactus(16)、Cow(17)、Painting(19)、Statue(20/105/114)、Rubble(23)、Shark(26)、Register(28/94/141)、Present(29-31)、Barrel(32/133)、Boar(35)、Weapons(36)、Shrub(37)、Jar(38)、Catapult(39)、Pumpkin(41)、Box(42)、Boulder(43/75)、Bonsai(44)、Locker(45)、Punching Bag(46)、Lion(47)、Pig(48)、Gas Pump(49)、Grain(51)、Crocodile(52)、Bear(53)、Elephant(54)、Penguin(55)、Cone(57)、Basket(60)、Stump(66)、Bones(67)、Sabertooth(68)、Shell(70)、Water(72)、Lily Pad(79/104)、Flowers(80)、Easel(81)、Camera(82)、Safe(83/92)、Buffalo(84)、Tombstone(85)、Piano(86)、Hay(87)、Coal(88)、Sack(89)、Dynamite(93)、Treasure(95)、Gold Vein(97)、Mining Cart(98)、Obelisk(101)、Column(102/131)、Block(103)、Sarcophagus(106/107)、Weapons Rack(115)、Sphinx(116)、Chest(117/118/132)、Papyrus(121)、Rope(123)、Cannon(125-128)、Time Machine(134)、Teddy Bear(135)、Something(136)、Oil Slick(138)、Paint Spill(139)、Pyro Fire(146)、Speaker(148)、Sign(149)、Lamppost(150)
  * `flag=-1`（无实体，不算家具）：Window(0)、Void(8)、Door(18)、Void show Back(33)
  * `Path(140)` 是 `occupiable=1`、无 svg（`c(140,"Path",1)` 无 file）。
* `OBJECT` 表还带 `file`（如 `obj_chair.svg`），全部资源在 `/play/assets/obj_*.svg`。**[实证]**
* 多格大件（床/车/船/桌子）：官方 FAQ 明确 **"They cover many squares, but a person only occupies one of these squares."** **[实证]**
* 水可站人：FAQ *"Can water be occupied? — Yes, any area can be occupied, unless stated otherwise."* 但通用线索 6 是 "Nobody was in the water."。**[实证]**

---

## 规则（含受害者/凶手）

### 硬规则 [实证]

1. **每行每列恰好一人**（含受害者）。`howToPlay.rules.onePerRowCol: "One person per row and per column."`；教程页 *"Each row and each column can hold only ONE character. When you place someone, X's automatically fill their row and column."*
2. **只能放在可占据格**：`howToPlay.rules.occupiable: "Suspects can only be placed on occupiable cells (not on tables, trees, etc.)"`。
3. **"beside" 的定义**：*"directly adjacent (up, down, left, or right) AND in the same area."*（同一房间内四邻，不含对角）。
4. **凶手 = 与受害者同房间且房间内只有这两人**：`howToPlay.goal.description: "…The murderer was alone with the victim (in the same area)."`；结果弹窗文案 `foundMurderer`。
5. **线条无猜测可解**：FAQ *"Do I ever have to guess? — No. Every puzzle can be solved by deduction alone."*；*"Is there always exactly one solution? — Only one solution is valid, but there can be multiple paths to reach it."*
6. 线索**永远为真**（*"Yes. There are no tricks."*）。
7. `"someone"/"person"` **包含受害者**（FAQ）。
8. 头像**纯装饰**，除非线索明确提到外观（眼镜、帽子）——*"character portraits are purely cosmetic"*。
9. 「beside a shelf」可以对应多个架子，除非写"exactly one shelf"。
10. 「beside a chair」的人**也可以坐在椅子上**（FAQ）。

### 受害者与凶手怎么记录 [实证]

* `PROPERTIES.murderer` = **凶手角色的索引**（字符串数字，样本 `"5.000000"` = 第 6 个角色 Fritz，与该关提示 *"Fritz is the murderer!"* 一致）。
* **受害者没有独立字段**：前端在结算时取 `suspects` 中 `symbol === "V"` 的角色，否则取**最后一个角色**（`M.V ?? e[e.length-1]`）；凶手的兜底链是 `idx===murderer` → `symbol==="X"` → 第一个非受害者。**[实证，GameScreen `g4()` 内 `_()`]**
  * The Courtroom：最后一个角色 idx8 名字 Vanessa，其 quote 为 *"The Victim. She was alone with the murderer."*，位置 R3C9 与凶手 Fritz 的 R5C8 同属 room_code=6（Prosecution），且该房间仅此二人 → 满足"单独同室"。**这条规则我用真实数据端到端验证过。** **[实证]**
* 角色符号（放上棋盘显示的字母）= 角色名首字母大写（`symbol: name[0].toUpperCase()`）。**[实证]**
* 结算逐角色比对 `placedAt` 与 `solutionByIdMap`：全对 → `foundMurderer` 文案（代入凶手名/符号、受害者名/符号）；否则 → `notFoundEveryone`：*"You did not find everyone's position! {correctCount} of {totalCount} correct. The murderer escaped!"*。**[实证]**
* 提交前的**提前校验钩子**（用于整行/整列冲突提示与 Arcade 自动提交）：若已"锁定"的两个字母冲突（同行/同列重复）则不自动作答。**[实证，GameScreen `f4()` 的 `E`/`D`/`O` 逻辑片段]**

### 一局有几个嫌疑人/线索 [实证]

* 嫌疑人数 = `grid_w`（N），其中 **1 个是受害者**，所以"可自由摆放的角色" = N 个（受害者也要摆），凶手是其中之一。
  * 例：The Courtroom 9×9 / 9 个角色；Fireside Beach 5×5 / 5 个。
* 线索条数**不固定**：每个角色 1 条个人线索（`char_quote_*`，可带 `char_subquote_*` 第二行）；另有 **0..3 条自定义全局线索**（`clue_custom_text1..3`）或 **最多 10 条数字代码全局线索**（`clue_1..clue_10`）。实测 The Courtroom 的 `clue_0/clue_1 = 0`（即没有数字代码全局线索）。**[实证]**

---

## 线索类型全表

线索文本是**人写的自然语言**；下表把「游戏引擎承认的语义类别」与「生成器使用的英文模板」列全。出处列标明来源。

### A. 案例级（general）数字代码线索 [实证：`puzzle-core` 内 `hn` 常量表]

键名 `clue_0`…`clue_10`（正则 `/^clue_(\d+)$/`，按 slot 排序）；值 0 表示"无"。

| 代码 | 语义 | 英文文案模板（原文） |
|---|---|---|
| 0 | 无 | `""` |
| 1 | 没有空房间 | `There was no empty room.` |
| 2 | 恰好 1 个空房间 | `There was exactly one empty room.` |
| 3 | 恰好 1 人坐在椅子上 | `There was exactly one person on a chair.` |
| 4 | 恰好 1 人在床上 | `There was exactly one person on a bed.` |
| 5 | 有 1 个或多个空房间 | `There was one or many empty room(s).` |
| 6 | 没人在水里 | `Nobody was in the water.` |
| 7 | 恰好 1 人在地毯上 | `There was exactly one person on a carpet.` |
| 8 | 恰好 2 个空房间 | `There were exactly two empty rooms.` |
| 9 | 恰好 2 人坐在椅子上 | `There were exactly two persons on a chair.` |
| 10 | 恰好 3 人坐在椅子上 | `There were exactly three persons on a chair.` |
| 11 | 没有嫌疑人与异性嫌疑人同房 | `No suspect was in a room with another suspect of opposite gender.` |

备用载体：`clue_custom_text1..3`（自定义最多 3 条）、`general_clue_0..9`（旧键）、`GENERAL_CLUES`/`CLUES`/`clues` 数组（元素为字符串或 `{text, subtext}`），按 `PROPERTIES → GRID → CHARACTERS` 顺序查找。**[实证]**

### B. 角色个人线索语义类别（引擎/生成器识别的 atom 类型）[实证：`generator` `Le()` 产出 + `Ee()`/权重表 `yo`]

| atom 类型 | 语义 | 生成器英文短语（原文） |
|---|---|---|
| `room` | 在房间 R 内 | `in the <Room>` / `in a corner of the <Room>`（`ot()`/`At()`） |
| `notRoom` | 不在房间 R | `... not in the <Room>` |
| `orroom` | 在 R1 或 R2 | `in the <R1> or the <R2>` |
| `beside` | 与对象 O 相邻（四邻且同房，不含 carpet/chair/car） | `beside <object>` |
| `notbeside` | 不与 O 相邻 | `not beside <object>` |
| `on` | 站在对象 O 上 | `sitting on a <object>` |
| `onlyon` | 全局唯一 "X 在 O 上" | `was the only person on a <O>` |
| `onlyBeside` | 全局唯一 "有人在 O 旁" | `was the only person beside the <O>` |
| `with` | 与某人同房（可能是受害者） | `was with <name>` |
| `withOnly` | 与"唯一在 O 上/旁的人"同房 | `was in the same area as the person on the <O>` |
| `alone` | 自己房间里没有别人（连受害者也没有） | `was alone` |
| `alonewith` | 与某人独处同房（房间里没有第三人，也没有受害者） | `was alone with <name>` |
| `inCorner` / `cornerRoom` / `cornerGrid` | 在（房间的/棋盘的）角落 | `in a corner of the <Room>` |
| `notCorner` | 不在房间角落 | `not in a corner` |
| `absRow` / `absCol` | 在第 r 行 / 第 c 列（绝对） | `was in the <n>th row from the top` / `in the <n>th column from the left` / `in the top/bottom/middle row` / `in the first/last/middle column` |
| `rowOffset` | 在某人的北/南 n 行 | `was exactly <n> row(s) north/south of <name>` |
| `colOffset` | 在某人的西/东 n 列 | `was exactly <n> column(s) west/east of <name>` |
| `compass` | 在某人的某个对角方向（不共行不共列） | `was northeast of <name>`（`Wt` 表：north/south/west/east/ne/nw/se/sw） |
| `otherbeside` | 房间里"别人"旁边有对象 O（存在性） | `someone else was beside the <O> in his/her room` |
| `genderinroom` | 房间里有男性/女性 | `there was a man/woman in his/her room` |
| `victim` / `victimOpen` | 受害者专用 | `The Victim.`（`victimMode==="open"` 时公开受害者线索） |
| （全局）`oneOnType` | 全盘"恰好一人在 O 上" | `exactly one person was on a <O>` |
| （全局）`noEmptyRoom` | 没有空房间 | `no room was empty – every room holds at least one person` |

各线索的**难度权重**（生成器，可作难度调参参考）**[实证]**：
`easy: {beside:4, room:4, onlyon:3.5, on:3.2, onlybeside:1.6, withonly:1.4, alone:3, with:2.5, alonewith:2.5, genderwith:1.5, inCorner:1.2, corner:1, abs:.7, notCorner:.7, offset:.6, notbeside:.4, compass:.3, notroom:.8, orroom:.2, otherbeside:.15}`
`medium: {beside:4, onlyon:3.5, onlybeside:2, withonly:1.8, on:2.8, alonewith:2.2, room:2, alone:2, with:2, inCorner:1.5, genderwith:1.5, notCorner:1.2, corner:1.2, notbeside:1, abs:.8, offset:.8, compass:.4, notroom:1.2, orroom:.4, otherbeside:.3}`
`hard: {beside:4, onlyon:3, onlybeside:2, withonly:1.8, notbeside:2.2, alonewith:2, notCorner:1.8, on:1.8, genderwith:1.8, alone:1.8, inCorner:1.5, room:1.2, corner:1.2, offset:1, with:1, abs:.8, compass:.5, notroom:1.4, orroom:.6, otherbeside:.5}`

### C. 关键词词典（游戏用来做线索高亮/释义，权威语义定义）[实证：`puzzle-core` 英文 `Go` 表 + `app-core` howToPlay/glossary/faq]

| 关键词 | 语义（官方释义原文） |
|---|---|
| beside / next to / adjacent / neighbor / touching | To the left, right, up, or down of something, in the same area. |
| in front / in front of | The two squares connected to a door or window. |
| with | In the same area as someone. |
| alone with | In the same area as someone. No one else was in that area (not even the victim). |
| together | In the same area as someone. |
| alone | No one else was in this person's area (not even the victim). |
| his/her/their own area(s) | An area with this character's name in its title. |
| empty area(s) | An area where nobody was, not even the victim. |
| wall(s) | Any thick black border(s), including the outer grid border. |
| north/south/west/east + above/below/left/right | Any square above/below/left/right, **in any area**. |
| northwest/northeast/southwest/southeast | Any square above-and-left etc., in any area. |
| area / room | An enclosed section of the grid. |
| same room / different room | Within the same enclosed area / In a separate enclosed area. |
| corner(s) | A cell at the intersection of two walls. |
| edge(s) | A cell along a wall. |
| border | A cell along the outer grid boundary. |
| diagonal(ly) | At a 45-degree angle (not sharing a row or column). |
| row / column / same row / same column | A horizontal/vertical line of cells / sharing the same one. |
| 补充（glossary）| empty area / alone / alone with / beside / corner / diagonal / row / column / west of (a) / east of (a) |

多语言：同一套语义有 26 种语言的词表（`en, es, fr, nl, no, pt, de, it, pl, tr, ru, uk, ca, ko, ja, ro, fi, el, id, ar, vi, cs, hu, bg, zh_hans, zh_hant`），含否定前缀表 `_negationPatterns`（例："not on a / not in the / not sitting on the / not beside the…"）。**[实证]**

### D. 提示/解答 [实证]

* `PROPERTIES.player_hint_1_{lang}` … `player_hint_10_{lang}`：最多 10 条分步提示（实测 The Courtroom 有 6 条英文提示，逐步讲解 A→G→E/D→H→B→C/F/V 的推理）。
* 目录项 `videoId`（或 `video_id_{lang}`）：解答视频（YouTube，`youtube-nocookie` 嵌入）。
* UI：`Hint` 弹窗含 `Reveal a hint` / `Next hint` / `Watch solution video` / `Back to hint` / `No hints available for this puzzle.`

---

## 页面布局（分区描述 + 关键 CSS 类名）

> 说明：`.grid-container / .grid-wrapper / .portrait-name-bar / .clue-box-pop / .grid-note-letter / .grid-big-letter / .mrd-stamp-btn / .mrdPortraitGroup / .print-only` 这些类名我**在 CSS 里实证**（完整 CSS 已抓取）；它们与 DOM 的对应关系是 **[推断]**（JSX 结构因抓取限制不可读），依据是类名语义 + 文案 + 布局常量。

### 路由 [实证]

| 路径 | 内容 |
|---|---|
| `/play`（= `/play/`） | **关卡列表页**（`puzzleSelect.subtitle: "Select a puzzle to play"`） |
| `/play/{puzzleId}` | 对局页（`GameScreen`） |
| `/play/{puzzleId}/{encodedState}` | 带共享棋局的对局页（第二段是 URL 编码的棋盘状态码） |
| `?print` 查询参数 | 打印模式（处理后被 `history.replaceState` 移除） |

`vr()` 取 `pathname` 中 `/play` 之前的部分作为 base（支持子目录部署），`Xt()` 取 `/play` 后第一段作为 puzzleId，`Wo()` 取第二段作为状态码（>3000 字符则丢弃）。

### 对局页分区 [实证 + 推断]

1. **顶部/工具条**（`toolbar` 文案表）：`Tools`、`X Mark`、`Clear`(橡皮擦)、`Undo`、`Submit`（未摆满时提示 `(place all first)`）、`Options`、`How to Play`、`About`、`Print`、`Share`、`Restart`、`Reveal`、`Back to Puzzles`、`Hint`。**[实证：字符串表]**
   * `hold to wipe` / `wipe {seconds}s` / `hold to clear all squares`：橡皮擦**长按 1125 ms** 清空全盘（进度环 + 倒数 `wipe {seconds}s`）。**[实证：`G4()` 中 `Z0=1125, V4=1125`]**
   * 按钮风格：`.mrd-stamp-btn`（4px 硬阴影、hover 上浮 1px、active 下沉 2px 的"印章"按钮）、`.mrd-stamp-sm`（小号，含 `.mrd-stamp-seated` 按下态）。**[实证：CSS]**
2. **左侧面板**：角色/线索区（宽度默认 **340px**，可用 `mrd_left_panel_width` 调整）。含：
   * **嫌疑人头像卡**：容器 `.mrdPortraitGroup` + 子元素 `.mrdPortraitChild`（整组 hover 时子元素 scale(1.02) + 4px 蓝描边 `rgb(99,180,255)`；`.placed` 状态下不再高亮）。卡底有 `.portrait-name-bar`（角色名条，打印态为黑字白底细边框）。**两种排布**：`portraitMode`(=显示为头像网格) 与列表布局（选项 `mrd_portrait_mode`，描述：*"Shows suspects as a portrait grid. Turn off for list layout."*）。**[实证：CSS+字符串表]**
   * **线索卡**：进场动画 `.clue-box-pop`（`clueBoxPop` 0.25s）与 `.mrd-clue-in`（逐条 45 ms 延迟，`--clue-i`）。悬停可放大（`mrd_zoom_clue_hover`）。**[实证：CSS]**
   * **图例/状态区**（`game` 文案表）：`Note symbols`、`Suspects`、`Clues`、`General Clues`、`Victim`、`Murderer`、`CASE SOLVED`、`Solved in {time}`、`Placed at {cell}`、`click to select, hold on grid to place`。
   * **额外工具（可选）**：`extraTools`（`mrd_extra_tools`，默认关）会显示符号调色板：Triangle ▲(粉) / Circle ●(蓝) / Square ■(绿) / Star ★(黄)，id 前缀 `__sym_`。**[实证：GameScreen `je`]**
3. **中央棋盘区**：`.grid-wrapper` > `.grid-container`（`contain: layout style`；RTL 语言下被强制 `direction: ltr`）。
   * 棋盘左侧/上方有**行列坐标尺**（`R1..Rn` / `C1..Cn`），默认只在打开提示时显示，`alwaysShowCoords`（`mrd_always_show_coords`）可常显。**[实证：选项描述]**
   * 格内元素：`.grid-big-letter`（已放置角色的大字母，白字黑描边）与 `.grid-note-letter`（铅笔小字笔记）。**[实证：CSS，含打印态 `-webkit-text-stroke:1.5px #000`]**
   * 房间名标签：`roomLabelScale`（`mrd_room_label_scale` 0.7–1.6，基准 14px）、`highlightRoomLabels`、`highlightRoomWalls`、`mrd-roomwall`（墙层淡入）。
   * 场景选项：`shadowBlocked`/`shadowOpacity`（不可占据格加深）、`textureOpacity`、`objectSizePct`、`wallThickness`、`xSize`（X 大小 0.3–0.7）。
4. **右侧面板**（宽默认 **168px**）：**[推断]** 工具栏/计时器/统计侧栏；`rightPanelWidth` 与 `leftPanelWidth` 一起参与自动缩放计算。
5. **缩放**：`Z4()` 依据 `viewport`、左右面板宽、`gridScale`(`mrd_grid_scale`, 0.35–2.5) 与 `autoScaleGrid` 计算 `effectiveGridScale`；移动端阈值约 `280+168+48 = 496px`（**[推断]**，因 `<` 被代理吞掉，精确比较式不可读）。
6. **弹窗层**：`.mrd-modal-panel` / `.mrd-modal-body`（`overscroll-behavior: contain`，进入 `.mrd-soft-in`/`mrdZoomIn`）。结果弹窗、提示弹窗、How to Play、About、Options、Print、Share、Shared-state 冲突弹窗。
7. **打印布局**：`body.printing` + `.print-only > .print-page`（11in×8.5in、横版 `@page{size:landscape}`），打印时隐藏 `.app`、把 `--wall-thin` 变浅、`--wall-thick` 变深；`body.print-bw` 全灰度。**[实证：CSS]**
8. **开场/加载**：`mrd-pop-tile`/`mrd-pop-obj`（Pop 风格）、`mrd-block-fall`（Falling blocks，默认）、`mrd-flash-*`（Flashlight sweep）；`body.loading` 会暂停 hover 动画。**[实证：CSS + introStyle 选项]**

### 关卡列表页（/play/）[实证：字符串表 + CSS + 目录数据]

* 副标题 `Select a puzzle to play`；卡片容器有 `.puzzle-card-tilt`（hover 抬升 + 去倾斜）、`.puzzle-card-notched`（hover 6px 蓝描边，`coming-soon` 时红描边）、`.puzzle-card-tab`（hover 时上移 -23px，像信封的封盖）。
* **信封（envelope）**：未发布/未解锁关卡的卡面像**封着的信封**：`.envelope-inner-card`，点击后播放开信动画（`envelope-arc-mobile`/`envelope-arc-desktop` 抛物线飞起 700ms + `envelope-shine-sweep` 高光扫过 + `unlock-burst` 图标爆开），另有 `.envelope-wiggle` —— 对"即将解锁/可点击"的卡片**每 7–12 秒自动抖动一次**吸引点击。**[实证：index 包内 `Q.current.classList.add("envelope-wiggle")` + 7700–12000ms 随机定时器]**
  * 文案：`Case Available!` / `Click to reveal` / `PUZZLE UNLOCKED!` / `▶ PLAY NOW` / `Unlocks in {time}`（`.envelope-unlock`，蓝色）/ `Unlocks on {date}`（`.envelope-unlock-date`）/ `Leaving Soon!` / `Rotated Out` / `Coming Soon` / `NEW!`。
* **星星（star）**：`.mrd-b-star`（`mrdStarTwinkle` 6s 循环缩放旋转）——用于卡片/CTA 上的装饰星；**[推断]** 与"图书 CTA 评分"或"新关卡徽章"搭配（CSS 只给出类名与动画，具体挂载点因 JSX 不可读）。
* **seed chip**：`.mrd-seed-chip`（hover 上移 1px）**不是关卡列表的东西**，它属于 **Arcade / Daily Run** 模式：文案 `Run seed {seed}. Tap to copy. Friends who enter it race the same cases.` / `Copy run seed` / `Current seed` / `Seed: {seed}` / `Seeded run. Not eligible for records.`。**[实证：app-core `arcade` 文案 + generator 中 `seed` 参与洗牌]**
* 筛选/排序：难度 `All/Very Easy/Easy/Medium/Hard/Expert`（对应 `very easy/easy/medium/hard/expert`，目录里 `difficulty` 字段）、排序 `Difficulty/Title/Popular/Recently Played/Release Date/Status`、`hideCompleted`、`hideUnreleased`；统计 `{count} puzzles` / `{count} completed` / `{count} in progress`；卡片显示 `{w}×{h} grid`、`{count} suspects`、状态 `Not Started/In Progress/Completed`、`by {name}, guest designer`、`{count} online`。
* 卡片预览受 `hideSolvedSolution`（`mrd_hide_solved_solution`）影响：已解关卡不显示答案预览。**[实证：选项描述]**

---

## 交互流程（逐步状态机）

### 状态与模式 [实证：GameScreen `r4()` / `po` 常量]

* 工具模式 `mode ∈ { SUSPECT:"suspect", X:"x", ERASER:"eraser" }`（默认 `suspect`）。
* 选中角色 `selectedSuspect: id|null`；选 X/橡皮擦会清空选中。
* 棋盘状态：`placed: (id|null)[N*N]`、`notes: Set<id>[]`（每格一组小写字母笔记）、`xMarks: bool[]`、`placedAt: number[]`、`allPlaced`、`isOccupiable`、`solutionByIdMap`。
* 撤销栈：`canUndo/canRedo/undo/redo/undoFlash`（`Ctrl+Z`、`Ctrl+Y`、`Ctrl+Shift+Z`）；双指触屏 = 回滚到手势开始时的快照（`getBoardSnapshot`/`restoreBoardSnapshot`/`truncateUndoTo`）。**[实证]**

### 单次操作（pointer 事件）[实证：`handlePointerDown` / `handlePointerMove` / `handlePointerUp`]

```
pointerdown(cell):
  若 button===2（右键）: 切换该格 X 并进入"拖拽刷 X"状态
  若 mode === X:
      非拖拽点击 → 切换 X（有→删，无→加，受 canAddX/noXOnBlocked 限制）；保持按下拖动可连续刷
  若 mode === ERASER:
      单格清除（placed/notes/xMarks 全部清空，并播放 vanish 动画）
  若 mode === SUSPECT（默认）:
      需要已选中角色 && 该格可占据 && 该格没有 X
      ① pointerdown 立刻：若该格为空 → toggleNote(cell, suspectId)  ← 轻点=写/删铅笔笔记
      ② 同时启动长按计时（hold hook：ringDelay 后显示进度环，progress≥0.5 触发一次触感振动）
      ③ 长按完成 → place(cell, suspectId, {replace:true})，放上"大字母"，并清除选中
      ④ 若该格已有其他角色：长按将替换（replace），替换前原角色播放消失动画
pointermove（按住时）: 进入新格就对该格重复同样动作 → "拖拽批量刷笔记 / 刷 X"
pointerup/cancel: 结束拖拽与长按
双指按下: 撤销回本次手势开始前的快照
```

* 长按阈值与进度环延迟是 app-core 导出的两个常量（`ue` / `fe`）；**具体毫秒数不可读**（代理吞字 + 无导出表）。可参考值：整盘擦除长按 **1125 ms**、候选卡"划掉"长按 **700 ms**、vanish 动画 **600 ms**、X 脉冲 **320 ms** / 笔记 **200 ms** / 大字母 **260 ms**。**[实证的邻近常量 + 推断]**
* 官方教程文案（实证）：*"To place a character you must PRESS AND HOLD a square - keep your finger down until the big letter appears. (First tap a character to select them.) A quick tap does NOT place; it only leaves a small pencil note."*；`clickToSelect: "click to select, hold on grid to place"`。

### 辅助操作 [实证]

* **划掉嫌疑人**（"我认为他不是凶手"）：长按候选人卡 700 ms，卡上出现手绘**斜线/删除线**（`Fe` 组件，`variant: "slash" | "strike"`，SVG stroke 动画 + `mrdUndoFlash`）；存储键 `mrd_marked_suspects_{puzzleId}`；收到 `mrd:wipe` 事件时清空。**[实证]**
* **自动 X**：`autoX`（`mrd_auto_x`，默认开）放置角色后自动在其整行整列打 X；`noXOnBlocked`（`mrd_no_x_blocked`，默认开）禁止在不可占据格上打 X。**[实证]**
* **提示高亮**：`highlightSelected`（选中角色时保持关键词高亮）、`keywordCore/Objects/Rooms/People/RowCol`（分别高亮核心词/对象/房间/人物/行列引用）、`alwaysShowCoords`、`plainDirections`（把 north of→above 等换成更白话的说法）、`intuitiveRowCol`（中文界面用「横/直」）、`genderColors`（男女符号 ♀/♂）。**[实证]**
* **计时器**：`Fs()` hook，间隔 1 s，存 `mrd_timer_{puzzleId}`（每 10 s 落盘），`showTimer` 控制显示；完成即 `stopTimer`，`resetTimer` 重置。**[实证]**
* **开屏教程**：`f0` 五页教程（`mrd_intro_seen_v1` 记录已看），页 1「如何破案」、页 2「每行每列一人」（含行列演示）、页 3「beside 的含义」（含演示）、页 4「放置角色＝长按」（含演示）、页 5「提交判题」；`Skip/Back/Next/Let's play!`。**[实证]**
* **首次选中提示**（popups）：`tutorialFirstSelect`（非触屏、0 次放置时提示）、`eraserHint`、`rowColumnConflict`（行/列冲突，3 s 节流）、`progressSaved`、`progressRestored`、`copiedToClipboard`、`puzzleLoadError`、`languageNotFound`。**[实证]**

### 提交与结算 [实证]

1. 玩家点 `Submit`；若未摆满 → 无效（按钮提示 `(place all first)`）。
2. `startReveal()`：逐个角色播放"揭晓"动画：先 `mrd-validation-start` 事件，再逐格 pulse，最后一次性 vanish 掉笔记/大字母（`triggerVanishMultiple`），随后按角色顺序显示对/错结果。
3. 结算：全对 → `solvedCeremony` + 金色闪光（`.just-solved`、`trophy-pulse`）+ 打开结果弹窗 `foundMurderer`；有错 → `notFoundEveryone`（`{correctCount}/{totalCount}`）+ 失败态弹窗。
4. 结果弹窗按钮：`Play Again`、`Back to Puzzles`、`Share`、`Next Puzzle`；含评分关键词（`challenging/polished/satisfying/surprising/loved/ok/boring/unfair`）、`How was this puzzle?`、`Solution video`、以及图书/支持/社区等 CTA。
5. **竞技模式**（`contestMode`）：提交走 Cloud Function `validateSolution`（Bearer ID Token，body `{puzzleId, placements, elapsedSeconds}`），返回 `correct`/`message`/`alreadyCompleted`；服务端时间用 `getServerTime` 或 Firebase RTDB `.info/serverTimeOffset` 校准（`mrd_server_time_offset`）。**[实证]**
6. 进度持久化：`localStorage` 键 `mrd_catalog_v2`（进度目录）、`mrd_state_{puzzleId}`（当前棋盘）；登录后 debounce 到 Firestore `users/{uid}.puzzleProgress.{puzzleId}`（常规 10 s，快速模式 300 ms）。**[实证]**

### 棋盘状态码（分享链接用）[实证]

`Uo()` 把棋盘编码成字符串，逐格：
* X → `X`；已放置 → 角色符号**大写**字母；笔记 → `!` + 排序后的小写符号 + `?`（单个笔记直接写小写字母）；空 → `-`。
然后 `Ho()` 做游程压缩：连续 `n` 个相同 token 写成 `n+token`（`n===1` 时省略数字）。解码 `pr()` 支持 1..1500 格，`!...?...?` 组内逐个字母加笔记。状态对象另有 v2 封套 `{v:2, s:code, w, h, sym}`（`sym` = 角色符号拼串，用于校验码与关卡是否匹配）。**[实证]**

---

## 关卡数据结构与示例 JSON

### 顶层结构 [实证：`puzzle-core` `Tn()` 解析器 + 真实 JSON]

```
{
  PROPERTIES: { ...关卡级参数（字符串数字居多） },
  GRID:       { ...房间/对象/楼层/窗/标签（按索引 key） },
  CHARACTERS: { ...角色定义、美术参数、线索文案、解坐标 },
  OBJECT?:    { ...对象配色（obj_color_{channel}_{objId}） }
}
```
查找顺序：`root[key] ?? GRID[key] ?? PROPERTIES[key]`（`we()`），`CHARACTERS` 也参与部分查找。

### `PROPERTIES` 字段 [实证]

| 字段 | 含义 |
|---|---|
| `puzzle_version` | ≥2 时启用"转置/子区域"等新语义（坐标对顺序随之交换，见下） |
| `grid_w`, `grid_h` | 列数、行数（3..24） |
| `cellsize` | 每格像素（150） |
| `grid_rx`, `grid_ry` | 网格原点像素坐标 |
| `total_char` / `total_chars` | 角色数（= N，含受害者） |
| `murderer` | 凶手角色索引 |
| `difficulty` | 生成器写 2/3/4（easy/medium/hard），目录里另有字符串难度 |
| `total_rooms_`, `total_grids` | 房间数、网格数 |
| `grid_theme`, `grid_objets_theme`, `background_no`, `background_path` | 场景美术选择 |
| `instructions_in_white`, `victimcard_visible` | 显示开关 |
| `language` | 遗留字段 |
| `clue_0`..`clue_10` | 数字代码全局线索（见线索表 A） |
| `clue_custom_text1..3`, `general_clue_0..9` | 自定义全局线索 |
| `player_hint_1_{lang}` .. `player_hint_10_{lang}` | 分步提示 |
| `solution_text_{LANG}_{n}` | 文字解答步骤（实测 EN 有 0..7 步） |

### `GRID` / `CHARACTERS` / `OBJECT` 字段 [实证]

* 房间：`room_code_{a}_{b}`、`room_name_{id}`、`room_name_xpos_{id}`/`room_name_ypos_{id}`、`room_color_0_{id}`、`room_color_1_{id}`、`room_color_sat_0/1_{id}`、`room_color_xpos1/2_{id}`、`room_color_ypos1/2_{id}`、`room_floortex_{id}`、`floor_type_{id}`、`floor_height_{id}`、`room_class_medieval_{id}`、`room_subroom_{id}`、`room_subroom_mainroom_{id}`
* 家具：`room_objects_{a}_{b}`、`room_objects_frame_{a}_{b}`、`carpet_objects_{a}_{b}`(5=地毯)、`carpet_objects_frame_{a}_{b}`、`corner_objects_{y}_{x}`、`ship_objects_{a}_{b}`、`obj_color_0_{objId}`、`obj_color_1_{objId}`、`obj_color_base_{objId}`、`obj_color_overlay_{objId}`
* 门窗：`room_windows_h_{i}_{j}`、`room_windows_v_{i}_{j}`
* 角色：`char_name_{n}`、`char_sex_{n}`(1=female)、`char_theme/body/skincolor/hair/haircolor/facial/clothes/clothescolor/hat/accessory/hatcolor/accessorycolor_{n}`、`char_hatcolor_hex_{n}`、`char_avatar_{n}`(data:image/…)、`char_bgcolor_{n}`、`char_quote_{lang}_{n}`、`char_subquote_{lang}_{n}`、`letter_xpos_{n}`、`letter_ypos_{n}`、`solution_x_{n}`、`solution_y_{n}`
* 关卡标题：`title_{lang}_`（注意结尾下划线；也有 `title_en_` 在 GRID/CHARACTERS 里），`creator` / `creator_`

**坐标对顺序 [实证 + 注意]**：在实测的 The Courtroom（无 `puzzle_version`，即 v1）里，`{a}_{b}` = **(列 x, 行 y)**，0 基：我用 `room_code_{col}_{row}` 与 `room_name_{id}` 逐房间对上了官方提示（A=R2C4→`room_code_3_1`=0=Judge's Bench；B=R8C7→`room_code_6_7`=2=Gallery；E=R7C5→`room_code_4_6`=4=Witness Stand；V=R3C9→`room_code_8_2`=6；F=R5C8→`room_code_7_4`=6 → 受害者与凶手同为 room 6 = 单独同室，且 `murderer=5`=Fritz）。`carpet_objects_1_5`=5 也对应 D 的 R6C2。解析器对 `puzzle_version>=2` 有显式"转置"分支，并尝试 `{XY, YX} × {base0, base1}` 四种候选；生成器自己写的是 `room_objects_{row}_{col}`，即 **v2 的坐标对顺序与 v1 相反**。**[v1 已实证；v2 顺序为强推断]**

### 示例 JSON（结构化摘要，非逐字段全量）

取自真实关卡 `https://murdoku.com/play_puzzles/en/puzzle-the-courtroom-easy.json`（9×9，9 角色，凶手 idx=5，受害者=最后一个角色 idx=8）：

```jsonc
{
  "PROPERTIES": {
    "cellsize": "150", "grid_w": "9", "grid_h": "9",
    "grid_rx": "1820", "grid_ry": "920",
    "total_char": "9.000000", "total_chars": "9",
    "murderer": "5.000000", "difficulty": "0.000000",
    "total_rooms_": "9.000000",
    "grid_theme": "1.000000", "grid_objets_theme": "0.000000",
    "background_no": "5.000000", "background_path": "",
    "instructions_in_white": "0.000000", "victimcard_visible": "0.000000",
    "clue_0": "0.000000", "clue_1": "0.000000",
    "clue_custom_text1": "", "clue_custom_text2": "", "clue_custom_text3": "",
    "player_hint_1_en": "We can deduce that (A) is in the Judge's Bench in R2, either C4 or C6. ...",
    "solution_text_EN_0": "A must be in the Judge's Bench area, but not on the chair per B's clue."
  },
  "GRID": {
    "room_name_0": "Judge's Bench", "room_name_1": "Judge's Office",
    "room_name_2": "Gallery", "room_name_3": "Jury Box",
    "room_name_4": "Witness Stand", "room_name_6": "Prosecution",
    "room_name_7": "Security", "room_name_8": "Clerk's Desk",
    "room_name_xpos_0": "2356.000000", "room_name_ypos_0": "1298.000000",
    "room_color_0_0": "10921645.000000", "room_color_1_0": "12832728.000000",
    "floor_type_3": "16.000000", "floor_type_7": "5.000000",
    "room_code_0_0": "1.000000",  "room_code_3_1": "0.000000",
    "room_code_6_7": "2.000000",  "room_code_4_6": "4.000000",
    "room_code_8_2": "6.000000",  "room_code_7_4": "6.000000",
    "room_objects_0_0": "13.000000",      // Shelf
    "room_objects_1_0": "2.000000",       // Chair  → 官方提示里的 “the chair in R2”
    "room_objects_frame_0_1": "1.000000", // Plant 叠在 Table 上
    "carpet_objects_1_5": "5.000000",     // 地毯（D 站在 R6C2）
    "carpet_objects_frame_1_5": "7.000000",
    "room_windows_h_0_0": "0.000000", "room_windows_v_0_0": "0.000000",
    "room_subroom_0": "0.000000", "room_subroom_mainroom_0": "0.000000",
    "title_en_": "The Courtroom", "title_fr_": "Le meurtre mystérieux"
  },
  "CHARACTERS": {
    "char_name_0": "Arthur", "char_sex_0": "0.000000",
    "char_quote_en_0": "He was at the ", "char_subquote_en_0": "Judge's Bench.",
    "letter_xpos_0": "2336.000000", "letter_ypos_0": "1142.000000",
    "char_name_1": "Benjamin",
    "char_quote_en_1": "He was alone with the only person", "char_subquote_en_1": "sitting in a chair.",
    "char_name_5": "Fritz", "char_quote_en_5": "He was beside a table.",
    "char_name_8": "Vanessa",
    "char_quote_en_8": "The Victim. She was alone with the murderer."
  },
  "OBJECT": {
    "obj_color_0_2": "13685980.000000", "obj_color_1_2": "7763840.000000", // Chair 双色
    "obj_color_0_8": "0.000000", "obj_color_1_8": "0.000000"               // Void
  }
}
```

> 解坐标两种载体：`letter_xpos_n`/`letter_ypos_n`（配合 `grid_rx/ry/cellsize` 换算，实测关卡用这套）或 `solution_x_n`/`solution_y_n`（生成器用这套，直接是 0 基 col/row）。

### 目录 JSON 结构 [实证：`/play_puzzles/_puzzleCatalog.json`]

```jsonc
{
  "puzzles": [
    {
      "id": "puzzle-the-courtroom-easy",
      "title_en_": "The Courtroom", "title_fr_": "La salle d’audience", "title_zh_hans_": "法庭",
      "file": "puzzle-the-courtroom-easy.json",
      "difficulty": "easy",            // very easy | easy | medium | hard | expert
      "gridSize": "9x9",
      "suspects": 9,
      "category": "free",              // free | secret | unlisted | uncategorized (| premium)
      "creator": "Craig Wallander",     // 可选
      "videoId": "EoGzvhw_Buc",         // 或 video_id_{lang}
      "releaseAt": "2025-01-01T05:00:00.000Z",
      "leavingAt": "2026-02-21T04:59:59.000Z",   // 可选
      "patchnote": "",
      "availableLanguages": ["en","fr","es","nl","pt"],
      "theme": "wildwest",             // 可选（目录里出现 wildwest 主题标记）
      "premiumPrice": 120,             // 可选
      "leaderboardDisabled": true,     // 可选
      "promo": { ... }                 // 可选
    }
  ]
}
```
难度到"每关线索数预算"的映射（`app-core`：`{"very easy":4, easy:6, medium:10, hard:12, expert:16}`）**[实证]**，可用于推测难度分级。可用性判定（`Fe()`）：`releaseAt <= now` → available；`releaseAt <= now+21天` → "coming"（显示但锁定）；否则 hidden（VIP 可见）。**[实证]**

---

## 数据端点

全部实测 HTTP 200（无鉴权）：

| URL | 内容 | 备注 |
|---|---|---|
| `https://murdoku.com/play/` | SPA HTML | 只有 `<title>Murdoku – Murder Mystery meets Sudoku</title>`，内容全由 JS 渲染 **[实证]** |
| `https://murdoku.com/play_puzzles/_puzzleCatalog.json` | **关卡目录** | 前端带 `?t={分钟时间戳}` 做分钟级缓存；本地也缓存到 `mrd_catalog_cache`(5 min, version 2) **[实证]** |
| `https://murdoku.com/play_puzzles/en/{id}.json` | **关卡全量数据** | 例：`/play_puzzles/en/puzzle-the-courtroom-easy.json` **[实证]** |
| `https://murdoku.com/play_puzzles/{lang}/{id}-{lang}.json` | **翻译补丁** | 与英文合并：`title`→`GRID.title_en_`，`rooms`→`GRID[k]`，`suspects`→`CHARACTERS[k]` **[实证]** |
| `https://murdoku.com/play/assets/*.js|*.css|obj_*.svg` | 资源 | 目录项里 `file` 字段有的带 `.json` 后缀、有的不带（`puzzle-brazil-biennale-easy`），说明服务端做了容错/重定向 **[实证]** |
| Firebase 项目 `murdoku-c0640` | Firestore/RTDB/Analytics | apiKey `AIzaSyALY_Nc3eyxz_Ev9UQ25ASHTyXIXFAKLnY`, authDomain `murdoku-c0640.web.app`, databaseURL `https://murdoku-c0640-default-rtdb.firebaseio.com` **[实证]** |
| Firestore `puzzlePreviews/{puzzleId}` | **未发布关卡的预览数据**（`data` 字段） | 未发布时只能拿到 preview **[实证]** |
| Firestore `users/{uid}` | `puzzleProgress.*`, `currency`, `options`, `unlockedSecrets`, `ownedPremiumPuzzles`, `seenWinnerToasts`, `language`, `username` | **[实证]** |
| `https://us-central1-murdoku-c0640.cloudfunctions.net/purchasePremiumPuzzle` | 购买付费关卡（Bearer Token） | **[实证]** |
| `https://us-central1-murdoku-c0640.cloudfunctions.net/validateSolution` | 竞赛判题（Bearer Token，`{puzzleId, placements, elapsedSeconds}`） | **[实证]** |
| `https://us-central1-murdoku-c0640.cloudfunctions.net/getServerTime` | 服务器时间 | 与 RTDB `.info/serverTimeOffset` 互为兜底 **[实证]** |
| `assets/{lang-data,app-core,puzzle-core,generator,GameScreen,...}.js` | 懒加载分包 | 见 index 的 `__vite__mapDeps` 列表（含 `OptionsModal`、`HowToModal`、`AboutModal`、`PrintModal`、`ShareModal`、`PrintableView`、`admin`、`DebugPanel`、`LaunchLeaderboardModal`、`PremiumPurchaseModal`、`useSounds` 等） **[实证]** |

---

## 来源清单（URL + 我从中得到了什么）

**一手（代码/数据，实证）**
1. `https://murdoku.com/play/assets/index-WQQE-9Ye.css` — 完整样式：CSS 变量（`--wall-thin/--wall-thick/--cell-base/--cell-placed/--x-overlay/--select-primary/--portrait-name-bg/--accent/--bg/--panel`）、所有 `.mrd-*` 与布局类名、全部关键帧动画（放置/悬停/揭晓/长按/信封/印章按钮/打印），z-index 无关但层级由 JS 常量给出。
2. `https://murdoku.com/play/assets/app-core-CuW9k_FP.js` — 全部 UI 文案（toolbar/game/puzzleSelect/modals/howToPlay/glossary/faq/advanced/options/result/arcade/account）、主题色板、布局常量、设置项键名与默认值、路径路由函数、进度持久化、导出码表（`_o` 渲染层、hold/vanish 时长）。
3. `https://murdoku.com/play/assets/puzzle-core-Cla4GAxx.js` — OBJECT 表（0..151 及 occupiable 位）、`Tn()` 关卡解析器（grid 3..24、char 3..24、字段名全清单）、房间/对象/地毯/角物/窗/船解析、多语言空间词表（含语义定义）、全局线索数字代码表（`hn`）、提示与解答文案读取、关键词高亮/断词算法。
4. `https://murdoku.com/play/assets/generator-htbE2ORV.js` — 线索 atom 类型全集与英文文案模板、难度权重表、生成器写出的 JSON 结构（`PROPERTIES`/`CHARACTERS` 字段、`puzzle_version:"2"`）、解校验器（行/列唯一 + 不可占据格报错）、Arcade/Daily Run（seed）文案与随机数（`mulberry32` 风格 `no(e)`）。
5. `https://murdoku.com/play/assets/index-C2Pkqkni.js` — 关卡列表页逻辑：信封卡片与开信动画、`envelope-wiggle` 定时抖动、解锁/离开判定（`releaseAt`/`leavingAt`/21 天窗口）、筛选排序、卡片状态文案、路由（`/play`、`/play/{id}`、`/play/{id}/{state}`、`?print`）、棋盘状态码编解码（`Uo`/`Ho`/`pr`）、键盘快捷键、通知/竞赛 toast。
6. `https://murdoku.com/play/assets/GameScreen-BsmLD1yS.js` — **交互状态机**（`mode: suspect/x/eraser`、长按放置 hook `n4`、拖拽批量 `i4`、双指撤销、右键切 X）、棋盘状态与撤销栈、揭晓/结算流程、受害者/凶手推导、计时器、整盘擦除 1125ms、划掉嫌疑人 700ms、额外符号调色板、打印流程、布局缩放 `Z4`（左 340 / 右 168）。
7. `https://murdoku.com/play_puzzles/_puzzleCatalog.json` — 真实目录：关卡 id/难度/尺寸/嫌疑人数/分类/发布时间/下架时间/视频/创作者/多语言标题。
8. `https://murdoku.com/play_puzzles/en/puzzle-the-courtroom-easy.json` — 真实关卡全量数据，用来**验证**坐标语义、房间名、可占据性、受害者/凶手关系（与官方提示文本互相印证）。
9. `https://murdoku.com/play/assets/lang-data-BuNhPc0T.js` — 26 种语言的家具名词表、序数词、方位词与否定模式（说明线索文本是多语言手写的，引擎只做词表匹配）。

**二手（文章，仅作交叉验证）**
10. [Murdoku Explained: How the Murder Mystery Sudoku Puzzle Works — Shigjeta.net](https://www.shigjeta.net/murdoku-explained-how-the-murder-mystery-sudoku-puzzle-works/) — **[文章]** 每行每列一人、房间/家具限制、一步不可占据、"beside = 上下左右且同房间"、"凶手=与受害者单独同室"、关卡按场景有特殊规则（法庭/Preppers/赛马场/动物园/禁闭室）、作者 Manuel Garand、新关每周两次；与本报告代码结论一致。
11. [This murder mystery sudoku might be my new puzzle game obsession — Destructoid](https://www.destructoid.com/this-murder-mystery-sudoku-might-be-my-new-puzzle-game-obsession/) — **[文章]**（仅搜索摘要，未全文抓取）用"房间+物品"替代数字的 sudoku 变体。
12. [Murdoku is de nieuwe sudoku — iphoned.nl](https://www.iphoned.nl/nieuws/murdoku-iphone/)、[Focus.pl](https://www.focus.pl/artykul/co-laczy-sudoku-i-kryminaly-agathy-christie-murdoku-to-cos-czego-na-pewno-musze-sprobowac)、[Linda.nl](https://www.linda.nl/meiden/trending/meiden-tips/is-dit-het-spelletje-dat-iedereen-deze-zomer-op-het-strand-speelt/)、[Outland 书讯](https://www.outland.no/p/p-murdoku-volume-3-murdoku-3-9781788407526) — **[文章]** 系列出版物与流行度背景（与代码里的图书 CTA 一致）。

**抓取限制（重要）**
13. 本次运行 `pwsh` 完全不可用（`STATUS_DLL_INIT_FAILED`，exit 3221225794），无法用 curl/Invoke-WebRequest 落盘；`web_fetch` 拒绝 `application/javascript` 与 `application/json` 之外的脚本类型；可用的文本代理 `https://www.w3.org/services/html2txt?url=...` 会把 JS 中 `<`…`>` 之间的内容当标签丢弃，且对超长文件有截断。因此 **DOM/JSX 结构、部分常量数值（长按阈值 `ue`/`fe`、移动端断点比较式）不可读**，我在文中已逐处标注。

---

## 不确定的点

1. **DOM 结构未被直接读到**：`.grid-container / .grid-wrapper / .portrait-name-bar / .clue-box-pop / .grid-note-letter / .grid-big-letter / .mrdPortraitGroup / .mrd-stamp-btn / .print-only` 全部在 CSS 中实证存在，但"哪个元素在哪一层、左右面板里到底放了什么"是 **[推断]**（依据：左右面板宽度常量 340/168、文案表、渲染层 z-index、打印样式）。若要 1:1 复刻像素布局，需要真正在浏览器里打开 `/play/` 用 DevTools 取 DOM（本环境无法启动浏览器/HTTP 客户端）。
2. **长按阈值未读到具体毫秒**（`n4({durationMs: ue, ringDelayMs: fe})` 的两个实参是 app-core 导出常量，代理吞掉了导出映射表）。已知相邻常量：整盘擦除 1125 ms、划掉候选人 700 ms、vanish 600 ms。**[推断]** 长按约在 400–700 ms 量级（教程强调"按住直到出现大字母"）。
3. **`{a}_{b}` 坐标对顺序**：v1（The Courtroom）已用数据端到端证明是 (col, row)；`puzzle_version>=2` 有转置分支，生成器自身写的是 (row, col)，故 **v2 顺序为强推断**，未用 v2 关卡样本逐格验证（我未能列出哪个线上关卡是 v2）。
4. **受害者判定**：代码是"取 `symbol==="V"` 的角色，否则取最后一个角色"。实测样本符合"最后一个是受害者"，但**是否存在显式字段**（如 `isVictim` / `victimReal`）我未在解析器里读到（解析器只读 `murderer`）。若复刻，建议自定义时显式标注受害者。
5. **`--wall-thin` / `--wall-thick` 的语义分工**：我推断 thin=同房间内部网格线、thick=房间边界+外框（依据 glossary 与 print 配色）。深色主题里两者颜色几乎相同（只差粗细），因此**墙的粗细本身**是由 `wallThickness` 选项（默认 5）统一控制的，这一点是从选项定义**[推断]**，未读到绘制代码。
6. **信封/星星/seed chip 的挂载点**：信封卡与 `envelope-wiggle` 的触发逻辑已实证（列表页未解锁卡）；`.mrd-b-star`（闪烁星星）与 `.mrd-seed-chip` 我读到类名/动画与 seed 文案（Arcade/Daily Run），但**星星具体贴在哪个 UI 元素上**是 **[推断]**（很可能是图书 CTA 评分星或"新关卡"徽章）。
7. **Arcade / Daily Run 模式的完整规则**：文案显示 `Time Attack 10 min`、`Survival`（每案 1 分钟）、`Daily Run {date} (UTC)`、`Autosubmit`、`Survival/attack{n}` 的最佳成绩与 ghost 记录（`mrd_arcade_best_v1` / `mrd_arcade_ghost_v1`），但**棋盘生成算法的完整流程**（房间划分、家具摆放、线索挑选与可解性验证）只读到片段（因 `<` 吞字与截断），未完整还原。
8. **`clue_0..clue_10` 与 `GENERAL_CLUES` 的优先级/组合规则**：`wn()` 的逻辑是"若存在数字代码线索或自定义线索则用它们，否则回退到 `GENERAL_CLUES/CLUES/clues` 数组"，我读到的是这段分支，但**多语言下 `clue_N` 是否也能本地化**（`hn` 表只有英文）未确认 → **[推断]** 数字代码线索只有英文（因此线上关卡基本改用 `char_quote_{lang}` 手写 + `clue_custom_text{lang}`）。
9. **`.mrd-b-star` 之外，`mrd-seed-chip` 的具体交互**（点击复制 seed）：文案 `seedLine: "Run seed {seed}. Tap to copy."` 与 `copySeedTitle: "Copy run seed"` 已实证，但复制实现（Clipboard API）未读到。
10. 站点是否会**按日期轮换**关卡（`releaseAt` 每 1–2 周新增、`leavingAt` 下架）已实证为数据事实；**具体上新节奏**（文章说"每周两次"）只有 **[文章]** 支持。
