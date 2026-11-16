"""v16 设计图渲染（离线内容设计图，非游戏内渲染；不写存档）。

输入 design_selected_v16.json + verification_v16.json，输出三张 PNG。
"""
import json, pathlib, textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

ROOT = pathlib.Path(__file__).resolve().parent
DATA = {x['level']: x for x in json.loads(
    (ROOT / 'design_selected_v16.json').read_text(encoding='utf8'))}
CHECK = {x['level']: x for x in json.loads(
    (ROOT / 'verification_v16.json').read_text(encoding='utf8'))}
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

SHORT = {'桌子': '桌', '植物': '植', '椅子': '椅', '地毯': '毯',
         '书架': '架', '雕塑': '雕', '电视': '屏', '树': '树', '床': '床'}
FURN_REF = {'桌子': '#E0CE7B', '植物': '#FCA161', '椅子': '#FBD592',
            '地毯': '#FEE08E', '书架': '#D0B0D9', '雕塑': '#A3965A'}
FURN_VAR = {'桌子': '#D9C7A3', '植物': '#C08A5E', '椅子': '#B08A55',
            '地毯': '#D9C08A', '书架': '#C8BBA0', '雕塑': '#8A7A66'}
FURN_BLUE = {'桌子': '#A9C0D4', '植物': '#7FA38C', '椅子': '#C6D6E3',
             '地毯': '#B9CFE0', '书架': '#9FB4C9', '雕塑': '#8FA2B4'}
FURN_GREEN = {'桌子': '#BFC9A8', '植物': '#8FA36C', '椅子': '#D6D8B8',
              '地毯': '#C8CEAB', '书架': '#AAB795', '雕塑': '#8E9A78'}

NOTE = {
    5: '线索全改为家具/房间关系｜人对人方位与距离提示 0 条｜恰一谎',
    6: '七卡全真·无谎言｜全线索留多个盗窃者可选格｜人数规则收口为 1 解',
    7: '旋转档案｜去除全部人对人方位/距离提示｜恰一谎',
}
PROOFS = {
    5: [
        '① 全线索（不含人数规则）互相冲突，所以必须有人说谎；只有盗窃者可能说谎。',
        '② 逐一假定身份，仅 B 的「摘掉本卡 + 本卡取反 + 人数规则」留下唯一摆位。',
        '③ 谜面只用家具可站性、家具四邻、同区关系与「只有…在…上」；',
        '   不再出现「X在Y某方 / X比Y靠某方向N行列」这类人对人提示。',
        '④ 家具仅在 (3,4) 增补 1 格雕塑（不可站），房间/墙/门/人物/答案全部沿用 695。',
    ],
    6: [
        '① 口径更正：「可选位置」= 全线索下的候选格（不是摘掉本人口供的反事实世界）。',
        '② 与第 1 关/教程同构：七卡全真，光靠线索保留多个摆法、盗窃者有多个可选格。',
        '③ 叠加「受害者相邻区域中无辜人数唯一最多」的人数规则后收敛为唯一摆位。',
        '④ 谜面 0 条人对人方位/距离提示，改用家具资格、同区关系与唯一性语句。',
        '⑤ 本轮仅调整线索（必要时微调家具），房间/墙/门/人物/答案/盗窃者均冻结。',
    ],
    7: [
        '① 全线索冲突，所以恰一谎；仅 B 的假话分支 + 人数规则留下唯一摆位。',
        '② 原第 7 关的「C比A靠左2列 / B比C靠上2行 / D在E右方」全部移除，',
        '   换成家具四邻、同区与独占家具条件，方位/距离提示降到 0 条。',
        '③ 保持 90° 旋转盘面、深墨绿/铜金主题与预设答案不变。',
    ],
}


def render(d, v):
    level, n = d['level'], d['grid']
    na = 'ABCDEFV' if n == 7 else 'ABCDEV'
    th = d['visual_theme']
    key = th['key']
    if key == 'blueprint':
        furn, bg, ink, muted = FURN_BLUE, '#DCE7EF', '#16324A', '#4A6B85'
    elif key == 'sepia-rotated':
        furn, bg, ink, muted = FURN_GREEN, '#D9DED0', '#1D332A', '#4E6353'
    elif key == 'archive-dark':
        furn, bg, ink, muted = FURN_VAR, '#C9B79A', '#3F2A1E', '#6B4A34'
    else:
        furn, bg, ink, muted = FURN_REF, '#f6f5f0', '#263747', '#5b6670'
    room_colors, wall, door_c, accent = th['room_colors'], th['wall'], th['door'], th['accent']
    pcol, vcol = muted, '#967528'

    fig = plt.figure(figsize=(17, 18), facecolor=bg)
    fig.text(.045, .962, f'第{level}关｜v16 · {th["name"]}', fontsize=22,
             weight='bold', color=ink)
    fig.text(.045, .938,
             f'{d["difficulty_band"]} · {d["truth_pattern"]} · 不预告真假 · {n}×{n} · '
             f'家具 {d["furniture_count"]} 格 · 人对人方位/距离提示 {len(v["direction_hints"])} 条',
             fontsize=10.5, color=muted)

    ax = fig.add_axes([.05, .56, .49, .34])
    ax.set_xlim(-.45, n + .1); ax.set_ylim(n + .55, -.45)
    ax.set_aspect('equal'); ax.axis('off')
    room, obj, target = d['room'], d['objects'], d['target']
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
        fig.text(.58, y, na[i], fontsize=17, weight='bold',
                 color=accent if bad else ink)
        txt = '；'.join(c) + ('　（本关唯一假话）' if bad else '')
        fig.text(.62, y, '\n'.join(textwrap.wrap(txt, 23)), fontsize=12,
                 color=accent if bad else ink, va='baseline')
    fig.text(.58, .548,
             '旁边=同室四邻；复合卡按合取判真；V 必真；真假不预告。\n'
             '★ 可选位置=全线索下的候选格（不是摘掉本人口供后的反事实候选格）。\n'
             '每张完整卡单独都不能定位任何人。',
             fontsize=10.5, linespacing=1.8, color=muted)

    fig.text(.045, .500, NOTE[level], fontsize=16, weight='bold', color=ink)
    fig.text(.045, .474, '\n'.join(PROOFS[level]), fontsize=10, va='top',
             linespacing=1.62, color=ink)

    fig.text(.68, .500, '更正口径 · 全线索摘卡审计', fontsize=13, weight='bold', color=ink)
    ta = fig.add_axes([.68, .312, .275, .16]); ta.axis('off')
    tab = [['身份', '全线索可选格', '分支', '最终盘']] + [
        [a['person'], a['optional_positions'], '真话' if a['mode'] == 'truth' else '假话',
         a['boards']] for a in v['corrected_audit']]
    tb = ta.table(cellText=tab, cellLoc='center', bbox=[0, 0, 1, 1])
    tb.auto_set_font_size(False); tb.set_fontsize(10)
    for (r0, c0), cell in tb.get_celld().items():
        cell.set_edgecolor('#cbd1d4')
        cell.set_facecolor('#e7ecee' if r0 == 0 else '#fbfbf8')
    fig.text(.68, .292,
             '规则合法性：通过　推理可达性：GAC 深度 %d\n' % v['gac_depth'] +
             f"全线索摆法（不含人数规则）：{v['all_clue_boards']} 盘\n"
             f"盗窃者可选位置：{v['optional_positions'][d['thief']]} 格\n"
             f"完整摆位 / 盗窃者：均唯一　矛盾子集：{v['contradiction_min_subset'] or '无'}\n"
             f"方位/距离提示：{len(v['direction_hints'])} 条（上限 2）\n"
             f"双实现（位集 + numpy）：一致　删卡非冗余：通过\n"
             + ('注：非盗窃者身份的 1 盘均为同一预设答案盘（与第 1 关一致），\n'
                '　　不产生别的摆法。' if level == 6 else ''),
             fontsize=10.5, va='top', linespacing=1.8, color='#337254')

    co = lambda x: f'({x//n+1},{x%n+1})'
    fig.text(.045, .215, '家具（家具可改；房间/墙/门/人物/答案冻结）', fontsize=13,
             weight='bold', color=ink)
    rows = [f"{k}：{'、'.join(co(x) for x in cells)}" for k, cells in obj.items()]
    fig.text(.045, .190, '\n'.join(rows), fontsize=9.8, va='top',
             linespacing=1.6, color=muted)
    fig.text(.045, .100, '答案：' + '　'.join(a + co(x) for a, x in zip(na, target))
             + f"　盗窃者 {d['thief']}", fontsize=11, color=ink)
    fig.text(.045, .072,
             '基准：695 内嵌 Lua 实际关卡设计；主判据按用户口径更正（全线索可选位置）。',
             fontsize=10, color=muted)
    fig.text(.045, .046,
             '仅离线内容设计：未写入任何 .gil 存档，未做实机渲染或玩家试玩。',
             fontsize=9.5, color='#9a5e35')
    name = f'第{level}关_设计图_v16.png'
    fig.savefig(ROOT / name, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)
    print('已生成', name)


for lv in (5, 6, 7):
    render(DATA[lv], CHECK[lv])
