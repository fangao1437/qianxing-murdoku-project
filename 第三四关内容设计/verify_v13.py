"""第3/4/5/6关 v13 独立复核（可重复运行）。

用法：python verify_v13.py [design_selected_v13.json] [verification_v13.json]

依赖同目录 murdoku_engine.py（可配置家具类型的位集 + numpy 双实现枚举）。
每关闸门按难度带分别设定；冻结项与来源版本逐字段核对。
"""
import sys, json, pathlib, re, itertools
sys.set_int_max_str_digits(200000)
from murdoku_engine import (Model, independent, traced_gac, validate_geometry,
                            OBJECT_REGISTRY, OCCUPY, BLOCK, NAMES)

ROOT = pathlib.Path(__file__).resolve().parent
NUMERIC = re.compile(r'比')
INTERNAL_ROOM = re.compile(r'在R[1-4]房间|在第\d+(行|列)')


def clause_cost(s):
    if NUMERIC.search(s):
        return 3, 'numeric'
    if '不在' in s:
        return 2, 'neg'
    if re.search(r'上有\d+人', s):
        return 2, 'count'
    if s.startswith('只有'):
        return 2, 'only'
    if '独自在房间' in s:
        return 2, 'alone'
    if INTERNAL_ROOM.search(s):
        return 1, 'internal'
    if '旁边' in s:
        return 1, 'beside'
    if '同一房间' in s or s.endswith('方'):
        return 1, 'rel'
    return 1, 'on'


def min_contradiction(m, cards):
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


def check(d, level):
    cards = d['cards']
    m = Model(d)
    a = m.audit(cards)
    assert a['correct'], f'第{level}关严格审计未得到唯一解/唯一身份'
    tv = m.truth_vector(cards)
    h = NAMES.index(d['thief'])
    own = len(a['audit'][h]['positions'])
    nfalse = sum(1 for x in tv if not x)
    if level != 3:
        assert nfalse == 1 and not tv[h], f'第{level}关应仅盗窃者卡为假'
        assert own == 1 and a['alltrue'] == 0, f'第{level}关谎言必须被其余真卡联合否证'
    else:
        assert nfalse == 0 and own >= 2 and a['alltrue'] > 0, '第3关应六卡全真且可正向验证'

    clauses = [len(c) for c in cards]
    ncomp = sum(1 for x in clauses if x > 1)
    cats = [clause_cost(s)[1] for c in cards for s in c]
    assert clauses[5] == 1, 'V 卡必须单句'
    if level in (3, 4):
        assert max(clauses) <= 2 and ncomp <= 1, 'Easy↔Medium 至多 1 张复合卡'
        assert 'numeric' not in cats and 'count' not in cats, 'Easy↔Medium 禁精确数字距离/全局计数'
        assert 'internal' not in cats, 'Easy↔Medium 卡面禁内部区域/行列编号'
        assert cats.count('neg') <= 1
    elif level == 5:
        assert max(clauses) <= 2 and ncomp <= 1
        assert 'numeric' in cats, '第5关应保留降难度前的精确数字距离'
        assert 'internal' not in cats
    else:
        assert max(clauses) <= 2 and ncomp == 2, '第6关应有 2 张复合卡'
        assert 'numeric' in cats, '第6关应有精确数字距离'
        assert 'internal' not in cats
        assert cats.count('neg') <= 2 and cats.count('count') == 0

    single = [[len(m.positions(b, i)) for i in range(6)] for b in a['bs']]
    assert min(min(x) for x in single) > 1, '存在单卡直接定位'

    # 删卡严格非冗余（假卡跳过）
    deletion = []
    for i in range(6):
        if nfalse and i == h:
            deletion.append(dict(card=i, skipped=True, reason='假卡由其余真卡联合否证'))
            continue
        cc = [list(c) for c in cards]
        cc[i] = []
        a2 = m.audit(cc)
        assert not a2['correct'], f'第{level}关卡{i}冗余'
        deletion.append(dict(card=i, correct_after_removal=a2['correct'],
                             solutions_after_removal=a2['solutions'], contributes=True))

    truth = own > 1
    tables = [m.rb[h]] + [z if i != h or truth else m.all ^ z for i, z in enumerate(a['bs'])]
    labels = ['区域门相邻与无辜人数严格最多'] + ['卡' + NAMES[i] + ('真' if i != h or truth else '假')
                                          for i in range(6)]
    dep = m.depth(tables, maxdepth=1)
    want_depth = 1 if level == 5 else 0
    assert dep['depth'] == want_depth, f'第{level}关试位深度应为 {want_depth}，实为 {dep["depth"]}'
    tr = traced_gac(m, tables, labels, m.dom)
    k, comb, witness = min_contradiction(m, cards)
    if level == 3:
        assert k is None, '第3关六卡应可同真'
    elif level == 4:
        assert k is not None and k <= 2, '第4关谎言应由两卡矛盾直接可察'
    elif level == 6:
        assert k is None or k >= 3, '第6关谎言不应由两卡即可识破'

    iv = independent(d)
    assert iv['unique_boards'] == 1 and iv['unique_thieves'] == 1
    assert iv['truth'] == tv

    return dict(level=level, version='v13',
                difficulty_band=d['difficulty_band'], truth_pattern=d['truth_pattern'],
                visual_theme=d['visual_theme']['name'],
                frozen=dict(room=d['room'], doors=d['doors'], target=d['target'], thief=d['thief']),
                objects=d['objects'], furniture_count=d['furniture_count'],
                cards=cards, display_cards=d['display_cards'],
                method='位集 Model + numpy 全集 independent 双实现枚举；不预告真假、不预设身份。',
                strict_audit=[dict(person=z['person'], candidate_layouts=z['boards'],
                                   own_positions=len(z['positions']),
                                   truth_required=z['truth_required'],
                                   final_solutions=z['solutions']) for z in a['audit']],
                unique_boards=iv['unique_boards'], unique_thieves=iv['unique_thieves'],
                thief=d['thief'], target=d['target'], truth_vector=tv,
                all_true_boards=a['alltrue'], thief_own_positions=own,
                identity_hypotheses=sum(1 for z in a['audit'] if z['boards'] > 0),
                total_candidate_boards=sum(z['boards'] for z in a['audit']),
                gac_depth=dep['depth'], gac_status=dep['status'],
                propagation_events=len(tr.get('trace', [])),
                propagation_trace=tr.get('trace', []),
                single_card_domains=single, min_single_card_domain=min(min(x) for x in single),
                deletion_test=deletion, contradiction_min_subset=k,
                contradiction_cards=witness,
                card_clauses=clauses, compound_cards=ncomp, categories=cats,
                numeric_clauses=cats.count('numeric'), negative_clauses=cats.count('neg'),
                internal_labels=cats.count('internal'),
                asset_mapping=d['asset_mapping'], source=d['source'],
                independent_implementation=iv)


def frozens(d):
    v11 = json.loads((ROOT / 'design_selected_v11.json').read_text(encoding='utf8'))
    v12 = json.loads((ROOT / 'design_selected_v12.json').read_text(encoding='utf8'))
    L = {x['level']: x for x in d}
    # 第3关：房间/门/人物分布与 v11 第3关一致
    for key in ['room', 'doors', 'target', 'thief']:
        assert L[3][key] == v11[0][key], f'第3关冻结项 {key} 被改动'
    # 第3关家具规格：v11 全量 + (3,2) 地毯 + r2 第三张桌
    o3 = L[3]['objects']
    assert set(o3['桌子']) == {33, 21, 8}, '第3关应为三张桌'
    assert set(o3['地毯']) == {13, 14, 19}, '第3关应为三格地毯'
    assert o3['植物'] == [0] and set(o3['椅子']) == {6, 9}
    # 第4关：房间/门/人物分布与 v12 第4关一致；两处双格地毯
    for key in ['room', 'doors', 'target', 'thief']:
        assert L[4][key] == v12[1][key], f'第4关冻结项 {key} 被改动'
    o4 = L[4]['objects']
    assert set(o4['地毯']) == {7, 8, 30, 31}, '第4关两处地毯应各为两格'
    assert L[4]['room'][7] == L[4]['room'][8] and L[4]['room'][30] == L[4]['room'][31], \
        '双格地毯必须落在同一房间'
    assert '书架' in o4 and 10 in o4['书架'], '第4关 r2 应补书架'
    # 第5关：人物占据格集合与 v11 第4关相同，仅换 id
    assert set(L[5]['target']) == set(v11[1]['target']), '第5关人物分布格集合被改动'
    assert L[5]['target'] != v11[1]['target'], '第5关应换 id'
    assert L[5]['room'] != v11[1]['room'] and L[5]['doors'] != v11[1]['doors'], \
        '第5关门墙结构应改动'
    assert L[5]['objects'] != v11[1]['objects'], '第5关家具布局应改动'
    # 第6关：几何与第3关逐字段相同
    for key in ['room', 'doors', 'target', 'objects']:
        assert L[6][key] == L[3][key], f'第6关几何应与第3关完全一致（{key}）'
    assert L[6]['cards'] != L[3]['cards'], '第6关线索应加难'
    assert L[6]['visual_theme']['key'] == L[4]['visual_theme']['key'], \
        '第6关视觉方案应与第4关一致'
    print('冻结项 / 家具规格 / 视觉方案：全部通过')


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'design_selected_v13.json'
    dst = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'verification_v13.json'
    d = json.loads(src.read_text(encoding='utf8'))
    assert [x['level'] for x in d] == [3, 4, 5, 6]
    frozens(d)
    out = []
    for x in d:
        validate_geometry(x)
        r = check(x, x['level'])
        out.append(r)
        print(f"第{r['level']}关 PASS | 身份={r['thief']} 真假={r['truth_vector']} "
              f"唯一={r['unique_boards']} 身份分支={r['identity_hypotheses']} "
              f"GAC深度={r['gac_depth']} 复合卡={r['compound_cards']} "
              f"数字={r['numeric_clauses']} 矛盾子集={r['contradiction_min_subset']} "
              f"家具={r['furniture_count']}")
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
    print('两套枚举一致；冻结项、语言闸门、删除试验、纯演绎/试位闸门、视觉方案全部通过。')


if __name__ == '__main__':
    main()
