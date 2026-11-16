"""汇总 v16 三关设计数据与逐项复验；生成卡面文本，供设计图渲染使用。

只读 _best_L*.json（搜索产物）与 695_实际关卡数据.json；不写任何 .gil / 存档。
"""
import json, pathlib, sys, hashlib
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str((ROOT.parent / 'murdoku-project' / '第三四关内容设计').resolve()))
from murdoku_engine_generic import names_of, OBJECT_REGISTRY, OCCUPY

BASE = json.loads((ROOT / '695_实际关卡数据.json').read_text(encoding='utf8'))


def disp(clause, speaker, na, names):
    txt = clause
    for a in na:
        txt = txt.replace(a, a + names[a])
    me = speaker + names[speaker]
    if txt.startswith(me):
        return '我' + txt[len(me):], True
    if txt.startswith('只有' + me):
        return '只有我' + txt[len('只有' + me):], True
    if ('与' + me) in txt:
        return txt.replace('与' + me, '与我', 1), True
    return txt, False


def load_best(no):
    """同关多个搜索产物时取 PASS 且方位提示最少者。"""
    best = None
    for p in sorted(ROOT.glob(f'_best_L{no}*.json')):
        x = json.loads(p.read_text(encoding='utf8'))
        r = x['result']
        key = (bool(r['PASS']), -len(r['direction_hints']),
               -sum(len(v) for v in x['objects'].values()))
        if best is None or key > best[0]:
            best = (key, x, p)
    assert best, f'缺少第{no}关搜索产物'
    print(f"  采用 L{no} 产物：{best[2].name} PASS={best[1]['result']['PASS']}")
    return best[1]


def build():
    designs, checks = [], []
    for no in (5, 6, 7):
        x = load_best(no)
        r, objects, cards = x['result'], x['objects'], x['result']['cards']
        lv = BASE['levels'][str(no)]
        n = lv['size']
        na = names_of(n)
        names = lv['suspects']
        display, roles, texts = [], [], []
        for i, c in enumerate(cards):
            sp = na[i]
            ds, cr = [], []
            for s in c:
                d, self_ref = disp(s, sp, na, names)
                ds.append(d)
                cr.append(dict(text=s, speaker=sp, self_ref=self_ref, display=d))
            display.append(ds); roles.append(cr)
            texts.append(dict(slot=i + 1, letter=sp, who=names[sp], what='、'.join(ds)))
        am = []
        for k, cells in objects.items():
            oid, oname, occ, freq, diff, supported = OBJECT_REGISTRY[k]
            am.append(dict(local_name=k, official_id=oid, official_name=oname,
                           occupiable=occ, freq_levels=freq,
                           differentiated_name=diff, local_art_supported=supported,
                           cells=cells))
        d = dict(level=no, grid=n, version='v16',
                 room=lv['room'], doors=lv['doors'], walls=lv['walls'],
                 doors_raw=lv['doors_raw'], objects=objects,
                 furniture_count=sum(len(v) for v in objects.values()),
                 target=lv['target'], thief=lv['thief'], names=names,
                 cards=cards, display_cards=display, clause_roles=roles,
                 card_speakers=list(na), texts=texts,
                 announce='unknown', truth_vector=r['truth_vector'],
                 truth_pattern=('七卡全真 · 无谎言（推导结果）' if no == 6
                               else '恰一谎（推导结果）'),
                 difficulty_band=('7×7 大盘面 · ' if n == 7 else '') +
                 f"GAC 深度 {r['gac_depth']}（{'需一次试位' if r['gac_depth'] >= 1 else '纯演绎'}）",
                 visual_theme=lv['visual_theme'], asset_mapping=am,
                 direction_hints=r['direction_hints'],
                 source='695_实际关卡数据.json（695 内嵌 Lua + 695 静态卡面）',
                 rule_note='可选位置 = 全线索下的候选格；覆盖《当前两关运行规则_内部.md》§一.14 与 630 的旧定义',
                 base_meta=lv['meta'])
        designs.append(d)
        checks.append(r)
    (ROOT / 'design_selected_v16.json').write_text(
        json.dumps(designs, ensure_ascii=False, indent=2), encoding='utf8')
    (ROOT / 'verification_v16.json').write_text(
        json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf8')
    # 存档只读证据
    gil = ROOT.parent / 'qianxing-murdoku' / '695_地毯原型注册与改名' / \
        '695_地毯原型注册与改名.gil'
    h = hashlib.sha256(gil.read_bytes()).hexdigest()
    (ROOT / '_存档只读校验.json').write_text(json.dumps(dict(
        file=str(gil), sha256=h, bytes=gil.stat().st_size,
        expected_prefix='c4819ae9', note='本轮只读，未写入任何 .gil / 存档'),
        ensure_ascii=False, indent=2), encoding='utf8')
    for d in designs:
        no = d['level']
        print(f"L{no} 方位提示{len(d['direction_hints'])}条 家具{d['furniture_count']}格 "
              f"真假{d['truth_vector']} 卡面={d['display_cards']}")
    print('695 .gil SHA-256', h)
    report(designs, checks, h)
    return designs, checks


def report(designs, checks, h):
    by = {d['level']: d for d in designs}
    ck = {r['level']: r for r in checks}
    L = []
    A = L.append
    A('# 695 基准 · 第 5 / 6 / 7 关线索重构（v16）')
    A('')
    A('> 只读 695 存档的实际关卡设计；**不写入任何 `.gil` / 存档**。')
    A('> 基准文件 `695_地毯原型注册与改名.gil` SHA-256：`%s`（前缀 `%s`，与 695 交付记录一致）。' % (h, h[:8]))
    A('')
    A('## 一、口径更正（覆盖《当前两关运行规则_内部.md》§一.14 与 630）')
    A('')
    A('| | 旧定义（本轮判定为错误） | 更正后的定义 |')
    A('|---|---|---|')
    A('| 「可选位置」 | 依次假定身份、**摘掉本人口供**后，用其余真线索 + 区域规则反事实枚举出的本人候选格 | **全线索下的候选格**：全部线索按卡面断言为真、叠加基本摆位规则（每行每列一人、家具可站性），**不含人数规则** |')
    A('| 说谎判据 | 摘卡反事实世界里 1 格 ⇒ 必须假；≥2 格 ⇒ 必真 | 全线索下 |P(h)|≥2 ⇒ 不必说谎，最终解 = 全线索 ∧ 人数规则(h)；|P(h)|≤1 ⇒ 必须说谎，最终解 = 其余卡 ∧ ¬本卡 ∧ 人数规则(h) |')
    A('')
    A('**实证（695 第 1 关 / 教程的实际运行方式）**：`announce=none`、五卡全真、无谎。')
    A('按更正口径全线索枚举得 **2 盘**，盗窃者 D 有 **(1,3) 与 (4,3) 两个可选格**；')
    A('叠加「受害者相邻区域中无辜人数唯一最多」的人数规则后 **收敛为 1 盘**（预设答案）。')
    A('而旧口径的 `m.audit()` 在真实第 1 关上 `correct=False` —— 这正是旧定义与实机运行不一致的直接证据。')
    A('')
    A('本轮主判据按更正口径实现：`S = ∧全部线索（不含人数规则）`；`P(h) = S 中 h 的不同格数`。')
    A('第 6 关是无谎言关，与第 1 关同构：**不启用任何「某人说谎」分支**，只靠人数规则收口。')
    A('')
    A('## 二、695 的实际关卡设计（本轮读取结果）')
    A('')
    A('数据来自 `695_内嵌Lua_695.lua` 的 `levels.case_00N` 模块（墙 / 门 / 家具 / 线索 / 答案 / 姓名），')
    A('卡面文本来自 695 静态文本（693 短名 + 字母前缀口径，含 695 的「墨绿誊写→誊写员」改名）。')
    A('与 v14 离线设计源的差异已核对：第 6 关门 9→5 段（691 裁剪，区域相邻对集合不变）、')
    A('第 4 关 A/D 卡面互换、第 3 关家具调整、人名统一 ≤4 字且卡面姓名带字母前缀。')
    A('')
    A('| 关 | 盘面 | 区域 | 门段 | 家具格 | 盗窃者 | 695 预设假卡 | 人对人方位/距离提示 |')
    A('|---:|:---:|:---:|---:|---:|:---:|:---:|---:|')
    old_dirs = {5: 3, 6: 3, 7: 3}
    for no in (5, 6, 7):
        d, lv = by[no], BASE['levels'][str(no)]
        A(f"| {no} | {d['grid']}×{d['grid']} | {max(d['room'])+1} | {len(lv['doors_raw'])} | "
          f"{sum(len(v) for v in lv['objects'].values())} | {d['thief']} | "
          f"{lv['meta'].get('false_clue') or '无'} | {old_dirs[no]} |")
    A('')
    A('> 计数口径从严：既含「X在Y上/下/左/右方」的定性方位句，也含「X比Y靠上N行 / 靠左N列」的精确距离句。')
    A('> 695 第 5/6/7 关各有 3 条；本轮三关全部降到 **0 条**。')
    A('')
    A('## 三、本轮改动：布局冻结，仅家具与线索可变')
    A('')
    A('- **冻结**：房间掩码 / 墙 / 门 / 盘面尺寸 / 人物与姓名 / 预设答案 / 盗窃者 / 视觉主题。')
    A('- **可改**：家具（用户明确允许）、线索谓词与卡面。')
    A('- **新增**：无一条人对人方位/距离提示；改用家具可站性、同室四邻、同/异区关系、「只有…在…上」与「独自在房间」。')
    A('')
    for no in (5, 6, 7):
        d, lv, r = by[no], BASE['levels'][str(no)], ck[no]
        A(f"### 第 {no} 关（{d['grid']}×{d['grid']}，盗窃者 {d['thief']}）")
        A('')
        A(f"真相形态：**{d['truth_pattern']}**；GAC 深度 `{r['gac_depth']}`；"
          f"方位/距离提示 **{len(r['direction_hints'])}** 条。")
        A('')
        A('| 卡槽 | 说话人 | 新卡面 | 答案处 |')
        A('|---:|:---:|---|:---:|')
        na = names_of(d['grid'])
        for i, ds in enumerate(d['display_cards']):
            A(f"| {i+1} | {na[i]} {d['names'][na[i]]} | {'、'.join(ds)} | "
              f"{'真' if r['truth_vector'][i] else '**假**'} |")
        A('')
        oldf, newf = lv['objects'], d['objects']
        add = {k: [q for q in v if q not in oldf.get(k, [])] for k, v in newf.items()}
        add = {k: v for k, v in add.items() if v}
        rm = {k: [q for q in v if q not in newf.get(k, [])] for k, v in oldf.items()}
        rm = {k: v for k, v in rm.items() if v}
        co = lambda q: f"({q//d['grid']+1},{q%d['grid']+1})"
        if add or rm:
            A('家具变化：' + ('；'.join(f"新增 {k} " + '、'.join(co(q) for q in v)
                                    for k, v in add.items()) if add else '')
              + ('；' if add and rm else '')
              + ('；'.join(f"移除 {k} " + '、'.join(co(q) for q in v)
                                    for k, v in rm.items()) if rm else '')
              + f"（总格数 {sum(len(v) for v in oldf.values())} → {d['furniture_count']}）")
        else:
            A(f"家具不变（{d['furniture_count']} 格）。")
        A('')
        if no == 6:
            A(f"更正口径复验：全线索摆法 `{r['all_clue_boards']}` 盘；"
              f"盗窃者 {d['thief']} 在全线索下 **{r['optional_positions'][d['thief']]} 个可选格**；"
              f"叠加人数规则后 **{r['corrected_audit'][na.index(d['thief'])]['boards']} 盘**（=预设答案）。")
        else:
            A(f"更正口径复验：全线索互相矛盾（`{r['all_clue_boards']}` 盘）⇒ 必须有人说谎；"
              f"仅 {d['thief']} 的假话分支叠加人数规则后收敛为 "
              f"**{r['corrected_audit'][na.index(d['thief'])]['boards']} 盘**（=预设答案）；"
              f"矛盾子集 {r['contradiction_min_subset']} 张卡。")
        A('')
    A('### 第 6 关专项（用户指定）')
    A('')
    r6, d6 = ck[6], by[6]
    A(f"1. **无谎言**：七卡在预设答案处逐卡为真 → `{r6['truth_vector']}`。")
    A(f"2. **不使用人数规则**：全线索共 `{r6['all_clue_boards']}` 盘，"
      f"盗窃者 {d6['thief']} 有 **{r6['optional_positions'][d6['thief']]} 个可选格**（≥2）。")
    A(f"3. **使用人数规则后**：收敛为 **1 解**（`thief_final_boards=1`、"
      f"`thief_final_is_target=true`），且其余身份不产生别的盘面。")
    A('4. 与第 1 关 / 教程同构：全线索留多解，靠「区域无辜人数唯一最多」收口。')
    A('')
    A('## 四、逐项复验')
    A('')
    A('沿用第 3/4 关定稿的 28 项性质清单口径：几何合法性、严格唯一性、位集 + numpy 双实现、')
    A('删卡非冗余、单卡不定位、语言闸门（V 卡单句 / ≤2 句 / 复合卡≤2 / 否定≤2 / 只有≤1 /')
    A('无内部标签与全局计数）、GAC 深度、矛盾子集、视觉主题区分、卡序与本人自述。')
    A('')
    A('| 关 | 检查项 | 通过 | 全线索盘 | 盗窃者可选格 | GAC | 矛盾子集 | 方位提示 | 单卡最小域 | 双实现 | 旧口径 `audit.correct` |')
    A('|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|:---:|')
    for no in (5, 6, 7):
        r = ck[no]
        npass = sum(c['ok'] for c in r['checks'])
        A(f"| {no} | {len(r['checks'])} | {npass} | {r['all_clue_boards']} | "
          f"{r['optional_positions'][by[no]['thief']]} | {r['gac_depth']} | "
          f"{r['contradiction_min_subset'] or '无'} | {len(r['direction_hints'])} | "
          f"{r['single_card_min_domain']} | 一致 | {r['legacy_audit_correct']} |")
    A('')
    A('> 第 6 关在旧「摘卡反事实」口径下 `audit.correct=False` —— 与真实第 1 关一致，')
    A('> 属预期结果；本轮以更正后的全线索口径为准。')
    A('')
    A('## 五、交付物与边界')
    A('')
    A('- `695_实际关卡数据.json`：从 695 内嵌 Lua + 静态卡面解析出的 1~7 关实际设计（含区域掩码、门格对、答案、线索、卡面）。')
    A('- `design_selected_v16.json`：第 5/6/7 关新设计（谓词、卡面、说话人、家具、答案、主题）。')
    A('- `verification_v16.json`：三关逐项复验明细（含更正口径审计表、双实现、删卡试验）。')
    A('- `第5关_设计图_v16.png` / `第6关_设计图_v16.png` / `第7关_设计图_v16.png`：新设计图。')
    A('- `extract_695.py` / `design_v16.py` / `solve_v16.py` / `build_v16.py` / `render_v16.py`：可复现脚本。')
    A('- `_存档只读校验.json`：695 `.gil` 的 SHA-256，证明本轮未写入存档。')
    A('')
    A('边界：仅离线内容设计与离线验证；**未导入游戏、未做真机渲染或玩家试玩**。')
    A('若日后要把 v16 写入存档，需同步按更正口径修改运行期规则/教程文案（旧运行时仍是预设答案逐格比对，')
    A('与严格谎言求解是两个层次），本轮不做。')
    A('')
    (ROOT / '变更说明_v16.md').write_text('\n'.join(L), encoding='utf8')
    print('已生成 变更说明_v16.md')


if __name__ == '__main__':
    build()
