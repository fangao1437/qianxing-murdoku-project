# 美术调查-工具 · artkit.mjs

千星奇域「复杂美术」智能体工具包。零依赖（Node ≥ 18 自带 fetch/FormData），只调用公开 HTTP API。

配套文档：

- 《美术调查-社区复杂美术方法-2026-10-19.md》——方法与证据
- 《美术调查-智能体工作流-2026-10-19.md》——可执行 SOP

## 它解决什么

官方没有「上传任意图片当界面图」的入口；社区做法是把复杂画面拆成
「官方基础形状 100001–100006 + 1543 张内置素材 + 文本」的控件组合，用客户端 Lua 逐控件绘制。
artkit 把这条链路做成命令行：

| 步骤 | 命令 | 产出 |
|---|---|---|
| 素材检索 | catalog | 类目/数量/id 区间；按类目或 id 查询 |
| 场景构建 | scene | 编辑器场景 JSON（内置卡框/徽记/面板预设） |
| 拼图线导出 | export | 客户端 Lua 绘制脚本 / GIA / JSON / CSS / SVG / PNG |
| 拟合线 | fit | 参考图 → Lua 绘制脚本 / 超限/经典 GIA |
| 校验 | check | GIA 容器头、Lua 关键字段、控件数 vs 预算 |
| 可用性自检 | verify | 目录/导出/拟合站三项探活 |

## 快速开始

    # 0) 探活
    node artkit.mjs verify

    # 1) 素材目录（会缓存到 ./.artkit-cache/library-catalog.json）
    node artkit.mjs catalog --stats
    node artkit.mjs catalog --category=造物
    node artkit.mjs catalog --id=112042

    # 2) 拼图线：生成卡框场景 → 导出 Lua → 校验
    node artkit.mjs scene --preset=card-frame --out=card.json
    node artkit.mjs export --scene=card.json --kind=lua --out=out/card.lua --name=clue-card
    node artkit.mjs check --file=out/card.lua --budget=1000
    node qianxing-murdoku/tools/lua53check/check.cjs out/card.lua

    # 3) 拟合线：参考图 → Lua（+ 可选 GIA）
    node artkit.mjs fit --image=ref.png --primitives=200 --shapes=circle --png-mode --kinds=lua,gia-overlimit --outdir=out/fit --timeout=300
    node artkit.mjs check --file=out/fit/fit.lua --budget=1000

所有子命令都支持 --json；退出码：0 成功，2 参数错，3 目录失败，4 导出失败，5 拟合失败，6 校验未通过，7 探活失败。

## 命令说明

### catalog

    node artkit.mjs catalog [--refresh] [--stats] [--category=<中文名|类目id>] [--id=<素材id>] [--json]

- 数据源：https://qx.070077.xyz/api/library/catalog（当前版本 1543 张 / 14 类）。
- 单张素材没有名称，只能按 id/类目/看图挑；本工具输出 id 列表与 sprite URL。
- --refresh 强制重新拉取；否则优先读缓存。

### scene

    node artkit.mjs scene --preset=card-frame|emblem|panel [--out=x.json] [--list]

内置预设是「元素清单」的可运行示例：卡框 360×96（9 元素）、徽记 256×256、面板 512×512。
正式生产建议按工作流 §A0 手写元素清单后生成 JSON。

### export

    node artkit.mjs export --scene=x.json --kind=lua|gia|json|css|svg|png [--out=y] [--name=素材组名]

- 调用 POST https://qx.070077.xyz/api/export/<kind>，body 必须 { scene, giaGroupName }。
- 导出 Lua 会顺带校验：IMAGE_PREFAB_ID / TEXTBOX_PREFAB_ID 是否为 0、ELEMENTS/TEXTBOXES 数量、OnStart/OnDestroy。
- 导出 GIA 会顺带校验容器头（类型=3、尾=0x679、体长自洽）。

### fit

    node artkit.mjs fit --image=x.png [--primitives=400] [--shapes=circle|rect|triangle] [--png-mode] [--kinds=lua,gia-overlimit,gia-classic] [--outdir=dir] [--timeout=300] [--interval=2000]

- 提交：POST https://qx-img.070077.xyz/submit（multipart）。
- 轮询：GET /status/<tid>（200=处理中，302=完成）。
- 下载：/download_lua、/download_overlimit_gia、/download_classic_gia。
- 每个图元 = 1 个控件：图元数就是控件数，先按工作流 §2 Q4 预算档位。
- 三角形/矩形支持差，建议默认只用 circle。

### check

    node artkit.mjs check --file=x.lua|x.gia [--kind=lua|gia] [--budget=1000] [--strict]

- Lua：OnStart/OnDestroy、模板 ID、ELEMENTS/TEXTBOXES/DRAW_ORDER 计数、是否含 InstantiateClientUIControl。**artkit 不做 Lua 语法校验**，语法必须另跑主仓 tools/lua53check/check.cjs。
- GIA：容器头四个自洽字段。
- --strict 时 warnings 也算失败；--budget 超出时退出码 6（即使内容本身有效）。

### verify

    node artkit.mjs verify

探活三件套：素材目录、Lua 导出、拟合站首页。任一项失败退出码 7。

### recipes

    node artkit.mjs recipes

输出路线与配方提醒（A/B/C/D 线各自适用与风险）。

## 生成物怎么进游戏

1. 编辑器准备一次「仅存为模板」的客户端图片控件（有文本再加文本框模板），用「模板引用控件」引用后读 referencedPrefabIndex，得到 IMAGE_PREFAB_ID / TEXTBOX_PREFAB_ID；
2. 把脚本里的两个 ID 填上；
3. 脚本挂到专用空客户端容器节点，OnStart 绘制、OnDestroy 清理；
4. 模拟器验布局/数量/交互 → 真机验显示/帧率/容量；
5. 详见《美术调查-智能体工作流-2026-10-19.md》§5–§6。

## 硬约束

- 外部 .gia 进不了客户端控件容器；客户端 UI 必须走 Lua 绘制路线。
- 每个图元/元素 = 1 个客户端控件；官方上限：单界面控件组 1000、单屏可见 10000、控件模板 2000、布局 100。
- 不复制/导出/分发官方素材图；不拟合无版权参考图；不改第三方导出的 .gia 二进制。
- 模拟器绿灯 ≠ 真机通过。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| ARTKIT_EDITOR_BASE | https://qx.070077.xyz | 拼图工具站 |
| ARTKIT_FIT_BASE | https://qx-img.070077.xyz | 拟合站 |
| ARTKIT_CACHE | ./.artkit-cache | 素材目录缓存目录 |

## 归属与许可

- artkit.mjs 为本项目（qianxing-murdoku-project）自写工具，用于调查与生产；随仓库分发。
- 调用的第三方服务与工具：qx.070077.xyz（千星图片编辑器，源码 github.com/1475505/Miliastra-image-editor-webui）、qx-img.070077.xyz（图元拟合，源码 github.com/1475505/Miliastra-toolbox-primitive-shape，MIT）。算法与产物格式归各自作者；工具/素材不得用于售卖或违反《奇匠创作守则》的用途。
- 素材与游戏内容版权归米哈游；本工具只输出 id/参数与绘制脚本，不分发素材图。
