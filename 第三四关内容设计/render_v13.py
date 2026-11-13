"""第3/4/5/6关 v13 设计图（内容设计用，非游戏内渲染）。

第3关沿用 reference 明亮色板；第4/6关用档案卷宗 variant 浅色；
第5关用深棕墨 + 火漆红，形成视觉区分。
"""
import json, pathlib, textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'design_selected_v13.json').read_text(encoding='utf8'))
CHECK = {v['level']: v for v in json.loads((ROOT / 'verification_v13.json').read_text(encoding='utf8'))}
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
N = 'ABCDEV'
SHORT = {'桌子': '桌', '植物': '植', '椅子': '椅', '地毯': '毯',
         '书架': '架', '雕塑': '雕', '电视': '屏', '树': '树', '床': '床'}
FURN_REF = {'桌子': '#E0CE7B', '植物': '#FCA161', '椅子': '#FBD592',
            '地毯': '#FEE08E', '书架': '#D0B0D9', '雕塑': '#A3965A',
            '电视': '#A2ABC8', '树': '#79A26C', '床': '#FFFBE7'}
FURN_VAR = {'桌子': '#D9C7A3', '植物': '#C08A5E', '椅子': '#B08A55',
            '地毯': '#D9C08A', '书架': '#C8BBA0', '雕塑': '#8A7A66',
            '电视': '#9AA4A6', '树': '#7C8A6A', '床': '#EDE2C9'}

PROOFS = {
    3: [
        '① 身份未知，依次摘 A—E 卡：仅 A 有合法严格解。',
        '   A 摘卡 2 盘 / 本人 2 格 → 必须真；B/C 单格却卡真 → 排除；',
        '   D/E 无摆法。故盗窃者 A，六卡全真是推导结果。',
        '② A 卡「B在植物旁边」＋B 卡「A在植物旁边」把 A、B 压到',
        '   植物 (1,1) 的同室四邻 (1,2)/(2,1)，构成第一处两来源交集。',
        '③ C 卡「只有我在地毯上」：三格地毯 (3,2)(3,3)(4,2) 恰只有 C 站，',
        '   D 卡「A在B上方、A在C左方」定朝向与 C 的列界，',
        '   配合 E 卡与 R1 房间轮廓 → C=(3,3)。',
        '④ V 卡「D在桌子旁边」：三张桌 (2,3)(4,4)(6,4) 的候选被行列与',
        '   E 卡「D在我上方」收口 → D=(5,4)，E 只能在第 6 行。',
        '⑤ 尾盘两种：E(6,5)/V(4,6) 或 E(6,6)/V(4,5)；后者令 V 相邻',
        '   R1 与 R3 无辜人数并列 2，违反严格最多 → E=(6,5)、V=(4,6)。',
    ],
    4: [
        '① 谎言可察：A 卡「D在椅子上」与 E 卡「D在书架旁边」',
        '   在两把椅子 (1,2)/(6,5) 与书架 (2,5) 的几何下不可能同真。',
        '   故六卡全真无解（alltrue=0），必有假话，且最小矛盾子集仅 2 张。',
        '② 身份：逐一摘卡，A/B/C/D 均无合法摆法；E 摘卡 1 盘、',
        '   本人 1 格 → 严格规则要求必须说假。故盗窃者 E，其余五卡全真。',
        '③ C 卡「我在地毯上」：两处双格地毯 (2,2)-(2,3) / (6,1)-(6,2)',
        '   → C=(2,3)；V 卡「B在桌子旁边」→ B=(1,2)。',
        '④ B 卡「V在植物旁边」与 D 卡「A在我上方」继续收口，',
        '   区域无辜人数严格最多 + 行列排他一次定出 A=(5,4)、',
        '   D=(6,5)、E=(3,1)、V=(4,6)。',
        '⑤ 全程 GAC 深度 0，无需试位；r2 补书架 / 盆栽使视觉均匀，',
        '   且书架与盆栽都进入了线索，不是装饰。',
    ],
    5: [
        '① 本关是「降低难度前」的第四关：保留精确数字距离、复合自述卡',
        '   与一次试位（GAC 深度 1），难度高于第 3/4 关。',
        '② 人物占据格集合与 v11 第四关完全相同，仅换 id：',
        '   A→C B→D C→E D→A E→B（V 不动），卡片随人一起换归属。',
        '③ 门墙：把 (3,4) 从 R2 划入 R3；首扇门由 (2,3)-(2,4)',
        '   移到 (1,3)-(1,4)。门格不与不可站家具重叠。',
        '④ 家具：桌子移 (4,4)、盆栽移 (1,1)、补卷宗柜 (2,5)；',
        '   配合深棕墨墙 + 火漆红门做视觉区分。',
        '⑤ 严格摘卡后仅 B 成立（1 盘 / 本人 1 格 → 必须假），',
        '   B 卡「D比A靠下1行」确为假；六张卡全部非冗余。',
    ],
    6: [
        '① 几何与第 3 关逐字段相同：房间 / 门 / 人物分布 / 九格家具全不动。',
        '   v12 旧线索在这套新家具下仍然成立，因此同一盘面可承载更高难度。',
        '② 加难到 Medium 档：引入精确数字距离「C比V靠上2行」，',
        '   两张复合卡、一条否定句「D不在植物旁边」，共 4 个身份分支。',
        '③ 谎言更隐蔽：六卡同真无解，但最小矛盾子集为 6，',
        '   玩家无法像第 4 关那样靠两张卡就识破，必须多源交叉。',
        '④ 严格摘卡后仅 B 成立（1 盘 / 本人 1 格 → 必须假），',
        '   假卡正是 B 的「C比V靠上2行」；其余五卡全真。',
        '⑤ 视觉区分沿用第 4 关同款档案卷宗浅色（米纸 / 深棕墨 / 铜色门），',
        '   家具改差异化命名：勘验台 / 卷宗柜 / 讯问椅 / 证物盆栽。',
    ],
}

NOTE = {
    3: '新家具规格｜三格地毯 + 三张桌',
    4: '双格地毯 ×2｜r2 视觉均匀｜一谎由两卡可察',
    5: '门墙 / 家具 / id 全改｜保留降难度前较难结构',
    6: '与第3关同几何｜Medium 加难线索｜与第4关同款视觉',
}


def render(d, v):
    level = d['level']
    th = d['visual_theme']
    isvar = th['key'] != 'reference'
    furn = FURN_VAR if isvar else FURN_REF
    room_colors = th['room_colors']
    wall = th['wall']; door = th['door']; accent = th['accent']
    bg = ('#C9B79A' if th['key'] == 'archive-dark'
          else '#EFE4CE' if isvar else '#f6f5f0')
    ink = '#3F2A1E' if isvar else '#263747'
    muted = '#6B4A34' if isvar else '#5b6670'
    pcol = '#6B4A34' if isvar else '#2c5272'
    vcol = '#8A6B45' if isvar else '#967528'

    fig = plt.figure(figsize=(17, 17), facecolor=bg)
    fig.text(.045, .958, f'第{level}关｜v13 · {th["name"]}', fontsize=22, weight='bold', color=ink)
    fig.text(.045, .932,
             f'{d["difficulty_band"]} · {d["truth_pattern"]} · 不预告真假 · '
             f'家具 {d["furniture_count"]} 格 · {th["note"]}',
             fontsize=10.5, color=muted)

    ax = fig.add_axes([.05, .55, .49, .34])
    ax.set_xlim(-.45, 6.1); ax.set_ylim(6.55, -.45); ax.set_aspect('equal'); ax.axis('off')
    room = d['room']; obj = d['objects']; target = d['target']
    blocked_types = {'桌子', '植物', '书架', '雕塑', '电视', '树'}
    for x in range(36):
        r, c = divmod(x, 6)
        ax.add_patch(Rectangle((c, r), 1, 1, facecolor=room_colors[room[x]],
                               edgecolor=muted, lw=.65, alpha=.9))
        for ob, cells in obj.items():
            if x in cells:
                ax.add_patch(Rectangle((c+.12, r+.12), .76, .76, facecolor=furn.get(ob, '#cccccc'),
                                       alpha=.85, edgecolor=wall,
                                       linestyle='-' if ob in blocked_types else '--', lw=1.1))
                ax.text(c+.5, r+.81, SHORT.get(ob, '?'), ha='center', fontsize=10, color=ink)
        if x in target:
            i = target.index(x)
            col = accent if N[i] == d['thief'] else vcol if i == 5 else pcol
            ax.add_patch(Circle((c+.5, r+.40), .235, color=col))
            ax.text(c+.5, r+.40, N[i], ha='center', va='center', fontsize=17,
                    color='white', weight='bold')
    for r in range(6):
        ax.text(-.25, r+.5, str(r+1), ha='center', va='center', fontsize=11, color=muted)
        for c in range(6):
            x = r*6+c
            if c < 5 and room[x] != room[x+1]:
                ax.plot([c+1, c+1], [r, r+1], color=wall, lw=4)
            if r < 5 and room[x] != room[x+6]:
                ax.plot([c, c+1], [r+1, r+1], color=wall, lw=4)
    for c in range(6):
        ax.text(c+.5, -.22, str(c+1), ha='center', fontsize=11, color=muted)
    ax.add_patch(Rectangle((0, 0), 6, 6, fill=False, lw=4, edgecolor=wall))
    for x, y in d['doors']:
        r, c = divmod(x, 6)
        if y == x+1:
            ax.plot([c+1, c+1], [r+.27, r+.73], color=door, lw=7)
        else:
            ax.plot([c+.27, c+.73], [r+1, r+1], color=door, lw=7)
    ax.text(0, 6.33, '粗线=墙　橙/铜线=门　桌/植/架/雕不可站　椅/毯可站', fontsize=10, color=muted)
    for j in range(4):
        fig.text(.065+j*.115, .528, f'■ R{j+1}', fontsize=12, color=room_colors[j])
    fig.text(.58, .528, th['name'], fontsize=11, color=accent, weight='bold')

    fig.text(.58, .88, '正式线索卡（卡面由谓词数据生成）', fontsize=18, weight='bold', color=ink)
    false_i = [i for i, x in enumerate(v['truth_vector']) if not x]
    for i, c in enumerate(d['display_cards']):
        y = .842 - i*.046
        bad = i in false_i
        fig.text(.58, y, N[i], fontsize=17, weight='bold', color=accent if bad else ink)
        txt = '；'.join(c) + ('　（本关唯一假话）' if bad else '')
        fig.text(.62, y, '\n'.join(textwrap.wrap(txt, 23)), fontsize=12,
                 color=accent if bad else ink, va='baseline')
    fig.text(.58, .548,
             '旁边=同室四邻；上下左右只比指定轴，不要求同行/列。\n'
             '复合卡按合取判真；V 必真；真假不预告。\n'
             '每张完整卡单独都不能定位任何人。',
             fontsize=10.5, linespacing=1.8, color=muted)

    fig.text(.045, .492, NOTE[level], fontsize=17, weight='bold', color=ink)
    fig.text(.045, .465, '\n'.join(PROOFS[level]), fontsize=10, va='top',
             linespacing=1.62, color=ink)

    fig.text(.68, .492, '严格摘卡：身份从未知开始', fontsize=13, weight='bold', color=ink)
    ta = fig.add_axes([.68, .305, .275, .16]); ta.axis('off')
    tab = [['身份', '摘卡盘', '本人格', '最终解']] + [
        [a['person'], a['candidate_layouts'], a['own_positions'], a['final_solutions']]
        for a in v['strict_audit']]
    tb = ta.table(cellText=tab, cellLoc='center', bbox=[0, 0, 1, 1])
    tb.auto_set_font_size(False); tb.set_fontsize(10)
    for (r0, c0), cell in tb.get_celld().items():
        cell.set_edgecolor('#cbd1d4')
        cell.set_facecolor('#e7ecee' if r0 == 0 else '#fbfbf8')
    fig.text(.68, .285,
             '规则合法性：通过\n推理可达性：通过（GAC 深度 %d）\n' % v['gac_depth'] +
             '完整摆位 / 盗窃者：均唯一\n'
             f"身份分支：{v['identity_hypotheses']}　传播步：{v['propagation_events']}\n"
             f"全真摆法：{v['all_true_boards']}　矛盾子集：{v['contradiction_min_subset'] or '无'}",
             fontsize=10.5, va='top', linespacing=1.8, color='#337254')

    fig.text(.045, .21, '美术调研选材（差异化命名 / 可站性 / 频次）', fontsize=13, weight='bold', color=ink)
    rows = []
    for a in d['asset_mapping']:
        rows.append(f"{a['local_name']}→{a['differentiated_name']}｜"
                    f"官网 id{a['official_id']} {a['official_name']}｜"
                    f"{'可站' if a['occupiable'] else '不可站'}｜"
                    f"{a['freq_levels'] or '—'}/74 关")
    fig.text(.045, .185, '\n'.join(rows[:6]), fontsize=9.6, va='top',
             linespacing=1.65, color=muted)

    co = lambda x: f'({x//6+1},{x%6+1})'
    fig.text(.045, .095, '答案：' + '　'.join(n+co(x) for n, x in zip(N, target))
             + f"　盗窃者 {d['thief']}", fontsize=11, color=ink)
    fig.text(.045, .067,
             '两套全集枚举一致；真假均由严格规则推出，不预设全真或有假话。',
             fontsize=10, color=muted)
    fig.text(.045, .043,
             'GAC 深度仅适用于声明的传播/试位操作集。未写入存档，未做实机渲染或玩家试玩。',
             fontsize=9.5, color='#9a5e35')
    name = f'第{level}关_设计图_v13.png'
    fig.savefig(ROOT / name, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)
    print('已生成', name)


for d in DATA:
    render(d, CHECK[d['level']])
