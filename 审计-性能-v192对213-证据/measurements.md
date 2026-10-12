# v192 vs v213 —— 四轴 A/B 离线量测（千星奇域 Lua 游戏 murdoku）

> ## ⛔⛔⛔ 更正（2026-10-12 晚，用户指正后加）—— **本文件所有"版本差额"数字已撤回** ⛔⛔⛔
>
> **本文件用的探针假树漏了真存档里有的 8 个边控件**（`wall.up/down/left/right`、`door.up/down/left/right`，
> 父控件＝`content`，见 `qianxing-murdoku\347.gil` 实证），并**假造了 10 个存档里没有的 `ruler` 标签控件**。
> ⇒ 每一次 wall/door 查询在本假树里都**注定未命中**，凭空造出 **840 笔 `GetChild`/render**，且**全记在 v192 头上**。
>
> **把树修忠实之后重测（见 `对比报告-v192-vs-v213.md` §0.3）：**
>
> | 指标 | 本文件（假树） | **忠实树（以此为准）** |
> |---|---|---|
> | 一次稳态 render | 972 → 132 | **111 → 111（差额 0）** |
> | 其中 `GetChild` | 840 → 0 | **0 → 0** |
> | 其中 `GetSizeDelta` | 21 → 21 | **0 → 0** |
> | 每帧（60 帧窗） | 39.4 → 23.4 | **100.5 → 42.0** |
> | 每帧（300 帧窗） | 25.0 → 15.3 | **40.3 → 28.4** |
> | `GetChild`/帧 | 9.93 → 1.00 | **1.00 → 1.00** |
> | 切屏 `home` 稳态 | 61.9 → 28.9 | **66.5 → 54.9** |
> | 切屏其余窗口 | 有差 | **两版逐字相同** |
>
> **仍然可用的部分**：本文件的**方法、命令、逐字 raw 输出、以及"哪些探针跑不起来"的逐条归因**全部有效；
> **凡涉及"两版之间差额"的具体数字，一律以忠实树重测为准**（`raw/faithful_*`）。
> 尚未在忠实树上重跑的项（`OnStart`、`Murdoku.start()` 换关、切屏第 1 帧）**暂不可作结论**。
>
> —— 详见 `对比报告-v192-vs-v213.md` 第 2 版 §0 全节。

> 工作目录：`D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\`
> 被测仓库（**只读**）：`D:\新建文件夹\miHoYo Launcher\qianxing-murdoku`
> 量测会话时间：2026-10-12 23:06–23:20 (+08:00)
> 原始逐字输出：本目录 `raw/`（索引 `raw/_index.tsv`、`raw/_index_harness.tsv`）

---

## 0. 标注规则（**先说清楚，后面每个数字都带标记**）

| 标记 | 含义 |
|---|---|
| **实测** | 本会话**我**跑出来的数字（命令 + 逐字输出都在 `raw/`） |
| **实测†** | 本会话我跑的，但**探针文件是同一工作区里另一个并发会话写的**（不是我写的探针）。口径来源已注明；数字是我在自己这轮跑出来的 |
| **引用** | 从文件里读到的，给出 `文件:行` |
| **推断** | 我只做了推理，**没有**量过 |

**共同口径（四轴全部适用，不再逐处重复）**：
所有离线探针都用**假引擎 + 假控件树**跑**产物脚本本体**（`loadfile(产物) → OnInit → OnStart → OnUpdate(1/60)`）。
量的是**引擎原语被调用的次数**，**不是毫秒**。因此：
* 同一探针、同一参数下 v192/v213 的**差值和比值可信**（同口径、同假树、同帧数）；
* **绝对值不是真机耗时**；任何"每帧多少 ms"只有真机能给（见 §10）；
* 探针树的形状是**手搭的**（`perframe_engine_calls.lua` L118–149 注释自称"与真机同构"）；产线源码未改，产线通过 `find/controls` 拿到的都是这批假对象 ⇒ 能被计到。**假树形状若与真机不符，计数会被钉死在 0**（该仓库自己踩过，见 `tests/_wip/README.md`）。本报告 §9 逐条记录了"钉死/拒绝出数"的情况。

---

## 1. 产物与环境（**实测**）

```
v192.lua  1168700  sha256 32DFC2AFDA9E526D53ADC0D295A13B759C93840CF366DA117CBC64485927E071  构建标记 v192
v212.lua  1189277  sha256 D4C0B89493FC21D348DDDBC3AA3823E7997CAF44D5E5C9689F5E19D89D5801B9  构建标记 v212
v213.lua  1196532  sha256 4054178B6A6EBF63D0646BFF04FB1E1CE74989A797D22B56F6878A6CF8F1E5AB  构建标记 v204/v205/v206/v210/v213
v216.lua  1204600  sha256 27D7D21B3FDFE6F5E9563222A743CCC28C8999E220D27C9E09E7CCF46B31AD4E  构建标记 v204/v205/v210/v214/v216
```
* 哈希为 `Get-FileHash -Algorithm SHA256` 现场重算，与交接说明给出的前 16 位一致；大小逐字节一致 ⇒ 按说明**未重新推导**产物身份。
* 环境：Windows，ANSI 代码页 936，`lua` = Lua 5.3（`C:\Users\18182\AppData\Local\Programs\Lua\bin\lua.exe`）。产物路径含中文 ⇒ 输出里回显的路径是 mojibake，但 `loadfile` 成功（所有探针 exit code 见索引），**不影响计数**。
* 产物内部自报："`[murdoku] ===== 构建标记 v192 / 2026-10-11 / …`"（`raw/harness_session_ab_probe__v192.txt`，运行期日志第 2 条）。

---

## 2. 复现命令

```powershell
# ① 仓库自带探针矩阵（核心探针 × v192/v212/v213/v216；补充探针 × v192/v213）
pwsh -NoProfile -File "D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\run_probes.ps1"
#    = 对每个探针在 workdir=D:\新建文件夹\miHoYo Launcher\qianxing-murdoku 下执行：
#      lua <探针相对路径> <产物绝对路径> [额外参数]
#    产物路径一律取 D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\artifacts\<v>.lua

# ② 本会话新写的补充探针（初始/换关/切屏/稳态四段，见 §4/§6/§7）
pwsh -NoProfile -File "D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\harness\make_harness.ps1"
cd "D:\新建文件夹\miHoYo Launcher\qianxing-murdoku"
lua "D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\harness\session_ab_probe.lua" "D:\新建文件夹\miHoYo Launcher\perf-compare-192-213\artifacts\v192.lua"
lua "...\harness\session_ab_probe.lua" "...\artifacts\v213.lua"

# ③ 并发会话写的冷 render/换屏探针（我执行）
lua "...\perf-compare-192-213\probe_cold_render.lua" "...\artifacts\v192.lua"          # cold 模式
lua "...\perf-compare-192-213\probe_cold_render.lua" "...\artifacts\v192.lua" switch   # 切屏模式
```
**逐条命令 + exit code + 耗时 + 输出字节数**在 `raw/_index.tsv`（69 行）与 `raw/_index_harness.tsv`。
`perframe_engine_calls.lua` 统一用 `300` 帧（= 10×30，对齐 20/30 帧节流位）。

**稳定性复跑（实测）**：`raw/rerun_*.txt`。`perframe` 总计 7503 / 4595 次、`geo_write_count` 440 / 0 笔、`grid_cost` 稳态 render `find=232` / `find=63` —— 与首轮**逐字一致**，说明这些计数是确定性的（不是抖动）。

---

## 3. 轴 1 —— 初始（冷启动 / 首帧）

| 指标（引擎原语**调用次数**，除非注明） | v192 | v213 | Δ | 怎么量的 | 置信度 |
|---|---:|---:|---:|---|---|
| `OnInit()` 期间调用 | **321** | **321** | 0 | **实测**，`harness/session_ab_probe.lua` [A2] | 高 |
| `OnStart()` 期间调用 | **40288** | **35733** | **−11.3%** | **实测**，同上 [A3] | 中（见下注①） |
| 初始合计（chunk+OnInit+OnStart） | **40609** | **36054** | **−11.2%** | **实测**，同上 [A4] | 中（注①） |
| 初始纯 Lua `os.clock`（含探针自身开销） | **37.0 ms** | **40.0 ms** | **不可判**（注②） | **实测**，同上 [A4] | **低** |
| 第 1 帧 `OnUpdate` | **1427** | **1388** | −2.7% | **实测**，同上 [A5] | 中 |
| 第 2..61 帧（进关强压窗口）每帧 | **43.28** | **27.22** | **−37.1%** | **实测**，同上 [A6] | 中 |
| 换代后**第一趟** render（冷账本；模拟初始/切屏/换关） | **13647** | **11588** | **−15.1%** | **实测†**，`probe_cold_render.lua`（并发会话写的探针，**我执行**）`raw/othersession_probe_cold_render__v192.txt:13` / `__v213.txt:13` | 中高 |
| 换代后**第二趟** render（同代内已热） | 972 | 132 | −86.4% | **实测†**，同文件 `:20` | 高 |
| 换代后"冷/热"倍数 | 14.0× | 87.8× | — | **实测†**，v192 探针自算 `:22`；v213 为 11588/132 我算的 | 高 |
| 冷启动第 1 趟 render 的**几何写** | **111** | **111** | 0 | **实测**，`render_geom_writes.lua` [1] | 高 |
| 冷启动那趟几何写里**幂等**（写了等于原值） | 111 (100%) | 111 (100%) | 0 | **实测**，同上 | 高 |
| 一次冷 `RefreshItems`（进关那一下） | `item.GetChild=59`、`view=5`、`GetChildren=2085` | 同（逐字一致） | 0 | **实测**，`grid_cost.lua` [B] | 高 |
| 冷进关 3 次 render 的 `find` | 2414 | 1399 | −42.0% | **实测**，`grid_cost.lua` [I] | 中高 |

逐字关键行（**实测**；行号 = `raw/harness_session_ab_probe__v192.txt` / `__v213.txt` 的同名行）：
```
:6   [A2] OnInit()：321 次引擎调用（读 319 / 写 2），os.clock 0.000 ms
:7   [A3] OnStart()：40288 次引擎调用（读 39382 / 写 906），os.clock 36.000 ms      ← v213 同名行：35733 / 40.000 ms
:8   [A4] 初始合计（chunk+OnInit+OnStart）：40609 次引擎调用，os.clock 37.000 ms    ← v213：36054 / 40.000 ms
:9        OnInit+OnStart 的方法分布（前 8）：GetChildren=35596  GetChild=3659  SetVisible=209 …   ← v213：GetChildren=32274  GetChild=2579 …
:11  [A5] 第 1 帧 OnUpdate：1427 次引擎调用（读 1362 / 写 65）                     ← v213：1388（读 1343 / 写 45）
:12  [A6] 第 2..61 帧（进关强压窗口那段）：2597 次 / 60 帧 = 43.28 次/帧            ← v213：1633 次 = 27.22 次/帧
raw/_wip_render_geom_writes__v192.txt:5    【冷】几何写 111 笔：幂等 111 ✗ / 真变 0 ✓ / 首写(原值读不到) 0
raw/_wip_render_geom_writes__v213.txt:5    【冷】几何写 111 笔：幂等 111 ✗ / 真变 0 ✓ / 首写(原值读不到) 0
```
**注①**：`OnStart` 的 3.2–3.6 万次里有 ~3.2–3.6 万是 `GetChildren`。这是**产线在启动期遍历控件树**（诊断/兜底遍历那类）的调用次数，v192/v213 结构一致，A/B 有效；但它**不等于**真机启动耗时。
**注② 这条我判它不可用**：`os.clock` 在本机只有 **1 ms 粒度**。同一个 v192 产物，第一次跑（未落盘的那次：`os.clock 49.000 ms`）与落盘这次（`37.000 ms`）差 12 ms ⇒ **噪声大于版本差**。⇒ **初始耗时这一栏我不给结论**，只给"两边的调用次数"（那部分是确定性的，见 §2 复跑）。任何 `os.clock` 行都按此理解：**只能当量级参考**。
**注③ 重要反例**：`render_geom_writes` 的**冷启动第 1 趟几何写 v192=v213=111** ⇒ **v192→v213 没有在"冷启动第一趟 render"上省任何几何写**。这条与 `render_cost` 的"稳态 972→132"并不矛盾：省掉的是**每帧/每次 render 的重复读**，不是冷启动那一趟的必要写。

---

## 4. 轴 2 —— 切屏（页面切换）

| 指标（引擎原语调用次数） | v192 | v213 | Δ | 怎么量的 | 置信度 |
|---|---:|---:|---:|---|---|
| 切到主页后**第 1 帧** | **47** | **3** | **−93.6%** | **实测**，`harness` [C1] | 中高 |
| 主页随后 60 帧（每帧） | **11.73** | **11.00** | −6.2% | **实测**，[C2] | 中高 |
| 切**回关卡**后第 1 帧 | **12329** | **10602** | −14.0% | **实测**，[C3] | 中高 |
| 回关卡随后 60 帧（每帧） | **56.23** | **56.33** | +0.2% | **实测**，[C4] | 中高 |
| 一次完整来回（1+60+1+60 帧） | **16454** | **14645** | **−11.0%** | **实测**，[C5] | 中高 |
| 两个尖峰帧之和 | **12376** | **10605** | −14.3% | **实测**，[C5] | 中 |
| home 屏**稳态** 30 帧（每帧） | **61.9** | **28.9** | **−53.3%** | **实测†** `probe_cold_render.lua switch`，`raw/othersession_probe_cold_render__switch__v192.txt:9` / `__v213.txt:9` | 中高 |
| 切到 select 后 30 帧（每帧） | 26.0 | 26.0 | 0 | **实测†**，同文件 `:10` | 中高 |
| 再切到 home 后 30 帧（每帧） | **65.9** | **37.9** | **−42.5%** | **实测†**，同文件 `:11` | 中高 |
| 切回原屏后 30 帧（每帧） | 16.0 | 16.0 | 0 | **实测†**，同文件 `:12` | 中高 |
| 上述 30 帧里的 `GetChild`（home 稳态） | 870 | **30** | **−96.6%** | **实测†**，同文件 `:9` | 高 |
| 切屏后"强压窗口"重新武装（SetVisible 满额帧） | 33 笔/帧 × 60 帧，主页 8 笔/帧 × 60 帧 | **完全相同** | 0 | **实测**，`vis_write_count.lua` §[3]/[4]、结论表【3】 | 高 |
| `_vis_keynow` 是否随屏变 | `home|…` ↔ `level|…`，396/396 帧非空 | 同 | 0 | **实测**，同上 §[5] | 高 |

逐字关键行（**实测**）：
```
raw/harness_session_ab_probe__v192.txt  [C1] 切到主页后**第 1 帧**：47 次引擎调用（读 25 / 写 22）
raw/harness_session_ab_probe__v213.txt  [C1] 切到主页后**第 1 帧**：3 次引擎调用（读 3 / 写 0）
raw/harness_session_ab_probe__v192.txt  [C3] 切**回关卡**后第 1 帧：12329 次（读 12156 / 写 173）
raw/harness_session_ab_probe__v213.txt  [C3] 切**回关卡**后第 1 帧：10602 次（读 10473 / 写 129）
raw/othersession_probe_cold_render__switch__v192.txt:9   稳态（原屏）30 帧 1856 次（ 61.9/帧）｜SetVisible 160｜GetChildren 745｜GetChild 870
raw/othersession_probe_cold_render__switch__v213.txt:9   稳态（原屏）30 帧  867 次（ 28.9/帧）｜SetVisible 160｜GetChildren 596｜GetChild  30
raw/_wip_vis_write_count__v192.txt:119  【3】切屏(→主页)：重新武装（主页这一屏的 8 个目标值本来就已经满足）
raw/_wip_vis_write_count__v192.txt:132  28 passed, 0 failed        （v213 同：raw/_wip_vis_write_count__v213.txt:132）
```
**口径结论（实测）**：**切屏的"强压窗口重新武装"机制 v192 就已经有了，v192/v213 一字不差**（2162–2173 笔 / 120 帧）。v192→v213 在切屏上的收益**不在可见性同步**，而在 `GetChild`（870 → 30 次 / 30 帧）与主页稳态的整体调用量。

---

## 5. 轴 3 —— 换关（level change / reload）

**离线驱动方式（实测）**：`_G.__murdoku_debug.Murdoku.start("<level_id>")`。
产物内该钩子自述（**引用**，`artifacts/v213.lua` 内 `__murdoku_debug = { adapter = adapter, Murdoku = Murdoku }` 上方注释）：
"离线测试钩子：让 tests/entry_smoke.lua 能直接驱动适配层 … 生产环境无副作用"。
仓库自己的 `tests/_wip/probe_double_bind.lua:150,159` 就是用 `Mu.start("selftest_theft_5x5")` → `Mu.start("case_001")` 做"二次进关"的 ⇒ 本报告用同一机制。

| 指标（引擎原语调用次数） | v192 | v213 | Δ | 怎么量的 | 置信度 |
|---|---:|---:|---:|---|---|
| `Murdoku.start("case_002")` **调用本身** | **45157** | **38841** | **−14.0%** | **实测**，`harness` [D1]（`raw/harness_session_ab_probe__v192.txt:27` / `__v213.txt:27`） | 中 |
| `Murdoku.start("case_003")` **调用本身** | **43168** | **36237** | **−16.1%** | **实测**，[D2]（`:30`） | 中 |
| 换关后**第 1 帧** | **1642** | **1695** / **1670** | +3.2% / +1.7% | **实测**，[D1]/[D2]（`:28`,`:31`） | 中高 |
| 换关后 **60 帧**（每帧） | **88.72** | **73.13** | **−17.6%** | **实测**，[D1]/[D2]（`:29`,`:32`） | 中高 |
| 换关后 60 帧合计 | **5323** | **4388** | **−17.6%** | **实测**，[D1]/[D2] | 中高 |
| 换关 `start()` 的纯 Lua `os.clock` | 49.0 / 42.0 ms | 41.0 / 40.0 ms | ≈ −11% **（噪声级，勿采信）** | **实测**，[D1]/[D2]；粒度 1 ms，见 §3 注② | **低** |
| 可复现性（同产物两次换关） | start 45157 vs 43168；首帧 1642 vs 1642；60 帧 5323 vs 5323 | start 38841 vs 36237；首帧 1695 vs 1670；60 帧 4388 vs 4388 | — | **实测**，[D3]（`:33`） | 高（60 帧账完全一致） |
| 换代后第一趟 render（换关的冷账本那一趟） | 13647 | 11588 | −15.1% | **实测†**，见 §3 | 中高 |
| "二次进关"是否双绑监听器 | 无控件 >3 次 ⇒ **无双绑** | （同探针 v213 输出同） | 0 | **实测**，`probe_double_bind.lua` §[3]/[4] | 中高 |

逐字关键行（**实测**，行号 = `raw/harness_session_ab_probe__v192.txt`；v213 在 `__v213.txt` 同名行）：
```
:27  [D1] Murdoku.start("case_002")：**换关调用本身** 45157 次引擎调用（读 44191 / 写 966），os.clock 49.000 ms；ok=true level=case_002
:28  [D1] 换关后第 1 帧：1642 次（读 1396 / 写 246）
:29  [D1] 换关后 60 帧：5323 次 = 88.72 次/帧
:30  [D2] Murdoku.start("case_003")：**换关调用本身** 43168 次引擎调用（读 42224 / 写 944），os.clock 42.000 ms；ok=true level=case_003
:33  [D3] 两次换关是否可复现：start 调用 45157 vs 43168；首帧 1642 vs 1642；60 帧 5323 vs 5323
     —— v213 对应行：38841（os.clock 41.000 ms）/ 36237（40.000 ms）；首帧 1695 / 1670；60 帧 4388 = 73.13 次/帧（两次相同）
raw/_wip_probe_double_bind__v192.txt:12 ★★ 没有任何控件超过 3 次 ⇒ **本路径下没有双绑** ✓
raw/_wip_probe_double_bind__v192.txt:6-7  [进关1后] bound条目=29  _lookup_gen=2  已注册控件数=29 ／ [进关2后] … _lookup_gen=3 …
```
**注意**：换关 60 帧每帧 88.72（v192）远高于稳态 19.47（§6）⇒ 换关后有一段**高开销窗口**（进关强压窗口 + 冷账本重建）。这一段的 A/B 收益方向与稳态一致，但**幅度小得多**（−17.6% vs −34.0%）。
**注意 2（诚实起见）**：`start("case_002")` 与 `start("case_003")` 在**同一产物内**也有 45157 vs 43168 的差（≈4.4%）⇒ 说明"换关成本"本身**与目标关卡有关**（它是重建整块棋盘/线索）。所以 −14.0% 与 −16.1% 应视为**同一量级**，不要当成两个不同的结论。

---

## 6. 轴 4 —— 每帧运行负载（稳态）

| 指标（引擎原语调用次数） | v192 | v213 | Δ | 怎么量的 | 置信度 |
|---|---:|---:|---:|---|---|
| **稳态每帧调用**（仓库探针，300 帧） | **25.0** | **15.3** | **−38.8%** | **实测**，`perframe_engine_calls.lua` 300 | **高** |
| 其中**写**/帧 | **3.2** | **0.8** | **−75.0%** | **实测**，同上 [1] | 高 |
| 其中**读**/帧 | 21.8 | 14.5 | −33.5% | **实测**，同上 | 高 |
| 幂等几何写 / 300 帧 | **650** | **0** | **−100%** | **实测**，同上 [4] | 高 |
| 稳态每帧调用（本会话补充探针，300 帧） | **19.47** | **12.85** | **−34.0%** | **实测**，`harness` [B] | 中高 |
| 其中写/帧 | 2.39 | **0.03** | −98.7% | **实测**，[B] | 中高 |
| `GetChild` / 帧 | **9.93** | **1.00** | **−89.9%** | **实测**，`perframe` [2] | 高 |
| `GetChildren` / 帧 | 11.15 | 11.15 | 0 | **实测**，`perframe` [2] | 高 |
| `SetVisible` / 帧 | 0.83 | 0.80 | −3.6% | **实测**，同上 | 高 |
| **一次 render 的引擎调用**（稳态、预热后） | **972.0** | **132.0** | **−86.4%** | **实测**，`render_cost.lua` [1] | **高** |
| 一次 render 的 `GetChild` | **840** | **0** | **−100%** | **实测**，同上 [2]/[4] | 高 |
| 一次 render 的 `build_layout` 节点数 | 107 | 96 | −10.3% | **实测**，同上 [3] | 中 |
| 一次 render 的纯 Lua `os.clock` | 2.2–2.8 ms | 1.0–1.4 ms | ≈ −50% | **实测**，[1]（含探针开销） | 低 |
| 一次 render 的 `find`（稳态） | **232** | **63** | **−72.8%** | **实测**，`grid_cost.lua` [A1] | 高 |
| `%30` 点亮块几何写 / 60 稳态帧 | **440** | **0** | **−100%** | **实测**，`geo_write_count.lua` [1]/[3] | 高 |
| 同上（另一探针交叉验证）/ 60 帧 | **300** | **0** | −100% | **实测**，`perframe_throttle.lua` [B2] | 高 |
| `core:view()` 单次 | 0.150 ms | 0.125 ms | −16.7% | **实测**，`grid_cost.lua` [F]（200 次均值） | 中 |
| 300 帧（dt=1/60）总 CPU | **30.0 ms** | **22.0 ms** | **−26.7%** | **实测**，`grid_cost.lua` [E] | 中 |
| 300 帧 `GetChildren` | 22660 | 21734 | −4.1% | **实测**，同上 [E] | 高 |
| 300 帧 render 次数（无变化时） | 5 | 5 | 0 | **实测**，`prop_ledger.lua` §2 | 高 |
| 选关页 `select.visible` 稳态写次数 | 0 | 0 | 0 | **实测**，同上 §4 | 高 |
| 每帧可见性同步（强压窗口外） | 0 笔/帧 | 0 笔/帧 | 0 | **实测**，`vis_write_count.lua` 结论表【2】 | 高 |
| `%30` 点亮块 face 可见性写 / 90 帧 | 75 | 75 | 0 | **实测**，`probe_throttle_cost.lua` [5] | 中高 |

逐字关键行（**实测**）：
```
raw/_wip_perframe_engine_calls__v192.txt:5  总计 7503 次 ⇒ **每帧 25.0 次**（读 6547 / 写 956）
raw/_wip_perframe_engine_calls__v213.txt:5  总计 4595 次 ⇒ **每帧 15.3 次**（读 4347 / 写 248）
raw/_wip_perframe_engine_calls__v192.txt:43 这 300 帧里几何写共 1761 笔：**幂等 650 笔** ✗ / 真变 0 笔 ✓
raw/_wip_perframe_engine_calls__v213.txt:40 这 300 帧里几何写共 2183 笔：**幂等 0 笔** ✗ / 真变 0 笔 ✓
raw/_wip_render_cost__v192.txt:5   5 次 render：平均 **972.0 次引擎调用**，纯 Lua 耗时 **2.800 ms**
raw/_wip_render_cost__v213.txt:5   5 次 render：平均 **132.0 次引擎调用**，纯 Lua 耗时 **1.000 ms**
raw/_wip_render_cost__v192.txt:8       GetChild                    840 次
raw/_wip_render_cost__v213.txt:34  一次 render 里 `GetChild` 共 0 次；按调用点：
raw/_wip_geo_write_count__v192.txt:5   60 帧内：SetSizeDelta 210 笔，SetAnchoredPosition 230 笔（合计 440）
raw/_wip_geo_write_count__v213.txt:5   60 帧内：SetSizeDelta 0 笔，SetAnchoredPosition 0 笔（合计 0）
raw/grid_cost__v192.txt:[A1]  一次 render：find=232（真搜树 0 / 搜空 1）set_property=21 sub=168 view=1
raw/grid_cost__v213.txt:[A1]  一次 render：find=63（真搜树 0 / 搜空 0）set_property=21 sub=168 view=1
raw/grid_cost__v192.txt:[E]  300 帧合计：render 5 次 find=3678（真搜树 44 / 搜空 1183）GetChildren=22660 CPU=30.0 ms
raw/grid_cost__v213.txt:[E]  300 帧合计：render 5 次 find=3670（真搜树 44 / 搜空 1175）GetChildren=21734 CPU=22.0 ms
```
**归因（实测，非推断）**：`GetChild` 840→0 的来源被仓库自己钉住了 —— `tests/sub_miss_cache.lua` 在 v213 上 12/12 通过，绿色断言原文：
"★★ 第 2 次：**一次引擎调用都没有**（按代记住了 ✓ 这就是省下来的那 840 笔 ✓） GetChild 被调 0 次"（`raw/sub_miss_cache__v213.txt:12`）；且"换代之后必须重试"也通过（`:17-18`）⇒ 是**按代负缓存**，不是永久负缓存。
`geo_write_count` 的正向对照两个产物都过（`raw/_wip_geo_write_count__v213.txt:8`："弄错之后**真的写回去了**" ⇒ 0 笔是"不需要写"，不是"没走到"）。

---

## 7. 探针跑不起来 / 红了的逐条记录（**这是发现，不是噪音**）

| 探针 | v192 | v212 | v213 | v216 | 归因 |
|---|---|---|---|---|---|
| `tests/_wip/cursor_latch_count.lua` | **exit 1** | 通过 | 通过 | 通过 | **版本差异**：v192 产物里没有该优化 |
| `tests/_wip/bound_rearm_count.lua` | exit 1 | exit 1 | exit 1 | exit 1 | **探针不兼容全部四个产物** |
| `tests/_wip/ruler_write_count.lua` | exit 1 | exit 2 | exit 2 | exit 2 | 双向不兼容 |
| `tests/sub_miss_cache.lua` | **exit 1** | 通过 | 通过 | 通过 | **版本差异**（v192 无 `_sub_miss`） |
| `tests/overlap_diag_once.lua` | 拒绝出数 | 同 | 同 | 同 | 该改动**已被回退**，四个产物都没有 |
| `tests/dupe_dispatch.lua` / `anchored_pos_guard.lua` / `bound_rearm.lua`(v192) | 拒绝出数 | — | 通过 | — | v192 没有 / 已回退 |
| `tests/perframe_throttle.lua` | **exit 1（4 红）** | — | **exit 0（11 绿）** | — | **真实行为差异** |
| `tests/_wip/ruler_method_exists.lua` | exit 0（7 绿） | — | **exit 1（3 红）** | — | **按设计**：ruler 在 v213 已被删 |
| `tests/_wip/probe_throttle_cost.lua` | **exit 1（1 红）** | exit 1 | exit 1 | exit 1 | 四个产物同一红（稳态仍有非本段写入） |

逐字错误（**实测**，原样粘贴，未做任何改写）：

```
raw/_wip_cursor_latch_count__v192.txt:2
  ✗ 产物里没有 `_cursor` / `rearm_cursor` ⇒ 这是旧产物 ⇒ 量不到（不伪造数字）        [exit 1]

raw/_wip_bound_rearm_count__v213.txt:2
  ✗ 产物里没有 `keep_bindings` ⇒ 这是旧产物 ⇒ 量不到（不伪造数字）                  [exit 1，四个产物全同]

raw/_wip_ruler_write_count__v213.txt:2
  apply_ruler_layout 不在 ⇒ 量不到                                                [exit 2]
raw/_wip_ruler_write_count__v192.txt:31
  [FAIL] ★ 摆正之后**又回到 0 笔**（幂等 ✓）   pos 写 10 笔                        [exit 1]

raw/sub_miss_cache__v192.txt:2
  ✗ 产物里没有 `_sub_miss` ⇒ 旧产物 ⇒ 直接退出（不伪造结论）                        [exit 1]

raw/overlap_diag_once__v192.txt:2
  ⊘ 产物里没有「探一次就记住结论」（`_overlap_diag_no_abs_gen`）⇒ **本环境测不了**
  ⊘ 说明：该改动属于「v205 之后那批改动」⇒ 已随 v212 回退 ⇒ **当前没得测**

raw/perframe_throttle__v192.txt:4
  [FAIL] ★ 调用点用 `~= nil` 守卫过的适配器方法**全都存在**   缺失 1 个：rearm_cursor
raw/perframe_throttle__v192.txt:22
  [FAIL] ★★ 稳态 60 帧几何写 == 0   实测 300 笔
raw/perframe_throttle__v192.txt:25
  [FAIL] ★ `Adapter:apply_ruler_layout` **确实不存在**了   type = function
raw/perframe_throttle__v192.txt:27
  [FAIL] ★ 本帧布局里**没有 `ruler` / `ruler.*` 残留**   发现 ruler
（v213 同一文件 11 passed / 0 failed：raw/perframe_throttle__v213.txt:33）

raw/_wip_ruler_method_exists__v213.txt:5
  [FAIL] ★ 不调 `apply_tray_layout` 也能拿到 `adapter.apply_ruler_layout`   实测 type=nil
raw/_wip_ruler_method_exists__v213.txt:13
  [FAIL] `apply_ruler_layout(5, 5)` 不抛错   tests/_wip/ruler_method_exists.lua:206: attempt to call a nil value (method 'apply_ruler_layout')
```

**归类**：
* **探针不兼容**（.新 API 名字 / 新版布局假设）：`bound_rearm_count.lua`（找 `keep_bindings`，四个产物都没有 ⇒ **这条探针比 v216 还新**，切屏/换关的"重新绑定"这一轴**用它在任何产物上都量不到**）。
* **版本差异**（预期内，不算回归）：`cursor_latch_count` / `sub_miss_cache` 对 v192 红；`ruler_write_count` / `ruler_method_exists` / `perframe_throttle` C 段对 v213 红（ruler 已被有意删除，`perframe_throttle` 的反向哨兵正是要求它不存在）。
* **真实行为差异**：`perframe_throttle.lua` 在 v192 上 4 红、v213 上 11 绿 ⇒ 与 §6 的 440→0、`rearm_cursor` 缺失互相印证。
* **两边都红**（与本次 A/B 无关，但别误读成 A/B 结论）：`probe_event_table.lua`、`probe_event_slots_independent.lua`（B2 事件认领，v192/v213 输出逐字节同长）。
* **探针自身的印刷错误（值得记）**：`ruler_cost.lua` 的判读行是**写死的字符串**，v213 上打出"apply_ruler_layout 每帧 0.00 次 ⇒ **在每帧路径上**"（`raw/_wip_ruler_cost__v213.txt:10`）—— 这是探针文案 bug，不要当结论。

---

## 8. 本环境**测不到**的东西，以及为什么

1. **引擎原语的真机毫秒（wall-clock）—— 拿不到。** 本机**没有引擎时钟**：所有离线探针都在 Lua 里用假控件记账，量的是"调用次数"。仓库自己也把这条写进了探针尾部（`raw/_wip_perframe_engine_calls__v192.txt:58`："本探针量的是**引擎原语的调用次数**，不是毫秒（本机无引擎时钟 ✓）"）。**真机耗时只能靠真机 trace / 帧率采样。** 本报告的 `os.clock` 数字全部是**纯 Lua CPU 时间**，且**含探针自身的计数开销**（`render_cost` 里每个 render 有 132–972 次调用被包了一层表操作），只能看**同口径比值**。
2. **GPU / 渲染管线 / draw call** —— 测不到。假引擎没有渲染器。
3. **真机控件树形状与假树的差异** —— 测不到。`grid_cost.lua` 自己就承认一部分失败写入是"**假树形状造成**"（`raw/grid_cost__v192.txt` [I]："其它（**假树形状造成**：这个假树的 cell 下没有 wall.* 子控件）：63 次"）⇒ 假树与真机不完全同构，**绝对计数有系统性偏差**（A/B 偏差同向，故比值仍可用）。
4. **切屏/换关的"真机重进"**（引擎真的重建控件 ⇒ 换代）—— 只能**近似**：本报告用 `_lookup_gen` 换代 + `Murdoku.start()` 模拟。仓库另一探针也把它标注为"模拟"：`raw/othersession_probe_cold_render__v192.txt:11` "`_lookup_gen`：1 → 2"、"★ 换代后第一趟（冷）"。
5. **`rearm_cursor` / rebinding 成本** —— 见 §7：唯一针对它的探针在四个产物上都拒绝出数。
6. **多设备/多分辨率下的成本** —— 未做（假引擎固定 1600×900，`game.GetUICanvasSize()` 返回常量）。
7. **真机上的绝对帧预算占用** —— 未做。唯一沾边的是 `grid_cost` 的换算："单次 0.125 ms；若**每帧**多调一次，60fps 下就是 0.7% 的帧预算"（`raw/grid_cost__v213.txt` [F]），这是**探针给的换算示例**，不是真机测量。

---

## 9. 哪个 harness 能离线驱动 **换关** / **切屏**？

**结论：有，但仓库的四个"性能"探针里一个都不能；能用的是"行为类"探针 + 产物自带的调试钩子。**

| 路径 | 能否离线驱动换关 | 能否离线驱动切屏 | 证据（**实测**） |
|---|---|---|---|
| `_G.__murdoku_debug.Murdoku.start("<level_id>")` | **能** | — | 本会话 `harness/session_ab_probe.lua` [D] 用它换到 `case_002`/`case_003`，`ok=true level=case_002`（`raw/harness_session_ab_probe__v192.txt`）。产物内钩子自述"离线测试钩子…生产环境无副作用" |
| `controller.screen = "home"` / `= nil` + `dirty=true` | — | **能** | 本会话 `harness` [C]；仓库 `tests/_wip/vis_write_count.lua:540,561,667,705` 同一手法 |
| `tests/_wip/probe_double_bind.lua` | **能** | 顺带（"退出到选关"） | `probe_double_bind.lua:150,159`：`Mu.start("selftest_theft_5x5")` → `Mu.start("case_001")`；输出 `raw/_wip_probe_double_bind__v192.txt:6-7`（进关1 `_lookup_gen=2` → 进关2 `_lookup_gen=3`） |
| `tests/_wip/vis_write_count.lua` | 不能（只换屏） | **能**（level↔home↔level，含重新武装验证） | `raw/_wip_vis_write_count__v192.txt:119-128` |
| `tests/_wip/probe_throttle_cost.lua` | **不能**（§[4] 实际做的是"模拟 ensure_widgets 抢值"） | **能**（level→select） | `raw/_wip_probe_throttle_cost__v192.txt:36-40` |
| `tests/board_wiring_e2e.lua` | **不能** | 不能 | 它 `require("murdoku_core")` / `require("ui_controller")` ⇒ 跑的是**仓库 lua/ 源码树**，不是产物（`board_wiring_e2e.lua:26-28`）⇒ **无法 A/B 两个产物** |
| `tests/grid_cost.lua` | 不能 | 部分（它测的是"选关页兜底隐藏"的每帧账） | `raw/grid_cost__v213.txt` [H] |
| `tests/entry_smoke.lua` | 不能（只 OnInit→OnStart→OnUpdate→OnDestroy 走一遍入口） | 不能 | `entry_smoke.lua:1-18` 头部注释 |
| `tools/sim/play_test.mjs` | 需要**模拟器宿主**（不是离线） | 需要**模拟器宿主** | 它把 **Lua 文件路径当 `argv[2]`**（`play_test.mjs:20`）⇒ 技术上**可以指向任一产物**；但 `kit.mjs:21-24` 的 `makeController()` 是 `import` DSH 模拟器插件（`dsh-plugin-beyond-simulator`）⇒ 必须有活着的模拟器。A/B 历史输出见 `raw/cited_ab_out-v192.utf8.txt` / `out-v206*.utf8.txt`（**引用**，非本会话产出，见 §11） |
| `tools/sim/probe_levels.mjs` | **能**（需要模拟器宿主） | **能**（需要模拟器宿主） | 头部自述（**引用** `probe_levels.mjs:1-9`）："验证「选关 / 切关」在运行时真的能用 —— 右栏「返回列表」→ 打开选关面板 · 点某一关 → 立刻切过去 … · 结算面板的「下一关」"。它硬编码 `dist/client_script.lua`（无 argv）。**本会话没有跑它**（见下） |
| `tools/sim/kit.mjs:enterLevel()` | **能**（真实流程：点 `home.select` → 点 `select.card.N`） | **能** | `kit.mjs:354-357`。注释自述"正确做法就是**真的走一遍主页流程**：点「选关」→ 点第 1 张卡片" |
| `tests/_wip/probe_level_edges.lua` | **不能**（纯离线，但只算四关的墙/门边数据，`require("murdoku_core")` 走源码树） | 不能 | `probe_level_edges.lua:26-35` |

**为什么本会话没有用模拟器那条路**：`makeController()` 起的是**会话级模拟器**（同一份工作区内存态，`play_test.mjs:13` 自述"模拟器状态是**内存态**：建树和试玩必须在同一个进程里做完"），而我这次的任务边界是"**在 git 仓库上只读、只写 `perf-compare-192-213\`**"。起模拟器会改动共享的运行时状态、并可能覆盖 `tools/sim/out/*`，**超出授权**。⇒ 换关/切屏这一档，本报告给出的全部是**离线**数字（§4/§5）；模拟器路径**存在且更接近真机**，但**本会话未验证**（标为推断层面：从代码与注释可读出的能力，不是我在本会话量到的结果）。

⇒ **性能轴上"换关"这一档，仓库原有的性能探针全都不能驱动它**（`perframe_engine_calls` 只跑单一会话的稳态；`render_cost` 只量单次 render）。本报告的换关数字来自**本会话新写的 22 行驱动代码**（`harness/measure_part2.lua` [D] 段），机制与 `probe_double_bind.lua` 完全一致。

---

## 10. 一页速览（Δ 只列 v192→v213）

```
初始    : OnInit 321 → 321 (0)｜OnStart 40288 → 35733 (−11.3%)｜初始合计 40609 → 36054 (−11.2%)
          换代后第一趟 render 13647 → 11588 (−15.1%)｜第 1 帧 1427 → 1388 (−2.7%)
切屏    : 切到主页第 1 帧 47 → 3 (−93.6%)｜切回关卡第 1 帧 12329 → 10602 (−14.0%)
          完整来回 16454 → 14645 (−11.0%)｜home 屏稳态 61.9 → 28.9 次/帧 (−53.3%)
换关    : start() 45157/43168 → 38841/36237 (−14.0% / −16.1%)｜换关后 60 帧 88.72 → 73.13 次/帧 (−17.6%)
每帧    : 25.0 → 15.3 次/帧 (−38.8%)｜写 3.2 → 0.8 (−75%)｜幂等几何写 650 → 0
          一次 render 972.0 → 132.0 (−86.4%)｜GetChild 840 → 0｜稳态 find 232 → 63 (−72.8%)
          %30 几何写 440 → 0 / 60 帧｜300 帧 CPU 30.0 → 22.0 ms
未变    : 冷启动第 1 趟几何写 111 = 111｜切屏强压窗口重新武装 一字不差｜300 帧 render 5 = 5
不可判  : 任何 os.clock / 真机毫秒（粒度 1 ms 或根本没有引擎时钟）
```

---

## 11. `raw/` 文件来源（**请勿把我的数字和别人的混起来**）

| 前缀 | 谁产的 | 是否我本会话实测 |
|---|---|---|
| `raw/_wip_*`, `raw/perframe_throttle__*`, `raw/anchored_pos_guard__*`, `raw/bound_rearm__*`, `raw/dupe_dispatch__*`, `raw/grid_cost__*`, `raw/overlap_diag_once__*`, `raw/prop_ledger__*`, `raw/sub_miss_cache__*` | **本会话我**跑仓库自带探针 | ✅ 是 |
| `raw/harness_session_ab_probe__*` | **本会话我**跑我新写的补充探针 | ✅ 是 |
| `raw/rerun_*` | **本会话我**的稳定性复跑 | ✅ 是 |
| `raw/othersession_probe_cold_render__*` | 探针文件（`probe_cold_render.lua`）由**同一工作区另一个并发会话**写的；**执行者是我**，产物路径用的是我 staged 的 `artifacts/` | ⚠️ 我执行；探针作者不是我 |
| `raw/cited_ab_*.txt`（含 `.utf8.txt`） | 从 `qianxing-murdoku\tests\_wip\ab\out-v192*.txt` / `out-v206*.txt` **复制**来的（原文件是 UTF-16LE，我另存了 UTF-8 副本以便阅读） | ❌ 引用 |
| `raw/cold_render__*`, `raw/cold_and_switch__*`, `raw/perframe_engine_calls__*`, `raw/render_cost__*`（**不带** `_wip_` 前缀的那批） | **另一个并发会话**直接写进本目录的（探针被它拷贝/改写成 `perf-compare-192-213\probe_cold_render.lua`，产物取自 `%TEMP%\murdoku-ab\`） | ❌ 不是我跑的，我**未**采信其数字 |

**交叉验证（诚实起见）**：我独立跑的仓库探针 `render_cost` [1] 给 `972.0 / 132.0` 次调用，与并发会话 `raw/cold_render__v192.txt:5` / `__v213.txt:5` 的 `972.0 / 132.0` **完全一致**；我的 `perframe_engine_calls` 与它的同类输出在**每帧 25.0 / 15.3** 上一致（它的文件是默认 60 帧，我按要求用 300 帧，故方法明细更短）。⇒ 两套独立执行互证。

**引用到的仓库内文件**（未复制进 `raw/` 的）：
* `qianxing-murdoku\tests\_wip\README.md`（探针可信度规矩）
* `qianxing-murdoku\tests\_wip\perframe_engine_calls.lua:24,118-149,181-191`（跑法；假树形状；`loadfile(arg[1])`）
* `qianxing-murdoku\tests\_wip\probe_double_bind.lua:150,159`（离线二次进关）
* `qianxing-murdoku\tests\board_wiring_e2e.lua:26-28`（走源码树 ⇒ 不能 A/B 产物）

**项目自己的硬规矩（引用，`tests/_wip/perframe_engine_calls.lua:4-10`）**：
> "ruler 那次我用'自己造的假控件'记账 ⇒ 产线写的是**它自己树里的对象** ✗ ⇒ 计数恒 0 ⇒ 我白绕了三圈"
> "★ 本探针的口径 ✓：**启动之后**，遍历**产线自己那棵树**…"
本报告遵守该规矩：所有计数都发生在**产线源码调用路径**上；**但**假树本身是手搭的（该仓库全部探针都如此），所以 §8 第 3 条的系统性偏差必须跟着数字一起读。
本会话新写的补充探针为规避"后包的被先包的挡住"，**只包一层**：直接包 `PROTO`（控件方法原型表）⇒ 连产线在 `OnInit` 里 `Instantiate` 出来的控件也一并计到（这是仓库探针在启动期**数不到**的那一段，也正是 §3 能给出 `OnStart` 数字的原因）。
