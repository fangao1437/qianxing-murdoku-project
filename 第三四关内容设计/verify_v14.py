"""第3/4/5/6/7关 v14 独立复核（可重复运行）。

用法：python verify_v14.py [design_selected_v14.json] [verification_v14.json]

- 6x6 关走 murdoku_engine.py（位集 + numpy 双实现）
- 7x7 关走 murdoku_engine_generic.py（惰性位集，避免 n^2 个大位集预生成）
- 两套独立实现交叉验证唯一摆位 / 唯一盗窃者 / 真假向量
- 逐关闸门按难度带设定；输出 verification_v14.json

2026-11-15 口径修订：第 3 关（六卡全真教学关）改走 verify_allclue()，
「可选位置」按第一关实际运行方式计算 —— 不摘本人口供，用全部线索枚举完整摆位，
取盗窃者出现的不同格子；区域无辜人数判定只用于其后筛摆位。
原「摘掉本人口供 + 预先代入身份闸门」的 630 口径已作废，仅 4~7 关的严格题审计保留。
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
    """4~7 关（仅一谎）严格题的删卡非冗余。"""
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


def all_clue_final(m, cards, h):
    """新口径：全部线索下的完整摆位，及其与盗窃者区域选位闸门的交集。

    不摘本人口供、不构造「某人说假话」的反事实世界；
    区域无辜人数判定只在这一步之后用于筛摆位、定身份。
    """
    at = m.all
    for c in cards:
        at &= m.card(c)
    return at, at & m.rb[h]


def verify_allclue(d, m, cards, tv, h):
    raise RuntimeError('旧报告入口已退休；第3、6关统一调用 verify_v16.verify')
    """第 3 关（六卡全真教学关）新口径闸门。

    1) 六卡全真；2) 全部线索摆位中盗窃者的不同格子 >= 2（有多余可选位置 ⇒ 应说真）；
    3) 该摆位集合经区域选位闸门后只剩预设答案（消多解）。
    """
    level = d['level']
    bs = [m.card(c) for c in cards]
    at, final = all_clue_final(m, cards, h)
    assert all(tv), f'第{level}关六卡应全真'
    assert at > 0, f'第{level}关全部线索下无解'
    apos = m.positions(at, h)
    own = len(apos)
    assert own >= 2, f'第{level}关盗窃者没有多余可选位置（仅 {own} 格）'
    assert final == 1 << m.t, f'第{level}关区域选位闸门后不唯一（{final.bit_count()} 个摆位）'

    # 第二套实现（通用引擎，独立 mask 实现）交叉验证
    mg = M7(d)
    at7 = mg.all
    for c in cards:
        at7 &= mg.card(c)
    assert at7.bit_count() == at.bit_count(), '两套实现全线索摆位数不一致'
    assert mg.positions(at7, h) == apos, '两套实现盗窃者可选位置不一致'
    assert (at7 & mg.rb[h]) == 1 << mg.t, '两套实现闸门后唯一解不一致'

    clauses = [len(c) for c in cards]
    cats = [clause_cost(s)[1] for c in cards for s in c]
    assert clauses[-1] == 1, f'第{level}关 V 卡必须单句'
    assert max(clauses) <= 2, f'第{level}关存在超过 2 句的卡'
    assert sum(1 for x in clauses if x > 1) <= 2, f'第{level}关复合卡过多'
    assert 'internal' not in cats and 'count' not in cats, '卡面出现内部标签/全局计数'
    assert cats.count('neg') <= 2 and cats.count('only') <= 1, '否定/唯一量词超预算'
    assert cats.count('numeric') <= 2, '数字距离句超预算'

    single = [[len(m.positions(b, i)) for i in range(6)] for b in bs]
    assert min(min(x) for x in single) > 1, f'第{level}关存在单卡定位'

    deletion = []
    for i in range(6):
        cc = [list(c) for c in cards]; cc[i] = []
        _, f = all_clue_final(m, cc, h)
        assert f != 1 << m.t, f'第{i}张卡冗余（摘掉后闸门后解仍为预设答案）'
        deletion.append(dict(card=i, final_after_removal=f.bit_count(), contributes=True))

    tables = [m.rb[h]] + bs
    dep = m.depth(tables, maxdepth=1)
    assert dep['depth'] == 0, f'第{level}关 GAC 深度 {dep["depth"]} != 0'
    tr = tg6(m, tables, ['区域'] + ['卡' + NAMES[i] for i in range(6)], m.dom)
    k, comb, witness = min_contradiction(m, cards)
    assert k is None, f'第{level}关六卡全真不应存在矛盾子集'

    return dict(level=level, grid=6, n=6, thief=d['thief'], basis='all-clue/2026-11-15',
                unique_boards=1, identity_uniqueness_claimed=False, truth_vector=list(tv),
                all_true_boards=at.bit_count(), final_solutions=final.bit_count(),
                thief_option_positions=[(q // 6 + 1, q % 6 + 1) for q in apos],
                thief_own_positions=own,
                strict_audit=[dict(person=z['person'], candidate_layouts=z['boards'],
                                   own_positions=len(z['positions']),
                                   truth_required=z['truth_required'],
                                   final_solutions=z['solutions'])
                              for z in m.audit(cards)['audit']],
                gac_depth=dep['depth'], propagation_events=len(tr.get('trace', [])),
                propagation_trace=tr.get('trace', [])[:40], deletion_test=deletion,
                contradiction_min_subset=k, contradiction_cards=witness,
                categories=cats,
                vocabulary_cost=sum(clause_cost(s)[0] for c in cards for s in c),
                numeric_clauses=cats.count('numeric'), negative_clauses=cats.count('neg'),
                only_clauses=cats.count('only'),
                compound_cards=sum(1 for x in clauses if x > 1), card_clauses=clauses,
                single_card_domains=single, min_single_card_domain=min(min(x) for x in single),
                furniture_count=sum(len(v) for v in d['objects'].values()),
                objects=d['objects'], target=d['target'], doors=d['doors'],
                visual_theme=d['visual_theme']['key'], display_cards=d['display_cards'],
                source=d.get('source', ''), PASS=True)


def verify(d):
    # 2026-11-16：旧摘卡闸门作废；历史实现仅保留追溯，不再可作为验收入口。
    if d.get('version') != 'v16':
        raise ValueError('旧设计/旧摘卡闸门已作废；请使用 current_design_v16.json 和 verify_v16.py')
    from verify_v16 import verify as current_verify
    return current_verify(d)


def _deprecated_verify_reference_only(d):
    raise RuntimeError('旧摘卡验收闸门已作废，禁止执行；使用 verify_v16.py')
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
    tv = m.truth_vector(cards)
    h = na.index(d['thief'])
    if level == 3:
        return verify_allclue(d, m, cards, tv, h)

    a = m.audit(cards)
    assert a['correct'], f'第{level}关严格审计未得到唯一摆位/唯一身份'
    own = len(a['audit'][h]['positions'])
    nfalse = sum(1 for x in tv if not x)
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
    from verify_v16 import main as current_main
    return current_main()


def _deprecated_main_reference_only():
    raise RuntimeError('旧批量验收已作废')
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
