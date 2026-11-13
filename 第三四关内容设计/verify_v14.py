"""第3/4/5/6/7关 v14 独立复核（可重复运行）。

用法：python verify_v14.py [design_selected_v14.json] [verification_v14.json]

- 6x6 关走 murdoku_engine.py（位集 + numpy 双实现）
- 7x7 关走 murdoku_engine_generic.py（惰性位集，避免 n^2 个大位集预生成）
- 两套独立实现交叉验证唯一摆位 / 唯一盗窃者 / 真假向量
- 逐关闸门按难度带设定；输出 verification_v14.json
"""
import sys, json, pathlib, re, itertools
sys.set_int_max_str_digits(200000)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from murdoku_engine import (Model as M6, independent as iv6, traced_gac as tg6,
                            validate_geometry as vg6, OBJECT_REGISTRY, NAMES)
from murdoku_engine_generic import (Model as M7, independent as iv7,
                                   traced_gac as tg7, validate_geometry as vg7,
                                   names_of)

ROOT = pathlib.Path(__file__).resolve().parent
NUMERIC = re.compile(r'比')
INTERNAL = re.compile(r'在R\d+房间|在第\d+(行|列)')
COUNT = re.compile(r'上有\d+人')


def clause_cost(s):
    if NUMERIC.search(s): return 3, 'numeric'
    if '不在' in s: return 2, 'neg'
    if COUNT.search(s): return 2, 'count'
    if s.startswith('只有'): return 2, 'only'
    if '独自在房间' in s: return 2, 'alone'
    if INTERNAL.search(s): return 1, 'internal'
    if '旁边' in s: return 1, 'beside'
    if '同一房间' in s or s.endswith('方'): return 1, 'rel'
    return 1, 'on'


def min_contradiction(m, cards):
    n = m.n
    bs = [m.card(c) for c in cards]
    for k in range(2, n + 1):
        for comb in itertools.combinations(range(n), k):
            z = m.all
            for i in comb:
                z &= bs[i]
                if z == 0: break
            if z == 0:
                return k, list(comb), [cards[i] for i in comb]
    return None, [], []


def deletion_test(m, cards, h, nfalse):
    out = []
    for i in range(m.n):
        if nfalse and i == h:
            out.append(dict(card=i, skipped=True, reason='假卡由其余真卡联合否证'))
            continue
        cc = [list(c) for c in cards]; cc[i] = []
        a2 = m.audit(cc)
        contributes = not a2['correct']
        assert contributes, f'第{i}张卡冗余（摘掉后严格题仍唯一）'
        out.append(dict(card=i, correct_after_removal=a2['correct'], contributes=True))
    return out


def verify(d):
    level = d['level']
    n = len(d['target'])
    assert d['version'] == 'v14', f'第{level}关版本号不是 v14'
    assert d['grid'] == n, f'第{level}关 grid 与 target 长度不一致'
    is7 = (n == 7)
    M, iv, tg, vg = (M7, iv7, tg7, vg7) if is7 else (M6, iv6, tg6, vg6)
    na = names_of(n) if is7 else NAMES
    vg(d)
    cards = d['cards']
    assert len(cards) == n, f'第{level}关应有 {n} 张卡'
    m = M(d)
    a = m.audit(cards)
    assert a['correct'], f'第{level}关严格审计未得到唯一摆位/唯一身份'

    tv = m.truth_vector(cards)
    h = na.index(d['thief'])
    own = len(a['audit'][h]['positions'])
    nfalse = sum(1 for x in tv if not x)
    if level == 3:
        assert nfalse == 0 and own >= 2 and a['alltrue'] > 0, '第3关应六卡全真且可正向验证'
    else:
        assert nfalse == 1 and not tv[h], f'第{level}关应仅盗窃者卡为假'
        assert own == 1 and a['alltrue'] == 0, f'第{level}关谎言必须被其余真卡联合否证'

    # 双实现交叉验证
    ind = iv(d, boards=m.x) if is7 else iv(d)
    assert ind['unique_boards'] == 1, f'第{level}关第二实现未得到唯一摆位'
    assert ind['unique_thieves'] == 1, f'第{level}关第二实现未得到唯一盗窃者'
    assert list(ind['truth']) == list(tv), f'第{level}关两套实现真假向量不一致'

    clauses = [len(c) for c in cards]
    ncomp = sum(1 for x in clauses if x > 1)
    cats = [clause_cost(s)[1] for c in cards for s in c]
    assert clauses[-1] == 1, f'第{level}关 V 卡必须单句'
    assert max(clauses) <= 2, f'第{level}关存在超过 2 句的卡'
    assert ncomp <= 2, f'第{level}关复合卡过多'
    assert 'internal' not in cats, f'第{level}关卡面出现内部标签'
    assert 'count' not in cats, f'第{level}关卡面出现全局计数'
    neg = cats.count('neg'); only = cats.count('only'); numeric = cats.count('numeric')
    assert neg <= 2 and only <= 1, f'第{level}关否定/唯一量词超预算'
    assert numeric <= (3 if is7 else 2), f'第{level}关数字距离句超预算'

    # 单卡不得直接定位某人
    bs = a['bs']
    single = [[len(m.positions(b, i)) for i in range(n)] for b in bs]
    assert min(min(x) for x in single) > 1, f'第{level}关存在单卡定位'

    # 删卡非冗余
    deletion = deletion_test(m, cards, h, nfalse)

    # GAC 深度
    truth = own > 1
    tables = [m.rb[h]] + [z if i != h or truth else m.all ^ z for i, z in enumerate(bs)]
    want_depth = 1 if level in (5, 7) else 0
    dep = m.depth(tables, maxdepth=1)
    assert dep['depth'] == want_depth, f'第{level}关 GAC 深度 {dep["depth"]} != {want_depth}'
    tr = tg(m, tables, ['区域'] + ['卡' + na[i] for i in range(n)], m.dom)
    trace = tr.get('trace', [])

    k, comb, witness = min_contradiction(m, cards)
    if level == 3:
        assert k is None, '第3关六卡全真不应存在矛盾子集'
    else:
        assert k is not None, f'第{level}关谎言应可被察觉'

    return dict(level=level, grid=n, n=n, thief=d['thief'],
                unique_boards=ind['unique_boards'], unique_thieves=ind['unique_thieves'],
                truth_vector=list(tv), all_true_boards=a['alltrue'],
                thief_own_positions=own,
                identity_hypotheses=sum(1 for z in a['audit'] if z['boards'] > 0),
                total_candidate_boards=sum(z['boards'] for z in a['audit']),
                strict_audit=[dict(person=z['person'], candidate_layouts=z['boards'],
                                   own_positions=len(z['positions']),
                                   truth_required=z['truth_required'],
                                   final_solutions=z['solutions']) for z in a['audit']],
                gac_depth=dep['depth'], propagation_events=len(trace),
                propagation_trace=trace[:40],
                deletion_test=deletion,
                contradiction_min_subset=k, contradiction_cards=witness,
                categories=cats, vocabulary_cost=sum(clause_cost(s)[0] for c in cards for s in c),
                numeric_clauses=numeric, negative_clauses=neg, only_clauses=only,
                compound_cards=ncomp, card_clauses=clauses,
                single_card_domains=single,
                min_single_card_domain=min(min(x) for x in single),
                furniture_count=sum(len(v) for v in d['objects'].values()),
                objects=d['objects'], target=d['target'], doors=d['doors'],
                visual_theme=d['visual_theme']['key'], display_cards=d['display_cards'],
                source=d.get('source', ''), PASS=True)


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'design_selected_v14.json'
    dst = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'verification_v14.json'
    data = json.loads(src.read_text(encoding='utf8'))
    out = []
    for d in data:
        r = verify(d)
        out.append(r)
        print(f"第{r['level']}关 {r['grid']}x{r['grid']} | PASS | 家具 {r['furniture_count']} | "
              f"身份 {r['thief']} | 真假 {r['truth_vector']} | GAC {r['gac_depth']} | "
              f"矛盾子集 {r['contradiction_min_subset']} | 主题 {r['visual_theme']}")
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
    print(f'全部 {len(out)} 关通过；已写入 {dst}')


if __name__ == '__main__':
    main()
