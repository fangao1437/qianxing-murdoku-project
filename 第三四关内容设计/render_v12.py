"""第3、4关 v12 设计图（内容设计用，非游戏内渲染）。"""
import json, pathlib, textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

ROOT = pathlib.Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'design_selected_v12.json').read_text(encoding='utf8'))
CHECK = json.loads((ROOT / 'verification_v12.json').read_text(encoding='utf8'))
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
N = 'ABCDEV'
colors = ['#e3eef7', '#f9ead0', '#e3f0e4', '#eee4f5']

proofs = [[
    '① 身份未知，依次摘 A—E 卡：仅 A 有合法严格解。',
    '   A 摘卡 2 盘 / 本人 2 格 → 必须真；B、C 各 1 格却卡真 → 排除；',
    '   D、E 无摆法。故盗窃者 A，六卡全真是推导结果，不是预告。',
    '② B 卡「A在植物旁边」＋V 卡「B在植物旁边」把 A、B 压到',
    '   植物(1,1)的同室四邻 (1,2)/(2,1)；A 卡「我在B上方」定朝向',
    '   → A=(1,2)、B=(2,1)。这是第一处两来源交集。',
    '③ A 卡「C左方」只给 C 列>2；C 卡「与A同室」＋R1 房间轮廓',
    '   ＋已占行列 → C=(3,3)。精确行距/列距是结果，卡面无数字。',
    '④ D 卡「我在桌子旁边」：本版只留 (4,4) 一张桌，候选',
    '   (3,4)/(4,3)/(5,4)；C 落位后 D=(5,4)。E 卡「D在我上方」',
    '   逼 E 在其下方，E 只能在第 6 行。',
    '⑤ 尾盘两种：E(6,5)/V(4,6) 或 E(6,6)/V(4,5)。后者令 V 相邻',
    '   R1 与 R3 无辜人数并列 2，违反严格最多 → E=(6,5)、V=(4,6)。',
], [
    '① 谎言可察（不需身份枚举）：A 卡「D在椅子上 且 我与D同室」',
    '   与 E 卡「A在椅子旁边」在「每行每列各一人」下不可能同真。',
    '   两把椅子在 (1,2)/(6,5)，A 若与 D 同室且紧邻椅子，必与 D',
    '   同行或同列。故六卡全真无解（alltrue=0），必有假话。',
    '② 身份：逐一假定摘卡，A/B/C/D 均无合法摆法；E 摘卡 1 盘、',
    '   本人 1 格 → 严格规则要求必须说假。故盗窃者 E，假话即 E 卡，',
    '   其余五卡全真。',
    '③ 五真卡＋¬E卡进入传播：C 卡「我在地毯上」→ C=(2,3)；',
    '   V 卡「B在桌子旁边」→ B=(1,2)；A 卡使 D 落在两把椅子之一。',
    '④ 区域无辜人数严格最多＋行列排他一次性收口：A=(5,4)、',
    '   D=(6,5)、E=(3,1)、V=(4,6)。全程 GAC 深度 0，无需试位。',
    '⑤ 复核：最终盘 A 不在任何椅子旁（椅子同室四邻格均被行列占用），',
    '   E 卡确假；与「只有盗窃者可能说谎」「单格必须假」一致。',
]]

for q, (d, v) in enumerate(zip(DATA, CHECK)):
    fig = plt.figure(figsize=(17, 17), facecolor='#f6f5f0')
    level = q + 3
    fig.text(.045, .958, f'第{level}关 · 方案' + ('C' if q == 0 else 'B') + '｜Easy 与 Medium 之间 优化版 v12',
             fontsize=24, weight='bold', color='#263747')
    subtitle = ('房间 / 门 / 全员答案站位 / 盗窃者身份保持 · 家具 7→6（删 (6,4) 第二张桌）· '
                '不预告真假 · 无谎可正向验证') if q == 0 else (
               '房间 / 门 / 全员答案站位 / 盗窃者身份保持 · 家具 6 格不变 · '
               '不预告真假 · 谎言要素专项（两卡矛盾）')
    fig.text(.045, .932, subtitle, fontsize=11, color='#5b6670')
    ax = fig.add_axes([.05, .55, .49, .34])
    ax.set_xlim(-.45, 6.1); ax.set_ylim(6.55, -.45); ax.set_aspect('equal'); ax.axis('off')
    room = d['room']; obj = d['objects']; target = d['target']
    short = {'桌子': '桌', '植物': '植', '椅子': '椅', '地毯': '毯'}
    for x in range(36):
        r, c = divmod(x, 6)
        ax.add_patch(Rectangle((c, r), 1, 1, facecolor=colors[room[x]], edgecolor='#acb6bd', lw=.65))
        for ob, cells in obj.items():
            if x in cells:
                ax.add_patch(Rectangle((c + .12, r + .12), .76, .76,
                                       facecolor={'桌子': '#87939a', '植物': '#6e9c77',
                                                  '椅子': '#deb679', '地毯': '#c197a4'}[ob],
                                       alpha=.7, edgecolor='#62666b',
                                       linestyle='-' if ob in ['桌子', '植物'] else '--'))
                ax.text(c + .5, r + .81, short[ob], ha='center', fontsize=10)
        if x in target:
            i = target.index(x)
            col = '#bb513c' if N[i] == d['thief'] else '#967528' if i == 5 else '#2c5272'
            ax.add_patch(Circle((c + .5, r + .40), .235, color=col))
            ax.text(c + .5, r + .40, N[i], ha='center', va='center', fontsize=17,
                    color='white', weight='bold')
    for r in range(6):
        ax.text(-.25, r + .5, str(r + 1), ha='center', va='center', fontsize=11)
        for c in range(6):
            x = r * 6 + c
            if c < 5 and room[x] != room[x + 1]:
                ax.plot([c + 1, c + 1], [r, r + 1], color='#27333c', lw=4)
            if r < 5 and room[x] != room[x + 6]:
                ax.plot([c, c + 1], [r + 1, r + 1], color='#27333c', lw=4)
    for c in range(6):
        ax.text(c + .5, -.22, str(c + 1), ha='center', fontsize=11)
    ax.add_patch(Rectangle((0, 0), 6, 6, fill=False, lw=4, edgecolor='#27333c'))
    for x, y in d['doors']:
        r, c = divmod(x, 6)
        if y == x + 1:
            ax.plot([c + 1, c + 1], [r + .27, r + .73], color='#e38636', lw=7)
        else:
            ax.plot([c + .27, c + .73], [r + 1, r + 1], color='#e38636', lw=7)
    ax.text(0, 6.33, '粗线=墙　橙线=门　桌/植不可站　椅/毯可站', fontsize=10)

    fig.text(.58, .88, '正式线索卡（卡面由谓词数据生成）', fontsize=18, weight='bold', color='#263747')
    for i, c in enumerate(d['display_cards']):
        y = .842 - i * .046
        fig.text(.58, y, N[i], fontsize=17, weight='bold',
                 color='#bb513c' if (q == 1 and i == 4) else '#263747')
        txt = '；'.join(c) + ('　（本关唯一假话）' if (q == 1 and i == 4) else '')
        fig.text(.62, y, '\n'.join(textwrap.wrap(txt, 23)), fontsize=12,
                 color='#bb513c' if (q == 1 and i == 4) else '#263747', va='baseline')
    fig.text(.58, .548,
             '旁边=同室四邻；上下左右只比指定轴，不要求同行/列。\n'
             'V 必真；复合卡按合取判真；真假不预告。\n'
             '每张完整卡单独都不能定位任何人。',
             fontsize=10.5, linespacing=1.8, color='#5b6670')
    for j in range(4):
        fig.text(.065 + j * .115, .528, f'■ R{j+1}', fontsize=12,
                 color=['#5a82a2', '#b28640', '#62906a', '#9473ac'][j])

    fig.text(.045, .492, '几何交集 → 同室收口 → 人数收口（无谎）' if q == 0
             else '两卡矛盾 → 必有假话 → 身份收口 → 纯演绎（一谎）',
             fontsize=17, weight='bold', color='#263747')
    fig.text(.045, .465, '\n'.join(proofs[q]), fontsize=10, va='top',
             linespacing=1.62, color='#263747')

    fig.text(.68, .492, '严格摘卡：身份从未知开始', fontsize=13, weight='bold')
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
             '规则合法性：通过\n推理可达性：通过（GAC 深度 0）\n'
             '完整摆位 / 盗窃者：均唯一\n'
             f"身份分支：{v['identity_hypotheses']}　传播步：{v['propagation_events']}\n"
             f"全真摆法：{v['all_true_boards']}　家具占格：{v['furniture_count']}",
             fontsize=10.5, va='top', linespacing=1.8, color='#337254')

    if q == 0:
        fig.text(.045, .21, '无谎可正向验证｜v12 相对 v11 的改动', fontsize=14, weight='bold')
        fig.text(.045, .18,
                 '六卡同真仍有 2 盘（alltrue=2），最后一步必须由区域无辜人数唯一最多收口；'
                 '因此「六卡全真」不是题面告知，而是可推出的结果。\n'
                 '改：删去 (6,4) 的第二张桌子，家具 7→6，D 的桌旁候选由 2 格变 3 格再收口；'
                 '卡面谓词未改。\n'
                 '新增：卡序 speaker / self_ref 明示，「我」不再靠手工改写维护。',
                 fontsize=11, va='top', linespacing=1.8, color='#263747')
    else:
        fig.text(.045, .21, '谎言要素专项｜v12 相对 v11 的改动', fontsize=14, weight='bold')
        fig.text(.045, .18,
                 '假卡由「B比D靠下1行」（精确数字距离）换成「A在椅子旁边」（简单正向断言）；'
                 '与 A 卡构成 2 卡矛盾，玩家不用穷举即可察觉必有假话。\n'
                 '试位深度 1 → 0（官网 FAQ：无需猜测）；A 假设 6 盘 3 格 → 0 盘；'
                 '身份分支 2 → 1。\n'
                 'C 卡「只有我在地毯上」→「我在地毯上」；V 卡改「B在桌子旁边」，'
                 '全关无内部 R1/R2 编号、无精确数字、无否定。',
                 fontsize=11, va='top', linespacing=1.8, color='#263747')

    co = lambda x: f'({x//6+1},{x%6+1})'
    fig.text(.045, .095, '答案：' + '　'.join(n + co(x) for n, x in zip(N, target))
             + f"　盗窃者 {d['thief']}", fontsize=11)
    fig.text(.045, .067,
             '两套全集枚举一致；真假均由严格规则推出，不预设第3关全真或第4关有假话。',
             fontsize=10, color='#5b6670')
    fig.text(.045, .043,
             '难度带 Easy 与 Medium 之间；GAC 深度仅适用于声明的传播操作集。'
             '未写入存档，未做实机渲染或玩家试玩。',
             fontsize=9.5, color='#9a5e35')
    name = f'第{level}关_方案' + ('C' if q == 0 else 'B') + '_设计图_v12.png'
    fig.savefig(ROOT / name, dpi=140, facecolor=fig.get_facecolor())
    plt.close(fig)
    print('已生成', name)
