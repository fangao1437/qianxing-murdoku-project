# perf_faithful —— 用存档真实控件树量"加载 / 关键操作"的引擎调用账

v362（2026-10-28）新增。回答两个问题：**改了以后快了多少**、**界面结果有没有变**。

> 只需重建交付存档时，在仓库根目录运行 `node tools/build_perf_v362.mjs`；固定输入、哈希和完整构建说明见 `docs/可复现构建-性能优化-v362.md`。

## 三步

```powershell
# 1) 从存档导出真实控件树（runtime root 子树 + 全部顶层模板，含几何）
node tools/perf_faithful/export_tree.mjs "584-加载与操作延迟优化-v362.gil"

# 2) 同一场景跑两版脚本（路径用 ASCII 相对路径：Lua 在中文路径下拿不到参数）
git show <旧提交>:dist/client_script.lua > tools/perf_faithful/out/old.lua
lua tools/perf_faithful/bench.lua tools/perf_faithful/out/tree.lua tools/perf_faithful/out/old.lua old
lua tools/perf_faithful/bench.lua tools/perf_faithful/out/tree.lua dist/client_script.lua new

# 3) 对比：每阶段调用次数 / 实例化节点数 + 最终界面状态逐行比对（0 处不同 ⇒ 退出码 0）
lua tools/perf_faithful/compare.lua old new
```

加 `--attr` 时，每个阶段额外列出"引擎调用最多的前 4 个调用方"（`源文件:函数起始行 调用类型=次数`），用来找热点。

## 场景

开局 → 首页 → 选关 → 第一关（教程翻页、点线索卡、选人、点格子、撤销、返回确认、按答案放完、提交、指认、结算）
→ 第二关 → 第三关 → 回首页。每个阶段单独记账。

## 口径（先读这段再引用数字）

| 量 | 含义 | 能不能当毫秒 |
|---|---|---|
| interop | 控件属性读写 + 方法调用 + `game.*` 调用的总笔数（真机上每笔都跨 Lua↔引擎边界） | ❌ 是**次数** |
| inst | 实例化出来的模板节点数（家具模板一件 5～383 个节点） | ❌ |
| state 文件 | 最终每个控件的 路径+兄弟序号 / 显隐 / 激活 / 尺寸 / 位置 / 文字 / 图片 / 缩放 | 用来判"结果没变" |
| lua_ms | 本机纯 Lua 耗时 | ⚠️ 只作参考，不同机器不可比 |

- 树来自存档本身，不是手搭（项目规矩第 ④ 条）。
- 网格视窗按真机实测：一屏 5 项、**引擎每帧重进列表项回调**。
- 毫秒与移动端帧率**只有真机能给**：离线结果说明"做的事少了多少、结果是否一致"，最终以实机为准。
