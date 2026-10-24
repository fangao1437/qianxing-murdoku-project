# 美术设计过程 · 插件化交接包（2026-10-24）

> 委托：用户「把**图元拆解、手搭流程、写入器**等部分完整整理出来并推送，我让其他人进行插件化」。
> 本目录是**插件化的完整需求说明 + 数据契约 + 工具清单 + 硬约束**，读者不需要读 DSH 会话历史即可实现。

---

## 0 插件化目标（一句话）

把「**参考图 → 图元规格 JSON → 写入 .gil 模板/引用 → 嵌入脚本出档 → 验证**」整条链路，
拆成 **6 个有稳定输入/输出契约的阶段**，每个阶段可以由插件独立实现、串联或替换。

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ S1 参考→图元 │ → │ S2 层表/规格 │ → │ S3 预览/校验 │ → │ S4 写入容器  │ → │ S5 嵌入脚本  │ → │ S6 真机验收  │
│ decompose    │   │ spec         │   │ preview      │   │ write .gil   │   │ embed script │   │ device       │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
     PNG/图标            art-spec.json      PNG/SVG/报告     container.gil      final.gil         截图/日志
```

每个阶段的**数据格式**见 `06-数据格式与接口契约.md`；每条**硬约束**见 `07-踩坑与硬约束.md`（实现前必读，全是实测）。

---

## 1 目录

| 文件 | 内容 |
|---|---|
| `README.md` | 本文件：目标、插件阶段划分、接口速览、交付物 |
| `01-图元拆解.md` | **两条拆解路线**：拟合图元（外部拟合工具）/ 图标压缩（纯色矩形合并）；参数、坐标系、过滤规则、对比数据 |
| `02-手搭流程.md` | 板绘式"手搭层表"流程：画布/层序/形状/颜色/迭代/验收；桌子、书架、地毯、雕像实例 |
| `03-写入器.md` | `.gil` 结构、模板对、content、层记录字段映射、`things` 引用控件、GUID/族、写入器事务契约、四闸验证、脚本嵌入链 |
| `04-运行时约定.md` | 模板实例化、层级/缩放/跨格/属性顺序、切关回收、调试日志 |
| `05-工具链清单.md` | 所有既有工具（路径/命令/输入/输出）+ 存档与数据文件清单 |
| `06-数据格式与接口契约.md` | 插件各阶段的 JSON Schema 定义与示例 |
| `07-踩坑与硬约束.md` | 24 条实测坑（编辑器删手写模板、引用值=源 GUID、SetLocalScale、属性顺序…） |
| `schemas/` | 可直接用于校验的 JSON Schema（草案） |
| `examples/` | 每个阶段的最小示例输入/输出 |

---

## 2 六个阶段的接口速览（详细契约见 06）

| 阶段 | 输入 | 输出 | 关键约束 |
|---|---|---|---|
| **S1 decompose** | 参考图 PNG（家具图标）、kind、目标画布 | `TemplateSpec`（层列表） | 只允许官方基础形状 id；颜色 `0xAARRGGBB`；单位=画布 px；`dy_down` 向下为正 |
| **S2 spec** | 参考量测（长边占格）+ 拆解结果 | `ArtSpecSet`（多个模板） | 画布 108/216；层序从下到上；不重叠 or 明确遮挡顺序 |
| **S3 preview** | `ArtSpecSet` + 布局 `Layout` | PNG/SVG/校验报告 | 打印/棋盘几何与游戏一致（1600×900；棋盘 584@(608,138)；ruler 12；gap 4） |
| **S4 write** | 基准 `.gil` + `WriterJob` | 新 `.gil` + `WriterReport` | 四闸：重读记录数、roundtrip 逐字节、确定性、幂等；真撞号 0 |
| **S5 embed** | 容器 `.gil` + `dist` 脚本 + 期望标记 | 最终 `.gil` + `EmbedReport` | source=dist=embedded 标记链一致；BOM 检查 |
| **S6 device** | 最终 `.gil`（导入游戏） | 截图 + 日志 | 看日志三类行（face/家具/缩放）与画面 |

---

## 3 交付物（当前基线，可直接作为"金样本"）

| 类别 | 文件/路径 | 说明 |
|---|---|---|
| 最终存档 | `qianxing-murdoku/552-一二关美术-v332.gil` | 2047 条 / 内嵌 v332（当前最新） |
| 结构容器 | `qianxing-murdoku/551-一二关美术-容器-v21.gil` | 不含新脚本的容器（写入器产物） |
| 美术规格 | `qianxing-murdoku-tool/art/specs/furniture_templates.json` | 8 个模板层规格（手搭基线） |
| 手搭旧规格 | `qianxing-murdoku-tool/art/specs/furniture_hand_layers.json` | v309 手搭层（回退用） |
| 压缩版雕像 | `_work/art-tools/art_v332g_statue.json` | 381 纯色矩形（图标压缩产物，当前使用） |
| 图元记录 | `qianxing-murdoku/lua/furn_art_records.lua` | 拟合图元（chair/table/plant/statue，含旋转） |
| 运行时约定 | `qianxing-murdoku/lua/engine_adapter_qianxing.lua` / `ui_controller.lua` | 参考实现（模板映射、缩放、层级、属性顺序） |
| 旧位置参考 | `murdoku-project/美术实现-一二关-2026-10-22/静态烘焙清单-v307.json` | 两关每个图元的画布绝对坐标 + cell 标签（可用于反推旧位置） |

---

## 4 插件化建议（给实现者）

1. **先冻结数据契约**：06 里的 5 个结构（`TemplateSpec` / `ArtSpecSet` / `Layout` / `WriterJob` / `EmbedJob`）加 `version` 字段，插件之间只认这些 JSON，不认内部实现；
2. **S4 写入器必须"事务化"**：每个 `WriterJob` 要么全成功（四闸过），要么不产出；失败报告要含"第一处不符字段"；
3. **S5 不要自己造标记链**：沿用 `tools/gil/embed_script.mjs` 的 `--expect-marker` 语义（source/dist/embedded 三处一致）；
4. **S3 预览与 S6 真机必须同源数据**：预览渲染器只读 `ArtSpecSet`，禁止读运行时状态；
5. **所有几何常数集中在 06 的 `Geometry` 段**（画布 108、棋盘几何、棋盘到格子的换算），不要散落；
6. **参考图/官方贴图不入库**：仓库只存 id / 颜色 / 尺寸 / 几何（见 07-合规条）。

---

## 5 既有文档索引（不重复搬运）

| 主题 | 文档 |
|---|---|
| 完整美术制作流程（较早版） | `qianxing-murdoku-tool/art/docs/美术制作流程.md` |
| 层级与缩放规范 | `qianxing-murdoku-tool/art/docs/层级与缩放规范.md` |
| 布局/规格 JSON 格式 | `qianxing-murdoku-tool/art/docs/布局与规格JSON.md` |
| 渲染问题交接（为何换面层/模板架构） | `murdoku-project/渲染问题-试玩不渲染家具-2026-10-23.md` |
| 家具尺寸/错位报告（属性顺序） | `murdoku-project/渲染问题-家具尺寸偏大与地毯错位-2026-10-23.md` |
| 编辑器删除手写模板证据 | `qianxing-murdoku/docs/阻塞报告-地毯模板-520.1.md` |
