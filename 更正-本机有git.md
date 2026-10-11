# 更正 —— 本机【有】git（★ 在 DSH 运行时里 ✓）

> ★ 本文由**后勤/协调方（lead）**写 ✓
> ★★ 起因 ✓：★ 一份路线文档把「★ **本机没有任何 git** ✗」列为**硬约束** ✗ ✓
> ★★★ 实测 ⇒ ★ **该结论不成立** ✗✓ —— ★ **它只查了 `PATH` ✗ 与常见安装路径 ✗** ✓

---

## 一 ★★★★ 事实

```
★ git 在：★ C:\Users\18182\AppData\Local\Programs\ds-harness-desktop\runtime\git\cmd\git.exe
★★ 版本：★ git version 2.55.0.windows.4                                    ✓
★ 来源：★ **DSH 桌面版自带的运行时** ✓ —— ★ 所以它【不在 PATH ✗】也不在 Program Files ✗
```

★ **验证命令** ✓：
```powershell
& "C:\Users\18182\AppData\Local\Programs\ds-harness-desktop\runtime\git\cmd\git.exe" --version
```

⇒ ★★★ **⇒ 涉及版本管理的路线【不必绕开 git】** ✓✓

---

## 二 ★★★ 为什么这条纠正重要 ✗

★ 那份路线文档基于「没有 git」⇒ ★ **设计了一整套【不依赖 git】的交换机制** ✗
　 ★ **它本身有价值 ✓**（★ 解析 `.git/index` ✗ 只交换跟踪内容 ✓ 省掉 1.1GB ✓）
　 ★★ **但【不是必需的 ✗】** —— ★ **`git bundle` / `git clone <本地路径>` / `git push` 都能用** ✓✓
　 ⇒ ★★★ **⇒ 路线 B（★ bundle 双向 ✓）与路线 C（★ 同机 clone ✓）【可以走】** ✓
　 　 ★ **而且带历史 ✓ 可增量 ✓ 天然碰不到 GitHub ✓** ✓✓

---

## 三 ★★ 工作区当前漂移（★ 实测 ✓）

★ **`git status --porcelain`：15 个跟踪文件改动 ＋ 若干未跟踪** ✓
★ **`git diff --stat`：★ +496 ／ −1053** ✓

| ★ 类别 | ★ 文件 | ★ 谁改的 |
|---|---|---|
| ★★ **ruler 相关** ✗ | ★ `lua/ui_controller.lua` ／ `lua/main.lua` ／ `lua/engine_adapter_qianxing.lua` | ★ **lead（我）✗ 已弃用 ✓** |
| ★★★ **非 ruler** ✗ | ★ `tests/perframe_throttle.lua` ／ `tests/ui_math.lua` ／ `docs/工具目录.md` ／ `docs/控件坐标表-1600x900.md` ／ `tools/gil/gen_tool_catalog.mjs` ／ `tools/sim/play_test.mjs` ／ `lua/entry_client_script.lua` ／ `dist/client_script.lua` | ★ **优化组／同级会话 ✓（未提交 ✗）** |
| ★★ **归档残留** ✗ | ★ `341`-`344` 四个 `.gil` 显示 `D` | ★ **lead 用 `Move-Item` ✗ 没 `git mv`** ✓ |
| ★ **未跟踪** | ★ `_backup/sandbox-scripts/10737*__v197__2026-10-12_*.lua` | ★ **v197 快照 ✓ 可留可删 ✓** |

★★★ **⇒ 教训** ✓：★ **"HEAD 是 X"这种说法【不可靠】✗** —— ★ **工作区可能已偏离提交** ✓✓
　 ⇒ ★★ **⇒ 凡交付物都要带【内容指纹 ✗】而不是【提交号 ✗】**
　 　 ★ **那份路线文档的 `manifestId`（★ 路径 ＋ 内容哈希再哈希 ✓）思路是对的 ✓** ✓✓

---

## 四 ★★ 给优化组的建议（★ 更新后 ✓）

| 路线 | 结论 |
|---|---|
| ★★ **B：`git bundle` 双向** | ★★ **推荐 ✓** —— ★ **本机有 git ✓ 带历史 ✓ 可增量 ✓ 不碰 GitHub ✓** |
| ★ **C：同机 `git clone <本地路径>`** | ★ **可用 ✓** |
| ★★ **A：桥接工具 `export/verify/apply`** | ★ **仍有价值 ✓** —— ★ 作为【不装 git 时的退路 ✓】或【只读快照 ✓】 |
| ★ **D：只读 PAT** | ★ 用户已排除 ✗ |

★ **三条必设配置**（★ 那份文档写的 ✓ 保留 ✓）：
```
★ core.autocrlf false      ← ★★ 【中文项目的 lua 文件行尾会被改写 ⇒ 整文件变"已修改"✗】
★★ core.quotepath false     ← ★ 中文文件名不转义 ✓
★ i18n.commitEncoding utf-8 ✓
```

---

## 五 ★ 一句话

★★★ **"本机没有 git"✗ 不成立 ✓** —— ★ **它在 DSH 运行时里 ✓ 用完整路径即可 ✓** ✓✓
　 ⇒ ★★ **⇒ 版本管理路线可以走 `git bundle` ✓ 桥接工具作为退路保留 ✓** ✓✓
