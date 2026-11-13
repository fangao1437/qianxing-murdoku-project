"""第3/4/5关通用验证引擎（v13）。

相对 verify_v11.py 的 Model 只做两处推广：
1. 家具类型可配置：objects 的键只要登记在 OBJECT_REGISTRY 即可，自动按
   occupiable 决定「不可站」格与「在X上」候选；
2. 区域结构可配置：room / doors 由关卡数据给出，连通性与门合法性单独断言。

规则口径：每行每列一人、家具可站性、区域无辜人数唯一最多、严格摘卡真假
（0 格不成立 / 1 格必须假 / ≥2 格必须真）、复合卡合取判真。
"""
import itertools, re
import numpy as np

NAMES = 'ABCDEV'

# 家具注册表：名称 -> (官网 OBJECT id, 官网名, 可站, 关数/74, 差异化命名, 本地已支持美术)
OBJECT_REGISTRY = {
    '椅子': (2, 'Chair', True, 65, '讯问椅 · 证物编号牌', True),
    '桌子': (4, 'Table', False, 65, '勘验台 · 卷宗封边', True),
    '书架': (13, 'Shelf', False, 49, '卷宗柜 · 档案盒脊', True),
    '电视': (3, 'TV', False, 31, '公告屏 · 证物照片留白', False),
    '树': (10, 'Tree', False, 28, '现场树位 · 平面图符号', False),
    '植物': (1, 'Plant', False, 28, '证物盆栽 · 五叶规整化', True),
    '床': (6, 'Bed', True, 20, '床位示意 · 封条带（跨 2 格）', False),
    '地毯': (5, 'Carpet', True, None, '档案纸地毯 · 骑缝章', True),
    '雕塑': (20, 'Statue', False, 11, '证物雕像 · 编号底座', True),
}
OCCUPY = tuple(k for k, v in OBJECT_REGISTRY.items() if v[2])
BLOCK = tuple(k for k, v in OBJECT_REGISTRY.items() if not v[2])
ALL_OBJ = '|'.join(sorted(OBJECT_REGISTRY, key=len, reverse=True))
NUMERIC = re.compile(r'比')


def validate_geometry(d):
    n = 6
    room = np.array(d['room'])
    assert len(room) == 36 and len(d['target']) == 6
    objs = d['objects']
    for k in objs:
        assert k in OBJECT_REGISTRY, f'未登记家具类型 {k}'
    cells = sum(objs.values(), [])
    assert len(set(cells)) == len(cells), '家具格重叠'
    blocked = sum([objs.get(k, []) for k in BLOCK], [])
    assert all(v not in blocked for v in d['target']), '答案格被不可站家具占用'
    for j in range(4):
        group = set(np.flatnonzero(room == j))
        seen = {next(iter(group))}
        while True:
            more = {v for v in group if any(abs(int(v)//n-int(w)//n)+abs(int(v)%n-int(w)%n) == 1
                                             for w in seen)}
            if more <= seen:
                break
            seen |= more
        assert seen == group, f'R{j+1} 不连通'
    adj = [set() for _ in range(4)]
    for u, v in d['doors']:
        assert abs(u//n-v//n)+abs(u%n-v%n) == 1 and room[u] != room[v], f'门 {u}-{v} 非法'
        adj[room[u]].add(int(room[v])); adj[room[v]].add(int(room[u]))
    return room, blocked, adj


class Model:
    def __init__(self, d):
        self.d = d
        room, blocked, adj = validate_geometry(d)
        self.n = n = 6
        self.names = NAMES
        p = np.array(list(itertools.permutations(range(n))), dtype=np.int16)
        r = np.repeat(p, len(p), axis=0)
        c = np.tile(p, (len(p), 1))
        x = r*n + c
        base = ~np.isin(x, blocked).any(1)
        self.x = x[base]; self.r = r[base]; self.c = c[base]
        self.room = room; self.rooms = room[self.x]
        self.blocked = blocked; self.M = len(self.x)
        self.t = int(np.flatnonzero((self.x == d['target']).all(1))[0])
        self.bits = {}; self.cache = {}
        self.dom = [sum(1 << int(v) for v in np.unique(self.x[:, i])) for i in range(n)]
        self.adj = adj
        a = np.zeros((4, 4), bool)
        for u, v in d['doors']:
            a[room[u], room[v]] = a[room[v], room[u]] = True
        self.reg = []; self.rb = []
        for h in range(n-1):
            counts = np.stack([((self.rooms == j) & (np.arange(n) != h)).sum(1) for j in range(4)], 1)
            mask = a[self.rooms[:, -1], self.rooms[:, h]].copy()
            for j in range(4):
                mask &= (~a[self.rooms[:, -1], j]) | (self.rooms[:, h] == j) | \
                        (counts[np.arange(self.M), self.rooms[:, h]] > counts[:, j])
            self.reg.append(mask); self.rb.append(self.pack(mask))
        self.all = (1 << self.M) - 1
        self.cellbits = [[self.pack(self.x[:, i] == v) for v in range(n*n)] for i in range(n)]

    def pack(self, m):
        return int.from_bytes(np.packbits(m, bitorder='little').tobytes(), 'little')

    def mask(self, s):
        if s in self.bits:
            return self.bits[s]
        n = self.n; X = self.x; R = self.r; C = self.c; Q = self.rooms
        objs = self.d['objects']
        def ix(a): return NAMES.index(a)

        # 精确数字距离（仅第5关保留）
        m = re.fullmatch(r'([ABCDEV])比([ABCDEV])靠(上|下|左|右)(\d+)(行|列)', s)
        if m:
            z = ((R if m[5] == '行' else C)[:, ix(m[1])] - (R if m[5] == '行' else C)[:, ix(m[2])]) \
                == int(m[4])*(-1 if m[3] in ['上', '左'] else 1)
        else:
            m = re.fullmatch(r'([ABCDEV])在R([1-4])房间', s)
            if m:
                z = Q[:, ix(m[1])] == int(m[2])-1
            else:
                m = re.fullmatch(r'([ABCDEV])与([ABCDEV])(不在|在)同一房间', s)
                if m:
                    z = (Q[:, ix(m[1])] == Q[:, ix(m[2])]) == (m[3] == '在')
                else:
                    m = re.fullmatch(r'([ABCDEV])在([ABCDEV])(上|下|左|右)方', s)
                    if m:
                        z = ((R if m[3] in ['上', '下'] else C)[:, ix(m[1])] -
                             (R if m[3] in ['上', '下'] else C)[:, ix(m[2])]) * \
                            (-1 if m[3] in ['上', '左'] else 1) > 0
                    else:
                        m = re.fullmatch(r'([ABCDEV])在第(\d+)(行|列)', s)
                        if m:
                            z = (R if m[3] == '行' else C)[:, ix(m[1])] == int(m[2])-1
                        else:
                            m = re.fullmatch(r'([ABCDEV])独自在房间', s)
                            if m:
                                z = (Q == Q[:, ix(m[1]), None]).sum(1) == 1
                            else:
                                m = re.fullmatch(r'(只有)?([ABCDEV])(不在|在|坐在)(' + ALL_OBJ + r')(旁边|上)', s)
                                if m:
                                    only, person, neg, ob, where = m.groups()
                                    cells = objs.get(ob, [])
                                    if where == '旁边':
                                        cells = [a for a in range(n*n) if a not in self.blocked and
                                                 any(self.room[a] == self.room[b] and
                                                     abs(a//n-b//n)+abs(a%n-b%n) == 1 for b in cells)]
                                    z = np.isin(X[:, ix(person)], cells)
                                    if only:
                                        z &= np.isin(X, cells).sum(1) == 1
                                    if neg == '不在':
                                        z = ~z
                                else:
                                    m = re.fullmatch(r'(' + '|'.join(OCCUPY) + r')上有(\d+)人', s)
                                    if not m:
                                        raise ValueError(s)
                                    z = np.isin(X, objs[m[1]]).sum(1) == int(m[2])
        b = self.pack(z); self.bits[s] = b
        return b

    def card(self, ss):
        z = self.all
        for s in ss:
            z &= self.mask(s)
        return z

    def positions(self, b, i):
        return [v for v, cb in enumerate(self.cellbits[i]) if b & cb]

    def audit(self, cards):
        bs = [self.card(c) for c in cards]
        out = []; sol = []; alltrue = self.all
        for b in bs:
            alltrue &= b
        for h in range(self.n-1):
            b = self.rb[h]
            for i, z in enumerate(bs):
                if i != h:
                    b &= z
            ps = self.positions(b, h); cnt = len(ps)
            f = b & (bs[h] if cnt > 1 else self.all ^ bs[h]) if cnt else 0
            out.append(dict(person=NAMES[h], boards=b.bit_count(), positions=ps,
                            truth_required=cnt > 1 if cnt else None,
                            solutions=f.bit_count(), own_true=(b & bs[h]).bit_count()))
            if f:
                sol.append((h, f))
        return dict(audit=out, alltrue=alltrue.bit_count(), bs=bs,
                    solutions=sum(f.bit_count() for _, f in sol),
                    correct=len(sol) == 1 and sol[0][0] == NAMES.index(self.d['thief'])
                    and sol[0][1] == 1 << self.t)

    def gac(self, tables, domains=None):
        ds = self.dom.copy() if domains is None else domains.copy()
        while True:
            old = ds.copy(); limit = self.all
            for i, di in enumerate(ds):
                b = 0
                while di:
                    v = (di & -di).bit_length()-1; di &= di-1; b |= self.cellbits[i][v]
                limit &= b
            if not limit:
                return None
            for tb in tables:
                b = tb & limit
                if not b:
                    return None
                for i in range(self.n):
                    dnew = 0; di = ds[i]
                    while di:
                        v = (di & -di).bit_length()-1; di &= di-1
                        if b & self.cellbits[i][v]:
                            dnew |= 1 << v
                    if not dnew:
                        return None
                    ds[i] = dnew
            if ds == old:
                return ds

    def depth(self, tables, domains=None, maxdepth=2, memo=None):
        if memo is None:
            memo = {}
        ds = self.gac(tables, domains)
        if ds is None:
            return dict(depth=0, status='contradiction')
        if all(v.bit_count() == 1 for v in ds):
            return dict(depth=0, status='solved', domains=ds)
        key = (tuple(ds), maxdepth)
        if key in memo:
            return memo[key]
        if maxdepth == 0:
            return dict(depth=99, status='stalled', domains=ds)
        best = dict(depth=99, status='stalled', domains=ds)
        for i in sorted(range(self.n), key=lambda i: ds[i].bit_count()):
            if ds[i].bit_count() < 2:
                continue
            children = []; worst = 0
            for v in range(self.n*self.n):
                if not (ds[i] >> v) & 1:
                    continue
                nd = ds.copy(); nd[i] = 1 << v
                ch = self.depth(tables, nd, maxdepth-1, memo)
                children.append(dict(cell=v, result=ch)); worst = max(worst, ch['depth'])
                if worst+1 >= best['depth']:
                    break
            if worst+1 < best['depth']:
                best = dict(depth=worst+1, status='branch', person=NAMES[i],
                            children=children, domains=ds)
            if best['depth'] == 1:
                break
        memo[key] = best
        return best

    def truth_vector(self, cards):
        return [bool(self.card(c) >> self.t & 1) for c in cards]

    def pool(self, allow_numeric=False):
        ss = []; na = NAMES
        for a in na:
            for j in range(1, 5):
                ss.append(f'{a}在R{j}房间')
            for ob in self.d['objects']:
                ss += [f'{a}在{ob}旁边', f'{a}不在{ob}旁边']
                if ob in OCCUPY:
                    ss += [f'{a}在{ob}上', f'{a}坐在{ob}上', f'{a}不在{ob}上', f'只有{a}在{ob}上']
            ss.append(f'{a}独自在房间')
            for k in range(1, 7):
                ss += [f'{a}在第{k}行', f'{a}在第{k}列']
            for b in na:
                if a >= b:
                    continue
                ss += [f'{a}与{b}在同一房间', f'{a}与{b}不在同一房间']
                for dr, unit in [('上', '行'), ('下', '行'), ('左', '列'), ('右', '列')]:
                    ss.append(f'{a}在{b}{dr}方'); ss.append(f'{b}在{a}{dr}方')
                    if allow_numeric:
                        for v in [1, 2]:
                            ss += [f'{a}比{b}靠{dr}{v}{unit}', f'{b}比{a}靠{dr}{v}{unit}']
        for ob in OCCUPY:
            if self.d['objects'].get(ob):
                for k in range(0, 7):
                    ss.append(f'{ob}上有{k}人')
        out = []; seen = set()
        for s in ss:
            try:
                b = self.mask(s)
            except ValueError:
                continue
            if not b or b == self.all or b in seen:
                continue
            seen.add(b); out.append(s)
        return out


def independent(d):
    """第二套实现：numpy 全集枚举，独立于位集 Model。"""
    room, blocked, adj = validate_geometry(d)
    n = 6
    p = np.array(list(itertools.permutations(range(n))), dtype=np.int16)
    R = np.repeat(p, len(p), 0); C = np.tile(p, (len(p), 1)); X = n*R + C
    Q = room[X]; objs = d['objects']
    base = ~np.isin(X, blocked).any(1)
    ALL_OBJ_RE = '|'.join(sorted(OBJECT_REGISTRY, key=len, reverse=True))

    def evaluate(s):
        def idx(a): return NAMES.index(a)
        m = re.fullmatch(r'([ABCDEV])比([ABCDEV])靠(上|下|左|右)(\d+)(行|列)', s)
        if m:
            arr = R if m[5] == '行' else C
            return (arr[:, idx(m[1])]-arr[:, idx(m[2])]) == int(m[4])*(-1 if m[3] in ['上','左'] else 1)
        m = re.fullmatch(r'([ABCDEV])在(' + ALL_OBJ_RE + r')(旁边|上)', s)
        if m:
            a, ob, w = m.groups()
            cells = objs[ob]
            if w == '旁边':
                cells = [u for u in range(36) if u not in blocked and
                         any(room[u] == room[v] and abs(u//6-v//6)+abs(u%6-v%6) == 1 for v in cells)]
            return np.isin(X[:, idx(a)], cells)
        m = re.fullmatch(r'([ABCDEV])不在(' + ALL_OBJ_RE + r')(旁边|上)', s)
        if m:
            return ~evaluate(m[1]+'在'+m[2]+m[3])
        m = re.fullmatch(r'只有([ABCDEV])在(' + ALL_OBJ_RE + r')上', s)
        if m:
            return np.isin(X[:, idx(m[1])], objs[m[2]]) & (np.isin(X, objs[m[2]]).sum(1) == 1)
        m = re.fullmatch(r'([ABCDEV])与([ABCDEV])(不在|在)同一房间', s)
        if m:
            return (Q[:, idx(m[1])] == Q[:, idx(m[2])]) == (m[3] == '在')
        m = re.fullmatch(r'([ABCDEV])在([ABCDEV])(上|下|左|右)方', s)
        if m:
            arr = R if m[3] in ['上', '下'] else C
            delta = arr[:, idx(m[1])]-arr[:, idx(m[2])]
            return delta < 0 if m[3] in ['上', '左'] else delta > 0
        m = re.fullmatch(r'([ABCDEV])在R([1-4])房间', s)
        if m:
            return Q[:, idx(m[1])] == int(m[2])-1
        m = re.fullmatch(r'([ABCDEV])在第(\d+)(行|列)', s)
        if m:
            return (R if m[3] == '行' else C)[:, idx(m[1])] == int(m[2])-1
        m = re.fullmatch(r'([ABCDEV])独自在房间', s)
        if m:
            return (Q == Q[:, idx(m[1]), None]).sum(1) == 1
        m = re.fullmatch(r'(' + '|'.join(OCCUPY) + r')上有(\d+)人', s)
        if m:
            return np.isin(X, objs[m[1]]).sum(1) == int(m[2])
        raise ValueError(s)

    masks = [np.logical_and.reduce([evaluate(s) for s in card]) for card in d['cards']]
    audits = []; solutions = []
    for h in range(5):
        counts = np.stack([(Q == j).sum(1)-(Q[:, h] == j) for j in range(4)], 1)
        region = np.zeros(len(X), bool)
        for vr in range(4):
            for tr in adj[vr]:
                a = (Q[:, 5] == vr) & (Q[:, h] == tr)
                for other in adj[vr]-{tr}:
                    a &= counts[:, tr] > counts[:, other]
                region |= a
        remaining = base & region
        for i, msk in enumerate(masks):
            if i != h:
                remaining &= msk
        pos = np.unique(X[remaining, h])
        f = remaining & (masks[h] if len(pos) > 1 else ~masks[h]) if len(pos) else np.zeros(len(X), bool)
        for j in np.flatnonzero(f):
            solutions.append((h, X[j].tolist()))
        audits.append(dict(person=NAMES[h], candidate_layouts=int(remaining.sum()),
                           positions=[int(v) for v in pos], final_solutions=int(f.sum())))
    assert solutions == [(NAMES.index(d['thief']), d['target'])], solutions
    single = [[len(np.unique(X[base & msk, i])) for i in range(6)] for msk in masks]
    assert min(sum(single, [])) > 1, '存在单卡直接定位'
    return dict(generated_boards=len(X), base_count=int(base.sum()),
                all_true_boards=int((base & np.logical_and.reduce(masks)).sum()),
                audit=audits, unique_boards=len(set(tuple(s[1]) for s in solutions)),
                unique_thieves=len(set(s[0] for s in solutions)), thief=d['thief'],
                target=d['target'], truth=[bool(m[int(np.flatnonzero((X == d['target']).all(1))[0])])
                                           for m in masks], single_card_domains=single)


def compact_domains(ds, n=6):
    return [[[v//n+1, v%n+1] for v in range(n*n) if mask >> v & 1] for mask in ds]


def traced_gac(model, tables, labels, domains):
    ds = domains.copy(); trace = []
    for _ in range(100):
        prev = ds.copy(); limit = model.all
        for i, di in enumerate(ds):
            b = 0
            for v in range(model.n**2):
                if di >> v & 1:
                    b |= model.cellbits[i][v]
            limit &= b
        if not limit:
            return dict(status='contradiction', reason='行列排他冲突', trace=trace)
        for label, tb in zip(labels, tables):
            b = tb & limit
            if not b:
                return dict(status='contradiction', reason=label, trace=trace)
            for i in range(model.n):
                nd = sum(1 << v for v in range(model.n**2)
                         if (ds[i] >> v & 1) and (b & model.cellbits[i][v]))
                if not nd:
                    return dict(status='contradiction', reason=label+'使'+NAMES[i]+'无位置', trace=trace)
                if nd != ds[i]:
                    trace.append(dict(rule=label, person=NAMES[i],
                                      before=compact_domains([ds[i]], model.n)[0],
                                      after=compact_domains([nd], model.n)[0]))
                    ds[i] = nd
        if ds == prev:
            return dict(status='solved' if all(v.bit_count() == 1 for v in ds) else 'stalled',
                        domains=compact_domains(ds, model.n), trace=trace)
    raise RuntimeError('propagation did not converge')
