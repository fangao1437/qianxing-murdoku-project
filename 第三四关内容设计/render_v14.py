"""第3/4/5/6/7关 v14 设计图（内容设计用，非游戏内渲染）。

支持 6x6 与 7x7 自适应网格、五套差异化视觉主题；
线索卡按 display_cards 渲染，假卡内联标注；严格摘卡表来自 verification_v14.json。
"""
import json, pathlib, textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'design_selected_v14.json').read_text(encoding='utf8'))
CHECK = {v['level']: v for v in json.loads((ROOT / 'verification_v14.json').read_text(encoding='utf8'))}
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

SHORT = {'桌子': '桌', '植物': '植', '椅子': '椅', '地毯': '毯',
         '书架': '架', '雕塑': '雕', '电视': '屏', '树': '树', '床': '床'}
FURN_REF = {'桌子': '#E0CE7B', '植物': '#FCA161', '椅子': '#FBD592',
            '地毯': '#FEE08E', '书架': '#D0B0D9', '雕塑': '#A3965A',
            '电视': '#A2ABC8', '树': '#79A26C', '床': '#FFFBE7'}
FURN_VAR = {'桌子': '#D9C7A3', '植物': '#C08A5E', '椅子': '#B08A55',
            '地毯': '#D9C08A', '书架': '#C8BBA0', '雕塑': '#8A7A66',
            '电视': '#9AA4A6', '树': '#7C8A6A', '床': '#EDE2C9'}
FURN_BLUE = {'桌子': '#A9C0D4', '植物': '#7FA38C', '椅子': '#C6D6E3',
             '地毯': '#B9CFE0', '书架': '#9FB4C9', '雕塑': '#8FA2B4',
             '电视': '#A2ABC8', '树': '#79A26C', '床': '#DCE7EF'}
FURN_GREEN = {'桌子': '#BFC9A8', '植物': '#8FA36C', '椅子': '#D6D8B8',
              '地毯': '#C8CEAB', '书架': '#AAB795', '雕塑': '#8E9A78',
              '电视': '#9AA4A6', '树': '#7C8A6A', '床': '#E2E6D2'}

NOTE = {
    3: 'V 所在房间补 3 格书架｜家具 9→12｜线索不变、全闸门复验',
    4: '双格地毯 ×2｜r2 视觉均匀｜一谎由两卡可察（v14 保留）',
    5: 'E 所在地毯向左延伸成两格｜保留数字距离与一次试位',
    6: '全新 7×7 大盘面｜深度 0 纯演绎｜恰一谎且两卡矛盾可察',
    7: '整体顺时针旋转 90°｜家具与门墙调整｜深度 0→1 一次试位',
}

PROOFS = {
    3: [
        '① 身份未知，依次摘 A—E 卡：仅 A 有合法严格解，六卡全真是推导结果。',
        '② A 卡「B在植物旁边」＋B 卡「A在植物旁边」把 A、B 压到植物同室四邻。',
        '③ C 卡「只有我在地毯上」：三格地毯恰只有 C 站立；',
        '   D 卡「A在B上方、A在C左方」定朝向与 C 的列界。',
        '④ V 卡「D在桌子旁边」＋E 卡「D在我上方」收口 D 与 E 的行列。',
        '⑤ 本轮在 V 所在 R2 房间补 3 格书架 (1,5)(1,6)(2,6)，家具 9→12；',
        '   房间/门/人物/线索全部不动，唯一摆位、深度 0、删卡非冗余复验通过。',
    ],
    4: [
        '① 谎言可察：A 卡「D在椅子上」与 E 卡「D在书架旁边」不可能同真，',
        '   六卡全真无解（alltrue=0），最小矛盾子集仅 2 张。',
        '② 身份：逐一摘卡，A/B/C/D 均无合法摆法；E 摘卡 1 盘、本人 1 格 → 必须假。',
        '③ C 卡「我在地毯上」＋V 卡「B在桌子旁边」定 C 与 B 的位置。',
        '④ 区域无辜人数严格最多 + 行列排他一次定出其余四人。',
        '⑤ 全程 GAC 深度 0；两处双格地毯与 r2 书架/盆栽都进入线索。',
    ],
    5: [
        '① 本关是「降低难度前」的第四关：保留精确数字距离、复合自述卡与一次试位。',
        '② 人物占据格集合与 v11 第四关相同，仅换 id：A→C B→D C→E D→A E→B。',
        '③ 本轮把 E 所在地毯 [8,31] 向左延伸为 [7,8,31]，E 处成同房间连片两格。',
        '④ 线索重设计：V比C靠上1行 / D比A靠下1行 / A在椅子上＋C与A在同一房间 /',
        '   D在B右方 / 只有E在地毯上 / E不在椅子旁边；六卡全部非冗余。',
        '⑤ 严格摘卡后仅 B 成立（1 盘 / 本人 1 格 → 必须假），GAC 深度 1。',
    ],
    6: [
        '① 全新 7×7 盘面：A—F 六名嫌疑人 + V 受害者，4 区域 / 9 扇门 / 17 格家具。',
        '② 目标摆法先经区域规则校验；构造式让盗窃者位置唯一、假卡覆盖其余摆法。',
        '③ 谎言两卡可察：A 卡「我在椅子上」与 B 卡「A在椅子旁边」',
        '   在椅子格 (3,2)(5,4) 上不能同真，最小矛盾子集 = 2。',
        '④ 严格摘卡后仅 B 成立（1 盘 / 本人 1 格 → 必须假），其余六卡全真。',
        '⑤ 大盘面摆法约 254 万，纯位集 + numpy 双实现交叉验证；GAC 深度 0，',
        '   全程无需试位。蓝晒图冷色板与 6×6 四关的暖色系明确区分。',
    ],
    7: [
        '① 由 v13 第6关整体顺时针旋转 90°：room / doors / objects / target 同步映射，',
        '   卡面方位词同步旋转（上→右 / 下→左 / 左→上 / 右→下；行与列互换），题目严格同构。',
        '② 家具调整：椅子 (1,5) 移到 (6,6)；门墙调整：第 3 扇门改到 (5,2)-(5,3)。',
        '③ 深度 0→1：双槽改造线索，把强定位卡换成关系型卡，制造一次试位。',
        '④ 假卡由数字距离句改为 B 卡「D在地毯旁边」，数字距离 3→2 条，',
        '   矛盾子集 = 5，谎言比第 6 关更隐蔽；六卡全部非冗余。',
        '⑤ 深墨绿墙 + 铜金门的旋转档案专属主题，与其余四套主题四向区分。',
    ],
}


def render(d, v):
    level = d['level']
    n = d['grid']
    na = 'ABCDEFV' if n == 7 else 'ABCDEV'
    th = d['visual_theme']
    key = th['key']
    isvar = key != 'reference'
    if key == 'blueprint':
        furn = FURN_BLUE; bg = '#DCE7EF'; ink = '#16324A'; muted = '#4A6B85'
    elif key == 'sepia-rotated':
        furn = FURN_GREEN; bg = '#D9DED0'; ink = '#1D332A'; muted = '#4E6353'
    elif key == 'archive-dark':
        furn = FURN_VAR; bg = '#C9B79A'; ink = '#3F2A1E'; muted = '#6B4A34'
    elif isvar:
        furn = FURN_VAR; bg = '#EFE4CE'; ink = '#3F2A1E'; muted = '#6B4A34'
    else:
        furn = FURN_REF; bg = '#f6f5f0'; ink = '#263747'; muted = '#5b6670'
    room_colors = th['room_colors']
    wall = th['wall']; door_c = th['door']; accent = th['accent']
    pcol = muted
    vcol = '#8A6B45' if isvar else '#967528'

    fig = plt.figure(figsize=(17, 18), facecolor=bg)
    fig.text(.045, .962, f'第{level}关｜v14 · {th["name"]}', fontsize=22, weight='bold', color=ink)
    fig.text(.045, .938,
             f'{d["difficulty_band"]} · {d["truth_pattern"]} · 不预告真假 · '
             f'{n}×{n} · 家具 {d["furniture_count"]} 格 · {th["note"]}',
             fontsize=10.5, color=muted)

    ax = fig.add_axes([.05, .56, .49, .34])
    ax.set_xlim(-.45, n + .1); ax.set_ylim(n + .55, -.45)
    ax.set_aspect('equal'); ax.axis('off')
    room = d['room']; obj = d['objects']; target = d['target']
    blocked_types = {'桌子', '植物', '书架', '雕塑', '电视', '树'}
    for x in range(n * n):
        r, c = divmod(x, n)
        ax.add_patch(Rectangle((c, r), 1, 1, facecolor=room_colors[room[x]],
                               edgecolor=muted, lw=.65, alpha=.9))
        for ob, cells in obj.items():
            if x in cells:
                ax.add_patch(Rectangle((c + .12, r + .12), .76, .76,
                                       facecolor=furn.get(ob, '#cccccc'), alpha=.85,
                                       edgecolor=wall,
                                       linestyle='-' if ob in blocked_types else '--', lw=1.1))
                ax.text(c + .5, r + .81, SHORT.get(ob, '?'), ha='center',
                        fontsize=10 if n == 6 else 9, color=ink)
        if x in target:
            i = target.index(x)
            col = accent if na[i] == d['thief'] else vcol if i == n - 1 else pcol
            ax.add_patch(Circle((c + .5, r + .40), .235, color=col))
            ax.text(c + .5, r + .40, na[i], ha='center', va='center',
                    fontsize=17 if n == 6 else 15, color='white', weight='bold')
    fs = 11 if n == 6 else 9.5
    for r in range(n):
        ax.text(-.25, r + .5, str(r + 1), ha='center', va='center', fontsize=fs, color=muted)
        for c in range(n):
            x = r * n + c
            if c < n - 1 and room[x] != room[x + 1]:
                ax.plot([c + 1, c + 1], [r, r + 1], color=wall, lw=4)
            if r < n - 1 and room[x] != room[x + n]:
                ax.plot([c, c + 1], [r + 1, r + 1], color=wall, lw=4)
    for c in range(n):
        ax.text(c + .5, -.22, str(c + 1), ha='center', fontsize=fs, color=muted)
    ax.add_patch(Rectangle((0, 0), n, n, fill=False, lw=4, edgecolor=wall))
    for x, y in d['doors']:
        r, c = divmod(x, n)
        if y == x + 1:
            ax.plot([c + 1, c + 1], [r + .27, r + .73], color=door_c, lw=7)
        else:
            ax.plot([c + .27, c + .73], [r + 1, r + 1], color=door_c, lw=7)
    ax.text(0, n + .33, '粗线=墙　橙/铜色线=门　桌/植/架/雕不可站　椅/毯可站',
            fontsize=10, color=muted)
    for j in range(4):
        fig.text(.065 + j * .115, .538, f'R{j+1}', fontsize=11, color=ink, weight='bold',
                 bbox=dict(facecolor=room_colors[j], edgecolor=muted,
                           boxstyle='square,pad=0.35', linewidth=1.1))

    fig.text(.58, .90, '正式线索卡（卡面由谓词数据生成）', fontsize=18, weight='bold', color=ink)
    false_i = [i for i, x in enumerate(v['truth_vector']) if not x]
    step = .046 if n == 6 else .041
    for i, c in enumerate(d['display_cards']):
        y = .865 - i * step
        bad = i in false_i
        fig.text(.58, y, na[i], fontsize=17, weight='bold', color=accent if bad else ink)
        txt = '；'.join(c) + ('　（本关唯一假话）' if bad else '')
        fig.text(.62, y, '\n'.join(textwrap.wrap(txt, 23)), fontsize=12,
                 color=accent if bad else ink, va='baseline')
    fig.text(.58, .548,
             '旁边=同室四邻；上下左右只比指定轴，不要求同行/列。\n'
             '复合卡按合取判真；V 必真；真假不预告。\n'
             '每张完整卡单独都不能定位任何人。',
             fontsize=10.5, linespacing=1.8, color=muted)

    fig.text(.045, .500, NOTE[level], fontsize=16, weight='bold', color=ink)
    fig.text(.045, .474, '\n'.join(PROOFS[level]), fontsize=10, va='top',
             linespacing=1.62, color=ink)

    fig.text(.68, .500, '严格摘卡：身份从未知开始', fontsize=13, weight='bold', color=ink)
    ta = fig.add_axes([.68, .312, .275, .16]); ta.axis('off')
    tab = [['身份', '摘卡盘', '本人格', '最终解']] + [
        [a['person'], a['candidate_layouts'], a['own_positions'], a['final_solutions']]
        for a in v['strict_audit']]
    tb = ta.table(cellText=tab, cellLoc='center', bbox=[0, 0, 1, 1])
    tb.auto_set_font_size(False); tb.set_fontsize(10)
    for (r0, c0), cell in tb.get_celld().items():
        cell.set_edgecolor('#cbd1d4')
        cell.set_facecolor('#e7ecee' if r0 == 0 else '#fbfbf8')
    fig.text(.68, .292,
             '规则合法性：通过\n推理可达性：通过（GAC 深度 %d）\n' % v['gac_depth'] +
             '完整摆位 / 盗窃者：均唯一\n'
             f"身份分支：{v['identity_hypotheses']}　传播步：{v['propagation_events']}\n"
             f"全真摆法：{v['all_true_boards']}　矛盾子集：{v['contradiction_min_subset'] or '无'}",
             fontsize=10.5, va='top', linespacing=1.8, color='#337254')

    fig.text(.045, .215, '美术调研选材（差异化命名 / 可站性 / 频次）', fontsize=13,
             weight='bold', color=ink)
    rows = []
    for a in d['asset_mapping']:
        rows.append(f"{a['local_name']}→{a['differentiated_name']}｜"
                    f"官网 id{a['official_id']} {a['official_name']}｜"
                    f"{'可站' if a['occupiable'] else '不可站'}｜"
                    f"{a['freq_levels'] or '—'}/74 关")
    fig.text(.045, .190, '\n'.join(rows[:7]), fontsize=9.6, va='top',
             linespacing=1.65, color=muted)

    co = lambda x: f'({x//n+1},{x%n+1})'
    fig.text(.045, .100, '答案：' + '　'.join(a + co(x) for a, x in zip(na, target))
             + f"　盗窃者 {d['thief']}", fontsize=11, color=ink)
    fig.text(.045, .072,
             '两套全集枚举一致；真假均由严格规则推出，不预设全真或有假话。',
             fontsize=10, color=muted)
    fig.text(.045, .046,
             'GAC 深度仅适用于声明的传播/试位操作集。未写入存档，未做实机渲染或玩家试玩。',
             fontsize=9.5, color='#9a5e35')
    name = f'第{level}关_设计图_v14.png'
    fig.savefig(ROOT / name, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)
    print('已生成', name)


for d in DATA:
    render(d, CHECK[d['level']])
