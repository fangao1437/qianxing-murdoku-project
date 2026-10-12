# v192 → v213 mechanism-level diff (千星奇域 2D+Lua client bundle)

> ## ⚠️ 更正（2026-10-12 晚，用户指正后加）—— 本文件的**代码结论全部有效**，但两处**性能归因**要改
>
> 本文件的**代码事实**（哪些函数/调用点/守卫/死代码在或不在、行号、计数、块配对）**不受影响，仍然有效** ✗✓
> —— 它们是逐字节从产物里读出来的，与任何假树无关。
>
> 但要改的两处**性能归因**：
> 1. **§2.2 / §4.4「`_sub_miss` 省下 840 笔 `GetChild`」不成立**：那 840 笔来自探针**假树漏了真存档里有的 8 个边控件**
>    （`wall.*`/`door.*`，父＝`content`，见 `qianxing-murdoku\347.gil`）。把树修忠实后，**v192 与 v213 的
>    稳态 render 都是 111 笔，`GetChild` 两版都是 0**。
> 2. **`GetSizeDelta 21/render`（§4.6 附近引用）同样是假树的账**：忠实树下**两版都是 0**。
>
> ⇒ `_sub_miss` 的**代码语义**（按代记忆、换代必须重试、不会退回永久负缓存）依然如本文件所记 ✓；
> 只是它**在 wall/door 这条路上买不到可测收益**。
> 详见 `对比报告-v192-vs-v213.md` 第 2 版 §0 全节。

Read-only archaeology. No repo was modified, checked out, staged or committed.
Everything written by this analysis is under `perf-compare-192-213/` (`work/` holds scratch extracts, diffs and two probe scripts).

Evidence convention used throughout:

* **实测** = I directly observed it in the file, with artifact + line.
* **推断** = my reading of intent / consequence. Never presented as observed.

---

## 0. Orientation

### 0.1 Identity of the staged artifacts (实测)

| artifact | sha256 (first 8) | bytes | LF lines |
|---|---|---|---|
| `artifacts\v192.lua` | `32DFC2AF` | 1 168 700 | 19 899 |
| `artifacts\v212.lua` | `D4C0B894` | 1 189 277 | *n/a — not diffed* |
| `artifacts\v213.lua` | `4054178B` | 1 196 532 | 20 175 |
| `artifacts\v216.lua` | `27D7D21B` | 1 204 600 | *n/a — not diffed* |

Build markers: `v192.lua:19185`, `v213.lua:19461` (both inside `check_canvas()`).

### 0.2 LINE-NUMBER HAZARD — read this before diffing these files with PowerShell (实测)

Both bundles contain **4 lone `CR` (0x0D) bytes that are not part of a `CRLF`**:

* v192: byte offsets 766027, 770264, 774044, 779865
* v213: byte offsets 780825, 785062, 788842, 794663

`Get-Content` and `Select-String` treat a lone CR as a line break, so **their line numbers are inflated by up to 4** versus LF-based numbering (which is what the `read` tool, `grep`/ripgrep, and Lua's own lexer use). All 4 lone CRs sit inside level-data modules (v192 ≥ 18579, v213 ≥ 18855), so every line number I cite in the code modules is unaffected — but the build marker is `Get-Content` 19189 vs LF 19185, and anyone diffing the level tables will silently mis-cite lines. Canonical numbering in this document = **LF-based**.

**Second trap (实测):** the in-file comments cite **unbundled source** line numbers (`lua/main.lua`, `lua/murdoku_core.lua`, …), not bundle lines — e.g. v213:2745 says `parse_grid_literal　原 L2594..L2604` while the function actually sits at bundle line 2752 in v192. Never resolve a comment's `L####` against the bundle.

### 0.3 Module boundaries (实测, from `__M["name"] = function()` markers, LF-based)

| module | v192 range | v213 range | line delta |
|---|---|---|---|
| `room_map` | 22–157 | 22–157 | 0 |
| `murdoku_core` | 158–2986 | 158–2972 | −14 |
| `ui_controller` | 2987–10228 | 2973–10248 | +6 |
| `engine_adapter` | 10229–10390 | 10249–10410 | +20 |
| `engine_adapter_qianxing` | 10391–16049 | 10411–16185 | +156 |
| `main` | 16050–18376 | 16186–18652 | +116 |
| `levels.init` | 18377–18497 | 18653–18773 | 0 |
| `levels.demo_selftest` | 18498–18595 | 18774–18871 | 0 |
| `levels.case_001` | 18596–18718 | 18872–18994 | 0 |
| `levels.case_002` | 18719–18842 | 18995–19118 | 0 |
| `levels.case_003` | 18843–19001 | 19119–19277 | 0 |
| `entry_client_script` | 19002–19899 | 19278–20175 | +2 |

**实测 correction to the stated premise:** the real bundle order is `room_map → murdoku_core → ui_controller → engine_adapter → engine_adapter_qianxing → main → levels.* → entry_client_script`, not the order listed in the brief. `room_map` is first because `murdoku_core:277` does `local RoomMap = __require("room_map")`.

### 0.4 Per-module diffstat (实测, LF-based; sums exactly to the whole-file 625/349)

| module | insertions | deletions | nature |
|---|---|---|---|
| `room_map` | 0 | 0 | byte-identical |
| `murdoku_core` | 12 | 26 | **dead code + comments only** |
| `ui_controller` | 57 | 23 | 4 real hunks |
| `engine_adapter` | 0 | 0 | byte-identical |
| `engine_adapter_qianxing` | 220 | 104 | 11 real hunks |
| `main` | 335 | 195 | per-frame optimisation + ruler removal |
| `levels.*` (all 5) | 0 | 0 | byte-identical |
| `entry_client_script` | 1 | 1 | **build-marker string only** |
| **total** | **625** | **349** | ✓ matches the overview |

**实测 — the diffstat is misleading on two modules.** `murdoku_core`'s 12/26 is *purely* two dead functions being replaced by explanatory comments:

* `Core:who_is_alone_with_victim` — **present in v192 at bundle line 1823**, replaced in v213 by a comment block at 1823–1830.
* `M.parse_grid_literal` — **present in v192 at bundle line 2752**, replaced in v213 by a comment block at 2745–2753.

⚠️ The comments name the *unbundled source* line numbers, not bundle lines: v213:1823 says `原 L1664..L1677` and v213:2745 says `原 L2594..L2604`. Those refer to `qianxing-murdoku\lua\murdoku_core.lua`, which is a different numbering from the bundle. I verified the actual bundle positions by grep: every one of `who_is_alone_with_victim`, `parse_grid_literal`, `solution_from_grid_literal` and `walls_from_ascii` has **zero call sites in both artifacts** — only a definition (v192) or a comment (v213).

`murdoku_core` therefore has **zero behavioural difference** between v192 and v213; it is the clearest example of why the diffstat cannot be read as cost. Note also that `solution_from_grid_literal` and `walls_from_ascii` were already deleted *before* v192 — their "已删" comments are byte-identical in both files (v192:2764/2768, v213:2744/2754) — so they are not part of this diff.

`entry_client_script`'s 1/1 is the build-marker `print()` text (v192:19185 → v213:19461). The boot path itself — `OnInit`/`OnStart`/`OnUpdate`/`OnDestroy`, `build_adapter`, `check_canvas`, `probe_or_dump`, and `KEY_SPEC` (**24 key events**, v192:19724–19746) — is **byte-identical**.

---

## 1. 初始 (startup / first render)

### 1.1 The boot path itself is unchanged (实测)

`entry_client_script` differs by one string. `bind_keys` (adapter v192:15376 / v213:15512), `KEY_SPEC` (24 keys), `build_adapter`, `check_canvas` and the `OnInit`/`OnStart` sequence are **identical** — I confirmed the adapter module has no `bind_keys` hunk at all.

### 1.2 What DOES change at startup: the ruler control set is not built (实测)

v192 `Controller:build_layout` pushes **`1 + cols + rows` extra controls**:

```lua
-- v192.lua:5954
push({ id = "ruler", kind = "container", parent = "board", rect = rect_of(L.board), style = "ruler" })
-- 列标尺
for c = 1, vm.cols do
  push({ id = "ruler.c." .. c, kind = "text", parent = "ruler", ... })     -- v192.lua:5957
end
-- 行标尺
for r = 1, vm.rows do
  push({ id = "ruler.r." .. r, kind = "text", parent = "ruler", ... })     -- v192.lua:6025
end
```

v213 has **no** `id = "ruler"` push anywhere — the only surviving mention is a comment:

```lua
-- v213.lua:5959
--     ① 容器 `ruler`（`push({ id = "ruler" … })`）
```

Code-only occurrence count of `id = "ruler`: **v192 = 3 (all code: 5954, 5957, 6025) / v213 = 0 code (1 comment at 5959)**.

**Cost:** 11 extra planned nodes for a 5×5 level, 13 for 6×6, 15 for 7×7 — each is a `create_control` attempt at first render and a `_note_missing` entry when the template/archive control does not exist. This is a **pure startup/level-load saving, not a per-frame one**.

### 1.3 `apply_ruler_layout` calls removed from both `render` and `start` (实测)

v192 `Murdoku.render` re-aligned the ruler labels after **every** render:

```lua
-- v192.lua:16137–16146
function Murdoku.render(force)
  if current == nil then return end
  current.controller:render(current.adapter, force)
  local a = current.adapter
  if a ~= nil and a.apply_ruler_layout ~= nil then
    local core = current.controller.core
    a:apply_ruler_layout((core and core.rows) or 5, (core and core.cols) or 5)
  end
end
```

v213 keeps only the `render` call (v213:16428–16432). And v192 `Murdoku.start` had a second call at 16641–16646.

Code-only occurrence count of `apply_ruler_layout`: **v192 = 5 (definition 13044; `render` 16141/16143; `start` 16641/16646) / v213 = 0** (all 13 remaining mentions are comments).

**实测 cost consequence — but see §6.1:** in v192 the method began with `local ruler = self:find("ruler"); if ruler == nil then return 0 end` (v192:13046–13047), so with the declared-but-uninstantiated ruler it returned immediately. The saving is 1 cross-module call + 1 `find` per render, not a full alignment pass.

### 1.4 `enable_cursor` now latches at convergence (实测) — affects startup directly

v192 `Adapter:enable_cursor` (def 13218) had no early-out and was called every 20 frames forever (`main` v192:16887–16889), plus once at `Murdoku.start` (v192:16404–16405).

v213 adds a convergence latch (def 13225):

```lua
-- v213.lua:13244
if self._cursor ~= nil and self._cursor.done then
  return self._cursor.n or 0          -- ★ 收敛后：一次树都不走 ✓
end
...
-- v213.lua:13307
if st.idle >= 3 then
  st.done = true
```

Code-only `self._cursor` counts: **v192 = 2 (both `self._cursor_line`, a log-throttle string at 13262/13263 — *not* a state table) / v213 = 10 (the latch state)**. So the state table is **NEW in v213**; v192 has no equivalent.

**Cost:** v192 pays 12 `find` + 12 unconditional `ctrl.showCursor = true` engine writes + 12 `find` + up to 4 property reads per container + a `table.concat`, **3×/second, forever**. v213 pays that 3 times total, then zero.

### 1.5 `bind_input` latch changed from boolean to object-keyed (实测) — startup-relevant, level-change-critical

v192 (def 15195):

```lua
-- v192.lua:15203–15204
self.bound = self.bound or {}
if self.bound[id] then return end          -- 防重复绑定
...
-- v192.lua:15210
self.bound[id] = true
```

v213 (def 15263):

```lua
-- v213.lua:15309
local prev = rawget(self.bound, id)
if prev == ctrl then return end            -- ★ 同一个控件已经绑过 ⇒ 早退（★ 防双绑 ✓）
...
-- v213.lua:15334
self._bound_ctrl = self._bound_ctrl or setmetatable({}, { __mode = "k" })
if self._bound_ctrl[ctrl] then
  self.bound[id] = ctrl
  return
end
...
-- v213.lua:15345
self.bound[id] = ctrl                      -- ★ 记的是**对象** ✗ 不是 `true` ✓
self._bound_ctrl[ctrl] = true
```

Code-only counts: `self.bound` **v192 = 5 / v213 = 6**; `self.bound[id] = ctrl` **v192 = 0 / v213 = 2**; `_bound_ctrl` **v192 = 0 / v213 = 4**.

**实测:** neither version clears `bound` inside `invalidate_lookups`. The only pre-existing clear is in `destroy_control` (`self.bound[id] = nil`, v192:13718 / v213:13786), which is **identical in both**. So v192's latch survives a generation change only if the engine *replaces the control object* — and a boolean latch cannot tell "same object, re-bound" from "new object, must re-bind". That is precisely the correctness gap v213 closes.

### 1.6 First `render`: the per-frame closure/string problem exists at boot too (实测)

See §4.2. Additionally, in v192 `dprint` was a **global** function assigned inside `on_update` every frame:

```lua
-- v192.lua:16981–16983
function dprint(...)
  if Murdoku.DIAG then print(...) end
end
```

In v213 it is file-level (v213:16243–16245), i.e. **before** `on_update` starts at 17069. Code-only `dprint` counts are 18 in both, but v192's first hit (16981) is *inside* `on_update` (16775–18206) while v213's (16243) is *outside* it.

Same story for `snap_visible`:

* v192: `local function snap_visible()` at **17360**, inside `on_update`; call at 17441.
* v213: definition at **16249**, file-level; call at 17666.

**Cost:** v192 creates 1 closure + writes 1 global-table entry per frame; v213 creates 0. Note `snap_visible`'s body only ever runs under `Murdoku.DIAG` (default `false`, v192:16974 / v213:17268), so in v192 that closure is **100 % waste in steady state**.

---

## 2. 切屏 (page / screen switch)

### 2.1 The generation trigger block is IDENTICAL in both versions (实测) — this is the headline

`Controller:render` (v192:9732, v213:9736) opens with the authoritative generation check. The block is line-for-line the same except for the v213 addition in §2.2:

```lua
-- v192.lua:9748–9758   ==   v213.lua:9752–9762
do
  local lv_id = self.core and self.core.level and self.core.level.id
  if self._tree_screen ~= self.screen or self._tree_level ~= lv_id then
    self._tree_screen = self.screen
    self._tree_level = lv_id
    if adapter ~= nil and adapter.invalidate_lookups ~= nil then
      pcall(function()
        adapter:invalidate_lookups("screen=" .. tostring(self.screen)
          .. " level=" .. tostring(lv_id))
      end)
    end
```

**So "切屏" and "换关" produce a new generation through exactly the same predicate in v192 and v213.** What changes is not *when* a generation is created — it is **what a generation is used for**.

### 2.2 What a generation is FOR: diagnostics in v192, a cache key in v213 (实测)

**This is the single most important item in the whole diff.**

v192 increments `_lookup_gen` and uses it only to print a log line:

```lua
-- v192.lua:10814–10818
self._lookup_gen = (self._lookup_gen or 0) + 1
if self.cfg and self.cfg.debug_lookup and print then
  print(PREFIX .. "控件名缓存作废（第 " .. tostring(self._lookup_gen) .. " 代）："
    .. tostring(why))
end
```

The declaration says so explicitly: `self._lookup_gen = 0     -- 第几代（只用于日志/诊断）` (v192:10531, identical text at v213:10551).

Code-only `_lookup_gen` occurrences:

* **v192 = 4** → 10531 (init), 10814 (`_lookup_gen` read + write on the same line), 10816 (log). **No consumer.**
* **v213 = 7** → 10551 (init), 10837 (increment), 10839 (log), **10953 (miss-cache compare)**, **11019 (nil guard)**, **11021 (stamp write)**.

So in v213 the generation number becomes a real cache key for the `Adapter:sub` miss memory. In v192 it is a counter with a `print()` attached.

### 2.3 `Adapter:sub` — three-level fallback identical; per-generation miss memory NEW (实测)

Three-level fallback (`GetChild` → `cfg.cells.sub_roots` → `FindChild`) is **present and structurally identical in both** — documented at v213:10970–10974 and implemented at v192:10896+ / v213:10947+.

The "cache hits only, never cache misses" rule is stated verbatim in v192:

```lua
-- v192.lua:10770–10772 (module-relative v192.lua:10770)
-- ★ 2026-09-25 修正：**只缓存命中，绝不缓存未命中**。
--   旧实现在查不到时写 self.subs[key] = false，于是"UI 就绪前查过一次"就会
--   让这个子控件**永远取不到** …
```

and the tail of v192's `sub` is simply:

```lua
-- v192.lua:11112 (end of Adapter:sub)
if hit ~= nil then self.subs[key] = hit end
return hit
```

v213 keeps that rule **and adds a generation-stamped miss memory**:

```lua
-- v213.lua:10948–10955  (head of Adapter:sub)
do
  local miss = self._sub_miss
  if miss ~= nil then
    local mk = parent_id .. "." .. child_name
    if miss[mk] == self._lookup_gen then return nil end
  end
end
...
-- v213.lua:11013–11023  (tail)
if hit ~= nil then
  self.subs[key] = hit
else
  if self._lookup_gen ~= nil then
    self._sub_miss = self._sub_miss or {}
    self._sub_miss[key] = self._lookup_gen
  end
end
```

Code-only `_sub_miss`: **v192 = 0 / v213 = 8** (init 10607; read 10950; guard 11020/11021; `cell.*`-prefix clear 12730/12731/12733).

**实测 — the design deliberately keeps the old safety property.** The stamp lives in a **separate table** (`_sub_miss`), never in `self.subs`, so the historical bug (`subs[key] = false` ⇒ permanently unreachable sub-control) cannot return. It also correctly survives generation change for free: `_lookup_gen` changes ⇒ every stamp mismatches ⇒ the memory is void. The author does **not** clear `_sub_miss` in `invalidate_lookups` (verified: `_sub_miss` does not appear in the 10826–10844 body), relying on the stamp — consistent with `Adapter.new`'s comment at v213:10605–10607 that this is "**不是**负缓存".

Additionally v213 clears only the `cell.` prefix of `_sub_miss` inside `ensure_cells`, mirroring the existing `self.subs` clear:

```lua
-- v213.lua:12730–12734
if self._sub_miss ~= nil then
  for k in pairs(self._sub_miss) do
    if type(k) == "string" and k:sub(1, 5) == "cell." then
      self._sub_miss[k] = nil
```

### 2.4 `apply_screen_hide` scans one fewer prefix (实测)

```lua
-- v192.lua:4774
PREFIX = { "clue.", "hud.", "room.label.", "ruler", "tray.", "action.", "hex.", "hit.",
-- v213.lua:4776
PREFIX = { "clue.", "hud.", "room.label.", "tray.", "action.", "hex.", "hit.",
```

`"ruler"` was removed from the screen-hide prefix list. This is a per-node × per-prefix string-prefix comparison on the screen-switch path only. Small, real, and directly attributable to the ruler retirement.

### 2.5 One NEW engine-interface call on every generation change (实测, cost-increasing)

v213 adds a cursor re-arm inside the same generation block:

```lua
-- v213.lua:9789–9794
if adapter ~= nil and adapter.rearm_cursor ~= nil then
  pcall(function()
    adapter:rearm_cursor("screen=" .. tostring(self.screen)
      .. " level=" .. tostring(lv_id))
  end)
end
```

with the definition at v213:13327 and an early-out at 13330 (`if not st.done and st.idle == 0 and st.n == 0 then return end`). `rearm_cursor` code occurrences: **v192 = 0 / v213 = 3** (guard 9789, call 9791, definition 13327).

**推断:** this is the price of §1.4's latch — without it, `home`/`select` (created on first render) could never get `showCursor` after convergence. It is a correctness guard, not a regression, but it *is* one extra cross-module call + string concat per screen/level switch.

---

## 3. 换关 (level change / reload)

### 3.1 The four `invalidate_lookups` call sites are IDENTICAL (实测)

| trigger | v192 | v213 |
|---|---|---|
| grid `RefreshItems` finished | 7734 | 7738 |
| `(screen, level_id)` changed in `Controller:render` | 9755 | 9759 |
| `create_control` | 11047 | 11116 |
| `destroy_control` | 13722 | 13790 |

Body text is identical in all four, e.g. `self:invalidate_lookups("create:" .. tostring(node.id))` (v192:11047 = v213:11116) and `self:invalidate_lookups("destroy:" .. tostring(id))` (v192:13722 = v213:13790). Code-only `invalidate_lookups` = **7 in both**.

`invalidate_lookups` itself is byte-identical in the two versions apart from where the counter is used:

```lua
-- v192.lua:10804–10814   ==   v213.lua:10827–10837
self._misses = nil
self.controls = {}
self._subtree_dirty = true
self._lookup_gen = (self._lookup_gen or 0) + 1
```

**实测 conclusion:** level change produces the **same number of generations**, clears the **same three caches**, and re-searches `find` the **same way** in v192 and v213. The `_misses` negative cache in `find` (v192:10828–10877, v213:10851–10900, with TTL + `false` = "do not re-search this generation") is byte-identical.

### 3.2 Where 换关 actually gets cheaper: `Adapter:sub` misses stop being re-attempted (实测)

The v213 comment records the measurement this change is built on (v213:11010–11013 in the module's own numbering; the block quoted below starts at **v213:10989**):

```
--   ★ 实测（`tests/_wip/render_cost.lua` …）：
--     ★ **一次 render = 972 次引擎调用** ✗ ★ 其中 **`GetChild` 840 次**
--     ★★ 而 **`sub` 每次 render 被调 168 次，命中缓存【0】次** ✗
--       （键是 `cell.R.C.wall.up/down/left/right` 这类 ✓ —— **模板里根本没配这些子控件** ✓）
```

**推断 (cost):** the `cell.*.wall.*` sub-lookups are per-cell and per-level; on a 7×7 level there are up to 49 cells × 4 directions = 196 never-succeeding lookups, each costing ~6 `GetChild` calls, and in v192 they are re-attempted **on every render, in every level**. In v213 the first attempt of a generation stamps them and every later render in that same level short-circuits to `return nil`. Because a level change bumps `_lookup_gen`, the next level gets a clean slate — so the saving applies to steady-state frames **within** a level, not to the level-load frame itself.

### 3.3 换关 rebuilds fewer controls (实测)

Ruler removal (§1.2) means a level load in v213 plans and creates `rows + cols + 1` fewer nodes (11/13/15 for 5×5/6×6/7×7). Because `apply_screen_hide`'s `PREFIX` no longer contains `"ruler"`, the hide sweep also does one fewer prefix test per node per level load.

### 3.4 `ensure_cells` clears `_sub_miss` for `cell.` (实测) — level-change correctness

Quoted in §2.3. Rationale (v213:12724–12726): *"建格/改名之后，'这个名字取不到'的结论可能不再成立"*. This is the level-load-time counterpart of the generation stamp: it covers the case where `ensure_cells` renames/instantiates cells **within** one generation.

### 3.5 `bind_input` on level re-entry — the functional bug (实测 + 推断)

**实测:** v192's latch is `self.bound[id] = true` with `if self.bound[id] then return end`, and the only clear is `destroy_control`'s `self.bound[id] = nil` (v192:13718, unchanged in v213 at 13786).

**实测 (from v213's own rationale, v213:15272–15290):** the reported symptoms were **① after entering a level a second time, clicking a cell does nothing; ② a single click becomes a placement**. The stated mechanism is that a boolean latch cannot distinguish "the same live control re-bound" (must early-return, else double-bind ⇒ one gesture on two paths) from "a new control after an engine generation change" (must re-bind).

**推断 (which of the two symptoms this actually fixes):** the code change makes double-binding structurally impossible **and** allows re-binding to a new object. The "click becomes placement" symptom requires *double* dispatch, so it needs both a lost record and a second `bind_input` call on the same live control; v192's boolean latch would early-return in that case, so the boolean latch alone cannot produce symptom ②. I could not confirm from the artifacts which symptom v192 actually exhibited — see §6.

---

## 4. 每帧 (per-frame)

Baseline facts, both 实测:

* `Murdoku.on_update` spans **v192 16775–18206** and **v213 17069–18482**.
* Render is **not** per-frame: `main` gates it on `if sec ~= current.last_tick or current.controller.dirty then` (v192:16930, v213:17224). `Controller:tick` used to set `dirty` every frame in an earlier version; the current code only sets it when effects are live.

### 4.1 Depth-1 statement inventory of `on_update` (实测, extracted by indentation)

| v192 | statement | v213 | statement |
|---|---|---|---|
| 16776 | `if not current then return end` | 17070 | same |
| 16796–16816 | exit-art block | 17090–17110 | same |
| 16832–16871 | `if current ~= nil and current.adapter ~= nil then` | 17126–17165 | same |
| 16874 | `current.adapter:on_tick(dt)` | 17168 | same |
| 16875 | `current.controller:tick(dt)` | 17169 | same |
| 16887–16894 | `% 20` `enable_cursor` | 17181–17188 | same |
| 16913–16925 | `% 20` `enable_raycast` | 17207–17219 | same |
| 16929–16933 | render gate | 17223–17227 | same |
| 16974 | `Murdoku.DIAG = Murdoku.DIAG or false` | 17268 | same |
| **16981–16983** | **`function dprint(...) end`** | — | **hoisted to 16243** |
| 16985–17170 | `scr_now` + DIAG dump block | 17274–17459 | same |
| 17179–17348 | one-shot ray probe | 17468–17637 | same |
| **17360–17427** | **`local function snap_visible()`** | — | **hoisted to 16249** |
| 17440–17464 | DIAG snap block | 17665–17689 | same |
| 17479–17772 | select-widget + `stage`/`selbar` geometry `do` | 17704–18017 | same (guards added) |
| 17814–17911 | `% 300` diagnostic | 18059–18146 | same |
| 17951 | `murdoku_vis_memo` lazy init | 18186 | same |
| 17952–17960 | force-window key `do` | 18204–18212 | same |
| **17961–18032** | **strong `setv` writer `do`** | — | **replaced by:** |
| — | — | 18194–18203 | **`do` ids-key build (NEW)** |
| — | — | 18213–18258 | **`do` writer loop (NEW)** |
| 18203 / 18204 | `_last_screen` / `frames += 1` | 18479 / 18480 | same |

### 4.2 v192 has TWO visibility writers; v213 has one shared one (实测) — the "two authorities" bug

v192 contains **two** `local function setv` definitions that write **the same control set**:

* weak one at **17884**, inside a `do` block at **17879** — and my block-pairing probe shows that `do` closes at 17910, i.e. the weak writer is **inside the `% 300` block** (17814–17911). It does `pcall(function() c:SetVisible(want) end)` with **no read-back, no memo, no force window**.
* strong one at **17969**, inside a `do` at **17961** closing at 18032 — runs **every frame**, with read-back + memo + 60-frame force window.

```lua
-- v192.lua:17901–17908  (weak writer, runs on %300 frames only)
setv("selbar", in_select)
for i = 1, 6 do setv("selbtn." .. tostring(i), in_select) end
setv("tpl-container", false)
if in_level then
  for r = 1, 5 do for c = 1, 5 do setv("cell." .. r .. "." .. c, true) end end
end
```

Code-only counts: `local function setv` **v192 = 2 (17884, 17969) / v213 = 0**; `setv(` **v192 = 10 code sites / v213 = 3 (all comments)**.

v213 deletes the weak writer and keeps one shared file-level writer:

```lua
-- v213.lua:16362
local function murdoku_set_vis(ad, nm, want, forcing, memo)
```

called from a cached list:

```lua
-- v213.lua:18231–18243   (inside the do block 18213–18258)
local vis_ids = murdoku_vis_ids
if vis_ids ~= nil then
  for i = 1, #vis_ids do
    local nm = vis_ids[i]
    local want
    if nm == "tpl-container" then want = false
    elseif nm:sub(1, 5) == "cell." then want = true
    else want = in_select end
    wrote = wrote + murdoku_set_vis(ad_vis, nm, want, forcing, murdoku_vis_memo)
```

**实测 — the block-pairing change.** The deleted weak writer was a `do … end`. It sat at the **end** of the `% 300` block, and in v192 the `% 300` `if` was closed by an `end` at **17911** — *before* the `% 30` block at 18033. v213 removes the `do … end` and inserts a compensating `end` in the same position, so pairing is preserved. I verified pairing independently with a Lua lexer (§5) rather than trusting the comments: **v192 `% 300` closes at 17911, `% 30` closes at 18197; v213 `% 300` closes at 18146, `% 30` closes at 18473.** In **both** versions `% 30` is a **sibling** of `% 300`, never nested inside it.

### 4.3 Generation-cached name list — NEW in v213 (实测)

```lua
-- v213.lua:16342–16343
local murdoku_vis_ids = nil
local murdoku_vis_ids_key = nil

-- v213.lua:16350–16356
local function murdoku_build_vis_ids(scr_now, rows)
  local ids = { "selbar", "tpl-container" }
  for i = 1, 6 do ids[#ids + 1] = "selbtn." .. tostring(i) end
  if scr_now == "level" then
    local n = tonumber(rows) or 5
    for r = 1, n do
      for c = 1, n do ids[#ids + 1] = "cell." .. r .. "." .. c end
```

rebuilt only when the 3-part signature changes:

```lua
-- v213.lua:18194–18203   (the do block; the signature lines are 18198–18201)
do
  local lev0 = current.level
  local lid0 = (lev0 ~= nil) and (lev0.id or lev0.key or lev0.name) or nil
  local r0 = (current.adapter ~= nil) and current.adapter.cells_rows or nil
  local ids_key = tostring(scr_now) .. "|" .. tostring(lid0) .. "|" .. tostring(r0)
  if ids_key ~= murdoku_vis_ids_key or murdoku_vis_ids == nil then
    murdoku_vis_ids_key = ids_key
    murdoku_vis_ids = murdoku_build_vis_ids(scr_now, r0)
  end
end
```

Code-only `murdoku_vis_ids` **v192 = 0 / v213 = 7** (declares 16342/16343; build 18199/18200/18201; read 18231).

**Real win:** ~90 short-string allocations per frame disappear
(`"selbtn." .. tostring(i)` ×6 + `"cell." .. r .. "." .. c` ×25 for a 5×5) → **1 signature string per frame** (`scr|lid|rows`). `rows` is correctly part of the key because `ensure_cells` writes `adapter.cells_rows` only *after* entering the level (v213:18191–18195); using `screen|level` alone would rebuild the list with a stale `5`.

### 4.4 Per-frame closures — v213 removes ONE, not thirty-four (实测, flagged)

This is worth stating precisely because the v213 comment block (v213:16308–16312) describes the problem as *"34 个闭包 + 90 个字符串"* and a reader can easily take that as "34 closures eliminated".

Measured from the code:

* **v192, per frame:** 1 closure for `setv` (17969) + **1 `pcall` closure per control** for the read-back, `pcall(function() cur_vis = c.visible end)` at **v192:17997** ⇒ ≈ 34 closures/frame for 33 controls.
* **v213, per frame:** 0 for the writer itself, but `murdoku_set_vis` still does **the identical read-back closure**, `pcall(function() cur_vis = c.visible end)` at **v213:16370**, once per control ⇒ ≈ 33 closures/frame.

**So v213 removes exactly 1 closure/frame (plus the per-frame global `dprint` assignment and the per-frame `snap_visible` closure when `Murdoku.DIAG` is false, both counted separately above).** The per-control read-back `pcall` closure survives untouched. The large, genuine saving here is the **~90 → ~1 short-string allocations per frame** and the removal of the second (weak) writer's engine writes.

Control count in the v213 list: `2 + 6 + n²` = **33** for 5×5, **41** for 6×6, **57** for 7×7. (v192's lists only ever covered 5×5 — `for r = 1, 5 do for c = 1, 5 do`, v192:17907 and 18018 — while the `% 30` block below correctly reads `adapter.cells_rows`; that 5×5 hard-coding is what the v192 comment at 18037–18051 identifies as the "cross-level click bug" cause.)

### 4.5 Geometry "read-back then write" guards — 12 sites ADDED in v213, all inside `main` (实测)

v192 wrote geometry unconditionally at 6 places. v213 guards each with a read-back:

| site | v213 guard lines (read) | v192 equivalent |
|---|---|---|
| `stage` size | 17758 | unconditional write |
| `stage` position | 17763 | unconditional write |
| cell `content` size | 18360 | unconditional write |
| cell `content` position | 18365 | unconditional write |
| cell `face` size | 18381 | unconditional write |
| cell `face` position | 18386 | unconditional write |
| cell `x` size (70 %) | 18407 | unconditional write |
| cell `x` position | 18412 | unconditional write |
| grandchild `face` size | 18432 | unconditional write |
| grandchild `face` position | 18437 | unconditional write |
| grandchild `x` size (70 %) | 18444 | unconditional write |
| grandchild `x` position | 18449 | unconditional write |

Representative text:

```lua
-- v213.lua:17758–17765
pcall(function() sw0, sh0 = s:GetSizeDelta() end)
if not (sw0 == BOARD_W and sh0 == BOARD_H) then
  pcall(function() s:SetSizeDelta(BOARD_W, BOARD_H) end)
end
pcall(function() px0, py0 = s:GetAnchoredPosition() end)
if not (px0 == BOARD_X and py0 == BOARD_Y) then
  pcall(function() s:SetAnchoredPosition(BOARD_X, BOARD_Y) end)
end
```

Code-only occurrence count of `pcall(function() sw0…` style guards: **v192 = 0 / v213 = 12**.

Which frames pay them (实测 from my block-pairing probe):

* **every frame:** the `stage` pair (17758/17763) — inside the `do` at 17704, which closes at 18017.
* **every 30 frames (in level only):** the other 10 — they are inside the `% 30` block (18259–18473).

**Cost shape:** this trades an unconditional engine **write** for an engine **read**. In steady state the read is cheaper (the values are constants: `BOARD_W/H/X/Y` are file-level constants), and the author's probe recorded `stage` at "60 笔 size + 60 笔 pos" over 60 steady frames before the change. The reads are *not* free — `GetSizeDelta()`/`GetAnchoredPosition()` are engine calls and each is wrapped in its own `pcall` closure, so the guard adds **12 new per-frame-window closures** of its own. The `% 30` guards are the big win: the author measured `content`/`face`/`x` at 50 writes each per 60 frames (= 2 passes × 25 cells), which becomes 0 writes.

### 4.6 The `position` / `rect` branch has NO read-back guard in EITHER version (实测)

`Adapter:set_property`'s `elseif key == "rect" then` branch (v192:14834, v213:14902) is **byte-identical except for one comment** — the only adapter-patch hunk that touches it is the comment at patch lines 447–450. Verified: the `rect` branch does not appear in the `engine_adapter_qianxing` diff beyond that comment.

Its cost control comes entirely from the pre-existing early return:

```lua
-- v192.lua:14861–14866   ==   v213.lua:14929–14934
if self.cfg.respect_editor_rect ~= false
   and not (self.instantiated and self.instantiated[id])
   and not (self.runtime_rect and self.runtime_rect[id]) then
  -- ★ 这是**故意的空操作**（"位置归编辑器管"）⇒ 算送达，否则这个属性会被反复重发。
  return true
end
```

**So: the "position branch read-back guard" the brief asks about is ABSENT in both v192 and v213.** Any geometry actually reaching the rest of that branch is written unconditionally. `cell_geometry` (def v192:11269 / v213:11338) is likewise **unchanged** — it is a *reader* of the parent container's `sizeDelta`, and the adapter patch contains no `cell_geometry` hunk at all.

### 4.7 Throttled branches — what runs every 30 / 300 frames (实测)

**`% 20`** (identical in both, v192:16887 / v213:17181 for cursor; v192:16913 / v213:17207 for raycast):

* `enable_cursor()` — v192: 12 `find` + 12 unconditional `showCursor` writes + 12 `find` + reads + `table.concat`, forever. v213: early-returns after convergence.
* `enable_raycast()` — already had its own `st.done` latch in v192 too (`if st.done then return st.seen, st.set, {} end`, v192:13946), so this one is unchanged; the `main`-side guard `and not (ray_st ~= nil and ray_st.done)` (v192:16914) is also pre-existing.

**`% 30`** — v192:18033 (closes 18197), v213:18259 (closes 18473). In-level only (`if scr_now == "level" and …`). Lights up `face` per cell and sizes `content`/`face`/`x` per cell. In v192 all of those writes are unconditional; in v213 ten of them are guarded (§4.5). **`% 30` is NOT nested inside `% 300` in either version** — settled by the lexer probe, not by the comments.

**`% 300`** — v192:17814 (closes 17911), v213:18059 (closes 18146). Prints the screen position of `cell.1.1` plus `stage`'s position. In v192 this block **additionally** contained the weak visibility writer (§4.2) — 33 unconditional `SetVisible` writes every 300 frames. v213 removes it.

### 4.8 `Controller:tick` — a provably dead branch removed (实测)

```lua
-- v192.lua:4626–4630
local sec = math.floor(elapsed)
if sec ~= (self._hud_sec or sec) then
  self._hud_sec = sec
  self.dirty = true
end
```

In v192 the **only** occurrences of `_hud_sec` in the whole artifact are lines 4627 and 4628 — both the read and the assignment. On first entry `self._hud_sec == nil`, so the right side is `sec`, so the test is `sec ~= sec`: **constant false**, and the body can never run, so `_hud_sec` can never become non-nil. This is not an inference about intent; the code is self-evidently dead and grep proves there is no other writer.

v213 replaces it with an explanatory comment (4612–4631). **Zero behavioural change**, one fewer comparison per frame and one fewer assignment possibility. This is the cleanest of the v192→v213 removals.

---

## 5. Verification method (so the numbers can be re-derived)

* `git diff --no-index --stat` for the overview; per-module `git diff --no-index -U8` after slicing the bundles at `__M["…"]` boundaries.
* **Lexer-based block pairing** (`work/blocks.lua`, run with the system `lua`): strips comments/strings while preserving newlines, then walks `function/if/do/for/while/repeat` vs `end/until` to report which line closes a given opener. It reports **`unclosed_blocks=0`** on both 19 899- and 20 175-line artifacts, which is the sanity check that makes its answers trustworthy. This is what settles §4.2 and §4.7 *empirically* instead of by reading the authors' comments — comments which, at v213:18134–18136, first claim the `% 300` `end` "一直没有关闭" and then retract it at 18140–18141. The older comment at v213:18147–18151 makes a third, different claim. The probe is the arbiter; note also that v213:18135 cites "上面 L1772", a **source-file** line number, not a bundle line.
* **Comment-stripped counting** (`work/count_code.lua`): the same lexer, then substring counting on the blanked source, so "occurrences" never include explanatory prose. This matters: `ensure_ruler` shows 0/5 and `apply_ruler_layout` 10/13 on a naive `Select-String`, but **0/0 and 5/0 in real code**.
* Every line number is **within its own artifact** and is LF-based (§0.2).

---

## 6. Claims I could not confirm from the code

1. **Whether v192's ruler labels were ever instantiated.** v192 `build_layout` *plans* `ruler`, `ruler.c.*`, `ruler.r.*` (5954/5957/6025), which normally means `create_control` runs for them. But v213's comments insist the archive has no `ruler.*` controls and that `find("ruler")` was *always* nil. Both can be true only if the create fails (no template index / not present in the saved `.gil`) and the nodes are reported via `_note_missing`. The artifact contains no archive data, so I cannot settle this. What I *can* state: v192 pays for planning + create-attempting those nodes and v213 does not.
2. **Which of the two reported symptoms the `bind_input` change actually fixes.** The artifacts document the symptoms ("二次进关后点格子没反应", "单击变放置") and the mechanism, but as I note in §3.5 the boolean→object latch alone cannot produce "click becomes placement" — that requires a double dispatch. Whether v192 really double-dispatched, and whether re-entry or something else invoked `bind_input` a second time on a live control, cannot be determined from these two bundles. There is no runtime log in the staged directory.
3. **Whether `invalidate_lookups` being called once per control (create/destroy) is a cost problem in either version.** Both versions do it identically (`create_control` per node). Each call nils `_misses`, replaces `self.controls = {}` and bumps the generation, so entering a level with ~40 controls bumps the generation ~40 times and wipes the name cache ~40 times. This is present in **both** artifacts, so it is not a v192→v213 difference — but it dominates level-load lookup cost in both, and I did not measure it.
4. **All performance numbers quoted from comments are the author's, not mine.** `972 engine calls/render`, `GetChild 840/render`, `168 sub-calls/render`, `41.8 writes/frame`, `1.10 renders/second` come from `tests/_wip/*.lua` probes that are **not** in the staged directory, and I did not run the game. I mark them as the artifacts' own claims. The counts I derived myself are the closure/string/site counts in §4.3–4.5 and the block pairings in §4.2/§4.7.
5. **Whether `rearm_cursor`'s guard can starve the re-arm.** v213:13330 early-returns when `st.done` is false AND `st.idle == 0` AND `st.n == 0`. If `enable_cursor`'s very first pass finds *some* containers but they never all read back `true` (`all_true` stays false), then `idle` stays 0 while `n > 0`, so `st.n == 0` is false and the re-arm proceeds — fine. But on a screen where `CURSOR_CONTAINERS` resolve to nothing at all (`n == 0`, `idle == 0`), the re-arm becomes a no-op. I could not determine whether that state occurs in practice; it would silently keep the latch open rather than closed, so it looks fail-safe, but I am not certain.
6. **`v212` / `v216` were not analysed.** They were staged as references; the brief scoped the diff to v192 vs v213. If the intent is to attribute changes to the v206/v210/v212 optimisation rounds mentioned in the comments, those two artifacts would need the same treatment.

---

## 7. Pattern count table

Two columns per artifact: **raw** (naive substring count, includes comments and strings) and **code** (comment/string-stripped). "code" is the number that means something.

| # | pattern | v192 raw | v213 raw | v192 **code** | v213 **code** | verdict |
|---|---|---|---|---|---|---|
| 1 | `_lookup_gen` | 4 | 9 | 4 | 7 | **changed** — diagnostics-only → real cache key |
| 2 | `invalidate_lookups` | 17 | 21 | 7 | 7 | same (4 call sites + def in both) |
| 3 | `_sub_miss` | 0 | 8 | **0** | **8** | **NEW in v213** |
| 4 | `function Adapter:sub(` | 1 | 1 | 1 | 1 | same |
| 5 | `self.subs` | 7 | 10 | **5** | **5** | same in code (comment-heavy raw) |
| 6 | `murdoku_set_vis` | 0 | 3 | **0** | **2** | **NEW in v213** (def 16362, call 18243) |
| 7 | `murdoku_vis_ids` | 0 | 9 | **0** | **7** | **NEW in v213** |
| 8 | `local function setv` | 2 | 2 | **2** (17884, 17969) | **0** | **GONE in v213** |
| 9 | `setv(` | 12 | 3 | **10** | **0** | **GONE in v213** |
| 10 | `murdoku_vis_memo` | 8 | 7 | 6 | 4 | changed (now passed as a parameter) |
| 11 | `murdoku_vis_force_to` | 5 | 5 | **4** | **4** | same |
| 12 | `snap_visible` | 2 | 6 | 2 (def 17360 **in** `on_update`) | 2 (def 16249 **file-level**) | **moved** |
| 13 | `dprint` | 18 | 23 | 18 (def 16981 in `on_update`) | 18 (def 16243 file-level) | **moved** |
| 14 | `ensure_ruler` | 0 | 5 | **0** | **0** | **absent in BOTH** (v213 mentions only) |
| 15 | `apply_ruler_layout` | 10 | 13 | **5** | **0** | **GONE in v213** |
| 16 | `id = "ruler` | 3 | 1 | **3** (5954/5957/6025) | **0** | **GONE in v213** |
| 17 | `ruler.c.` / `ruler.r.` | 10 | 11 | — | — | GONE in code, kept in comments |
| 18 | `self.bound` | 7 | 10 | 5 | 6 | changed — boolean → control object |
| 19 | `self.bound[id] = ctrl` | 0 | 2 | **0** | **2** | **NEW in v213** |
| 20 | `_bound_ctrl` | 0 | 6 | **0** | **4** | **NEW in v213** |
| 21 | `enable_cursor` | 10 | 11 | 5 | 5 | same sites; latch added inside |
| 22 | `rearm_cursor` | 0 | 4 | **0** | **3** (9789/9791/13327) | **NEW in v213** |
| 23 | `self._cursor` | 19 | 33 | **2** (both `_cursor_line`) | **10** | **NEW state table in v213** |
| 24 | guard reads `… = s:GetSizeDelta()` etc. | 0 | 12 | **0** | **12** | **NEW in v213** |
| 25 | `SetSizeDelta` | 40 | 40 | — | — | same textual count (writes became conditional) |
| 26 | `SetAnchoredPosition` | 43 | 37 | — | — | −6 (all from the retired ruler code) |
| 27 | `SetPivot` | 17 | 14 | **16 matches / 8 lines** | **12 matches / 6 lines** | **−2 code sites, both inside `apply_ruler_layout`** (v192:13081, 13096) |
| 28 | `RefreshItems` | 44 | 45 | — | — | same path, +1 comment |
| 29 | `% 300 == 0` | 2 | 3 | 1 | 1 | same (1 real site each: 17814 / 18059) |
| 30 | `% 30) == 0` | 1 | 1 | 1 | 1 | same (18033 / 18259), sibling in both |
| 31 | `% 20 == 0` | 2 | 3 | 2 | 2 | same |

---

## 8. Summary: the one change that matters per axis

| axis | v192 | v213 | single most important change |
|---|---|---|---|
| **初始** | plans/creates `1+rows+cols` ruler nodes; `enable_cursor` never stops | no ruler nodes; cursor latch converges after 3 passes | **ruler control set removed from `build_layout`** (v192:5954/5957/6025 → v213: none) and the `enable_cursor` convergence latch (v213:13244, `st.idle >= 3` at 13307) |
| **切屏** | `_lookup_gen` exists but is only printed | generation number becomes the cache key for `Adapter:sub` misses | **`_sub_miss` per-generation miss memory** (NEW in v213:10948–10955 / 11013–11023), keyed on `_lookup_gen` (v213:10837) |
| **换关** | boolean `self.bound[id]` latch, cleared only in `destroy_control` | object-keyed latch that cannot double-bind and can re-bind | **`bind_input` latch: boolean → control object + weak-keyed `_bound_ctrl`** (v192:15204/15210 → v213:15309/15334–15346) |
| **每帧** | 2 visibility writers (one weak, inside `%300`), unguarded per-frame closures, unconditional geometry writes | 1 shared writer, cached id list, 12 geometry guards | **weak duplicate visibility writer deleted + `setv` hoisted + `murdoku_vis_ids` generation-cached** (v192:17879–17910 & 17961–18032 → v213:16362 + 18194–18258) |
