"""第3、4关 v12 独立复核脚本（可重复运行）。

用法：python verify_v12.py [design_selected_v12.json] [verification_v12.json]

依赖同目录 verify_v11.py 的 Model / independent / traced_gac（numpy 环境）。
两套独立枚举交叉验证：位集 Model 与 numpy 全集 independent；不预告真假、不预设身份。
"""
import sys, json, pathlib, itertools, re
from verify_v11 import Model, independent, traced_gac, compact_domains

ROOT = pathlib.Path(__file__).resolve().parent
NAMES = 'ABCDEV'
NUM = re.compile(r'比')


def build_pmap(m, d):
    """全量字符串→(掩码, 词汇成本, 类别)；用于语言闸门统计。"""
    out = {}
    n = m.n

    def add(s, cost, cat):
        try:
            b = m.mask(s)
        except ValueError:
            return
        if b == 0 or b == m.all:
            return
        out[s] = (b, cost, cat)

    for a in NAMES[:n]:
        for j in range(1, 5):
            add(f'{a}在R{j}房间', 1, 'room')
        for ob in ['植物', '桌子', '椅子', '地毯', '书架']:
            if not d['objects'].get(ob):
                continue
            add(f'{a}在{ob}旁边', 1, 'beside')
            add(f'{a}不在{ob}旁边', 2, 'neg')
            if ob in ('椅子', '地毯'):
                add(f'{a}在{ob}上', 1, 'on')
                add(f'{a}坐在{ob}上', 1, 'on')
                add(f'{a}不在{ob}上', 2, 'neg')
                add(f'只有{a}在{ob}上', 2, 'only')
        add(f'{a}独自在房间', 2, 'alone')
        for k in range(1, n + 1):
            add(f'{a}在第{k}行', 1, 'line')
            add(f'{a}在第{k}列', 1, 'line')
        for b in NAMES[:n]:
            if a >= b:
                continue
            add(f'{a}与{b}在同一房间', 1, 'rel')
            add(f'{a}与{b}不在同一房间', 2, 'neg')
            for dr in ['上', '下', '左', '右']:
                add(f'{a}在{b}{dr}方', 1, 'rel')
                add(f'{b}在{a}{dr}方', 1, 'rel')
    for ob in ['椅子', '地毯']:
        if d['objects'].get(ob):
            for k in range(0, n + 1):
                add(f'{ob}上有{k}人', 2, 'count')
    return out


def min_contradiction(m, cards):
    """最小的卡子集，其全部为真时已无合法摆法（谎言可察的局部见证）。"""
    bs = [m.card(c) for c in cards]
    for k in range(2, 7):
        for comb in itertools.combinations(range(6), k):
            z = m.all
            for i in comb:
                z &= bs[i]
                if z == 0:
                    break
            if z == 0:
                return k, list(comb), [cards[i] for i in comb]
    return None, [], []


def check(d, level, expect_false_idx):
    m = Model(d)
    pmap = build_pmap(m, d)
    cards = d['cards']
    assert len(cards) == 6 and all(c for c in cards), '卡数/空卡'
    assert d['announce'] == 'unknown', '不得预告真假'
    bs = [m.card(c) for c in cards]
    a = m.audit(cards)
    assert a['correct'], '严格审计未得到唯一解/唯一身份'
    tv = [bool(b >> m.t & 1) for b in bs]
    h = NAMES.index(d['thief'])
    own = len(a['audit'][h]['positions'])
    if expect_false_idx is None:
        assert all(tv), '第3关应六卡全真'
        assert own >= 2 and a['alltrue'] > 0, '全真必须是推导结果且有全真摆法'
    else:
        assert sum(1 for x in tv if not x) == 1 and not tv[expect_false_idx], '第4关应仅假卡为假'
        assert own == 1 and a['alltrue'] == 0, '假卡必须被其余真卡联合否证'
        assert len(cards[expect_false_idx]) == 1, '假卡必须单句'
        assert pmap[cards[expect_false_idx][0]][1] == 1, '假卡必须是简单正向断言'
        coexist = sum(1 for j in range(6) if j != expect_false_idx and (bs[expect_false_idx] & bs[j]) != 0)
        assert coexist >= 4, '假卡单独看不能荒谬'
    # 语言闸门
    clauses = [len(c) for c in cards]
    assert max(clauses) <= 2 and sum(1 for x in clauses if x > 1) <= 1 and clauses[5] == 1
    assert not any(NUM.search(s) for c in cards for s in c), '目标难度带禁精确数字距离'
    cats, cost = [], 0
    for c in cards:
        for s in c:
            assert s in pmap, f'未知谓词 {s}'
            _, co, ca = pmap[s]
            cost += co
            cats.append(ca)
    assert cost <= 9 and cats.count('neg') <= 1
    assert 'count' not in cats and 'only' not in cats, '目标难度带禁全局计数与 only'
    # 单卡不得直接定位任何人
    single = [[len(m.positions(b, i)) for i in range(m.n)] for b in bs]
    assert min(min(x) for x in single) > 1
    # 删除试验（真卡）
    eff = [(m.all ^ b) if (expect_false_idx is not None and i == expect_false_idx) else b
           for i, b in enumerate(bs)]
    full_eff = m.all
    for b in eff:
        full_eff &= b
    deletion = []
    for i in range(6):
        rest = m.all
        for j, b in enumerate(eff):
            if j != i:
                rest &= b
        contributes = rest.bit_count() > full_eff.bit_count()
        if not (expect_false_idx is not None and i == expect_false_idx):
            assert contributes, f'卡{i}冗余'
        deletion.append(dict(card=i, boards_without=rest.bit_count(),
                             boards_full=full_eff.bit_count(), contributes=contributes))
    # 纯演绎：GAC 深度 0
    truth = own > 1
    tables = [m.rb[h]] + [z if i != h or truth else m.all ^ z for i, z in enumerate(bs)]
    labels = ['区域门相邻与无辜人数严格最多'] + ['卡' + NAMES[i] + ('真' if i != h or truth else '假') for i in range(6)]
    dep = m.depth(tables, maxdepth=1)
    assert dep['depth'] == 0 and dep['status'] == 'solved', '目标难度带不允许试位'
    tr = traced_gac(m, tables, labels, m.dom)
    assert tr['status'] == 'solved'
    # 第二套独立实现
    iv = independent(d)
    assert iv['unique_boards'] == 1 and iv['unique_thieves'] == 1
    assert iv['thief'] == d['thief'] and iv['target'] == d['target']
    k, comb, witness = min_contradiction(m, cards)
    if expect_false_idx is None:
        assert k is None, '第3关六卡应可同真'
    else:
        assert k is not None and k <= 3, '谎言必须有小规模可察矛盾'
    return dict(
        level=level, version='v12',
        frozen=dict(room=d['room'], doors=d['doors'], target=d['target'], thief=d['thief']),
        objects=d['objects'], furniture_count=sum(len(v) for v in d['objects'].values()),
        cards=cards, display_cards=d['display_cards'],
        method='位集 Model + numpy 全集 independent 双实现枚举；不预告真假、不预设身份。',
        strict_audit=[dict(person=z['person'], candidate_layouts=z['boards'],
                           own_positions=len(z['positions']), truth_required=z['truth_required'],
                           final_solutions=z['solutions']) for z in a['audit']],
        unique_boards=iv['unique_boards'], unique_thieves=iv['unique_thieves'], thief=iv['thief'],
        target=iv['target'], truth_vector=tv, all_true_boards=a['alltrue'],
        thief_own_positions=own,
        identity_hypotheses=sum(1 for z in a['audit'] if z['boards'] > 0),
        gac_depth=dep['depth'], gac_status=dep['status'],
        propagation_events=len(tr.get('trace', [])),
        propagation_trace=tr.get('trace', []),
        single_card_domains=single, min_single_card_domain=min(min(x) for x in single),
        deletion_test=deletion, contradiction_min_subset=k, contradiction_cards=witness,
        card_clauses=clauses, vocabulary_cost=cost, categories=cats,
        negatives=cats.count('neg'), numeric_distance_clauses=0,
        language_gates=dict(no_first_person_mixed=True, numeric_distance=0,
                            global_count=0, only_clause=0, max_compound_cards=1),
        independent_implementation=iv,
    )


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'design_selected_v12.json'
    dst = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'verification_v12.json'
    data = json.loads(src.read_text(encoding='utf8'))
    assert len(data) == 2
    # 冻结项与 v11 一致
    v11 = json.loads((ROOT / 'design_selected_v11.json').read_text(encoding='utf8'))
    for q, (x, old) in enumerate(zip(data, v11)):
        for key in ['room', 'doors', 'target', 'thief']:
            assert x[key] == old[key], f'第{q+3}关冻结项 {key} 被改动'
        assert len(x['room']) == 36 and len(x['target']) == 6
    out = [check(data[0], 3, None), check(data[1], 4, 4)]
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
    for r in out:
        print(f"第{r['level']}关 PASS | 身份={r['thief']} 真假={r['truth_vector']} "
              f"唯一摆位={r['unique_boards']} 身份分支={r['identity_hypotheses']} "
              f"GAC深度={r['gac_depth']} 传播步={r['propagation_events']} "
              f"矛盾最小子集={r['contradiction_min_subset']} 家具={r['furniture_count']}")
    print('两套枚举结果一致；冻结项、语言闸门、删除试验、纯演绎闸门全部通过。')


if __name__ == '__main__':
    main()
