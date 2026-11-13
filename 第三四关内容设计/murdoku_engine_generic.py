"""通用 Murdoku 验证引擎（v14）：支持任意棋盘尺寸 n、任意房间数、可配置家具类型。

相对 murdoku_engine.py（硬编码 6×6）的改动：
1. n 由 len(target) 推断；人物字母表 = A..(n-2) + V；
2. 房间数 nrooms = max(room)+1，区域规则按 nrooms 计算；
3. 摆法分块枚举：n=7 时 7!×7! = 25,401,600，逐块生成 R/C/X，避免一次性 ~1GB 峰值；
4. 家具注册表沿用 OBJECT_REGISTRY，可站性由 occupiable 决定；
5. 位集 Model + numpy 独立实现 independent 双实现交叉验证。

规则：每行每列恰好一人、不可站家具排除、区域无辜人数唯一最多、
严格摘卡真假（0 格不成立 / 1 格必须假 / ≥2 格必须真）、复合卡合取判真。
"""
import itertools, re
import numpy as np
from murdoku_engine import OBJECT_REGISTRY, OCCUPY, BLOCK

ALL_OBJ = '|'.join(sorted(OBJECT_REGISTRY, key=len, reverse=True))


def names_of(n):
    return ''.join(chr(65 + i) for i in range(n - 1)) + 'V'


def validate_geometry(d):
    n = len(d['target'])
    N = n * n
    room = np.array(d['room'], dtype=np.int8)
    assert len(room) == N
    nrooms = int(room.max()) + 1
    objs = d['objects']
    for k in objs:
        assert k in OBJECT_REGISTRY, f'未登记家具类型 {k}'
    cells = sum(objs.values(), [])
    assert len(set(cells)) == len(cells), '家具格重叠'
    blocked = sum([objs.get(k, []) for k in BLOCK], [])
    assert all(v not in blocked for v in d['target']), '答案格被不可站家具占用'
    assert all(0 <= v < N for v in cells), '家具格越界'
    for j in range(nrooms):
        group = set(int(i) for i in np.flatnonzero(room == j))
        assert group, f'R{j+1} 为空'
        seen = {next(iter(group))}
        while True:
            more = {v for v in group if any(abs(v//n-w//n)+abs(v%n-w%n) == 1 for w in seen)}
            if more <= seen:
                break
            seen |= more
        assert seen == group, f'R{j+1} 不连通'
    adj = [set() for _ in range(nrooms)]
    for u, v in d['doors']:
        assert abs(u//n-v//n)+abs(u%n-v%n) == 1, f'门 {u}-{v} 不相邻'
        assert room[u] != room[v], f'门 {u}-{v} 未跨区'
        adj[int(room[u])].add(int(room[v])); adj[int(room[v])].add(int(room[u]))
    return room, blocked, adj, nrooms


def enumerate_boards(n, blocked, chunk=24):
    """分块枚举 (行排列, 列排列) 组合，返回过滤家具后的 X (M×n, int8)。"""
    p = np.array(list(itertools.permutations(range(n))), dtype=np.int8)  # n! × n
    L = len(p)
    parts = []
    for s in range(0, L, chunk):
        pr = p[s:s+chunk]
        R = np.repeat(pr, L, axis=0)
        C = np.tile(p, (len(pr), 1))
        X = R * np.int8(n) + C
        if blocked:
            ok = ~np.isin(X, blocked).any(1)
            X = X[ok]
        parts.append(X)
    return np.concatenate(parts, axis=0)


class _CellBitsRow:
    """按 [v] 惰性访问某个人的「在格 v」位集。"""
    def __init__(self, model, i):
        self.m = model; self.i = i

    def __getitem__(self, v):
        return self.m.cb(self.i, v)

    def __iter__(self):
        for v in range(self.m.n * self.m.n):
            yield self.m.cb(self.i, v)


class _CellBits:
    """按 [i][v] 惰性访问的位集视图，避免 7×7 预生成数百个巨型位集。"""
    def __init__(self, model):
        self.m = model
        self.n = model.n

    def __getitem__(self, i):
        return _CellBitsRow(self.m, i)


class Model:
    def __init__(self, d, boards=None):
        self.d = d
        self.n = n = len(d['target'])
        self.names = na = names_of(n)
        room, blocked, adj, nrooms = validate_geometry(d)
        self.room = room; self.blocked = blocked; self.adj = adj
        self.nrooms = nrooms
        self.x = boards if boards is not None else enumerate_boards(n, blocked)
        X = self.x
        self.r = (X // n).astype(np.int8); self.c = (X % n).astype(np.int8)
        self.rooms = room[X]
        self.M = len(X)
        self.t = int(np.flatnonzero((X == np.array(d['target'], dtype=np.int8)).all(1))[0])
        self.bits = {}
        self.all = (1 << self.M) - 1
        self.dom = [sum(1 << int(v) for v in np.unique(X[:, i])) for i in range(n)]
        A = np.zeros((nrooms, nrooms), bool)
        for u, v in d['doors']:
            A[room[u], room[v]] = A[room[v], room[u]] = True
        self.reg = []; self.rb = []
        for h in range(n-1):
            counts = np.stack([((self.rooms == j) & (np.arange(n) != h)).sum(1)
                               for j in range(nrooms)], 1)
            mask = A[self.rooms[:, -1], self.rooms[:, h]].copy()
            for j in range(nrooms):
                mask &= (~A[self.rooms[:, -1], j]) | (self.rooms[:, h] == j) | \
                        (counts[np.arange(self.M), self.rooms[:, h]] > counts[:, j])
            self.reg.append(mask); self.rb.append(self.pack(mask))
        # 惰性 cellbits：7×7 时若一次性预生成 n×(n²) 个位集会占用数 GB
        self._cb_cache = {}
        self.cellbits = _CellBits(self)

    def pack(self, m):
        return int.from_bytes(np.packbits(m, bitorder='little').tobytes(), 'little')

    def to_bool(self, b):
        """把位集解成 M 长度布尔数组（用于 positions，避免遍历全部 cellbits）。"""
        nbytes = (self.M + 7) // 8
        raw = np.frombuffer(b.to_bytes(nbytes, 'little'), dtype=np.uint8)
        return np.unpackbits(raw, bitorder='little')[:self.M].astype(bool)

    def cb(self, i, v):
        key = (i, v)
        if key not in self._cb_cache:
            self._cb_cache[key] = self.pack(self.x[:, i] == v)
        return self._cb_cache[key]


    def mask(self, s):
        if s in self.bits:
            return self.bits[s]
        n = self.n; na = self.names; X = self.x; R = self.r; C = self.c; Q = self.rooms
        objs = self.d['objects']
        NC = '[' + na + ']'
        def ix(a): return na.index(a)
        m = re.fullmatch(NC + r'在R(\d+)房间', s)
        if m:
            z = Q[:, ix(s[0])] == int(m[1])-1
        else:
            m = re.fullmatch(r'(' + NC + r')与(' + NC + r')(不在|在)同一房间', s)
            if m:
                z = (Q[:, ix(m[1])] == Q[:, ix(m[2])]) == (m[3] == '在')
            else:
                m = re.fullmatch(r'(' + NC + r')比(' + NC + r')靠(上|下|左|右)(\d+)(行|列)', s)
                if m:
                    z = ((R if m[5] == '行' else C)[:, ix(m[1])] -
                         (R if m[5] == '行' else C)[:, ix(m[2])]) == \
                        int(m[4])*(-1 if m[3] in ['上', '左'] else 1)
                else:
                    m = re.fullmatch(r'(' + NC + r')在(' + NC + r')(上|下|左|右)方', s)
                    if m:
                        z = ((R if m[3] in ['上', '下'] else C)[:, ix(m[1])] -
                             (R if m[3] in ['上', '下'] else C)[:, ix(m[2])]) * \
                            (-1 if m[3] in ['上', '左'] else 1) > 0
                    else:
                        m = re.fullmatch(NC + r'在第(\d+)(行|列)', s)
                        if m:
                            z = (R if m[2] == '行' else C)[:, ix(s[0])] == int(m[1])-1
                        else:
                            m = re.fullmatch(NC + r'独自在房间', s)
                            if m:
                                z = (Q == Q[:, ix(s[0]), None]).sum(1) == 1
                            else:
                                m = re.fullmatch(r'(只有)?(' + NC + r')(不在|在|坐在)(' +
                                                 ALL_OBJ + r')(旁边|上)', s)
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
        # 惰性位集：n² 次小位集 AND（n=7 时 49 次），比解压整个 M 长度数组更快
        return [v for v in range(self.n * self.n) if b & self.cb(i, v)]

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
            out.append(dict(person=self.names[h], boards=b.bit_count(), positions=ps,
                            truth_required=cnt > 1 if cnt else None,
                            solutions=f.bit_count(), own_true=(b & bs[h]).bit_count()))
            if f:
                sol.append((h, f))
        return dict(audit=out, alltrue=alltrue.bit_count(), bs=bs,
                    solutions=sum(f.bit_count() for _, f in sol),
                    correct=len(sol) == 1 and sol[0][0] == self.names.index(self.d['thief'])
                    and sol[0][1] == 1 << self.t)

    def truth_vector(self, cards):
        return [bool(self.card(c) >> self.t & 1) for c in cards]

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

    def depth(self, tables, domains=None, maxdepth=1, memo=None):
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
                best = dict(depth=worst+1, status='branch', person=self.names[i],
                            children=children, domains=ds)
            if best['depth'] == 1:
                break
        memo[key] = best
        return best

    def pool(self, allow_numeric=False):
        ss = []; na = self.names; n = self.n
        for a in na:
            for j in range(1, self.nrooms+1):
                ss.append(f'{a}在R{j}房间')
            for ob in self.d['objects']:
                ss += [f'{a}在{ob}旁边', f'{a}不在{ob}旁边']
                if ob in OCCUPY:
                    ss += [f'{a}在{ob}上', f'{a}坐在{ob}上', f'{a}不在{ob}上', f'只有{a}在{ob}上']
            ss.append(f'{a}独自在房间')
            for k in range(1, n+1):
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
                for k in range(0, n+1):
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


def independent(d, boards=None):
    """第二套实现：numpy 邻接计数式区域规则，独立于位集 Model。"""
    room, blocked, adj, nrooms = validate_geometry(d)
    n = len(d['target']); na = names_of(n)
    X = boards if boards is not None else enumerate_boards(n, blocked)
    R = X // n; C = X % n; Q = room[X]; objs = d['objects']
    NC = '[' + na + ']'
    ALL = '|'.join(sorted(OBJECT_REGISTRY, key=len, reverse=True))

    def evaluate(s):
        def idx(a): return na.index(a)
        m = re.fullmatch(r'(' + NC + r')比(' + NC + r')靠(上|下|左|右)(\d+)(行|列)', s)
        if m:
            arr = R if m[5] == '行' else C
            return (arr[:, idx(m[1])]-arr[:, idx(m[2])]) == int(m[4])*(-1 if m[3] in ['上','左'] else 1)
        m = re.fullmatch(r'(' + NC + r')在(' + ALL + r')(旁边|上)', s)
        if m:
            a, ob, w = m.groups(); cells = objs[ob]
            if w == '旁边':
                cells = [u for u in range(n*n) if u not in blocked and
                         any(room[u] == room[v] and abs(u//n-v//n)+abs(u%n-v%n) == 1 for v in cells)]
            return np.isin(X[:, idx(a)], cells)
        m = re.fullmatch(r'(' + NC + r')不在(' + ALL + r')(旁边|上)', s)
        if m:
            return ~evaluate(m[1]+'在'+m[2]+m[3])
        m = re.fullmatch(r'只有(' + NC + r')在(' + ALL + r')上', s)
        if m:
            return np.isin(X[:, idx(m[1])], objs[m[2]]) & (np.isin(X, objs[m[2]]).sum(1) == 1)
        m = re.fullmatch(r'(' + NC + r')与(' + NC + r')(不在|在)同一房间', s)
        if m:
            return (Q[:, idx(m[1])] == Q[:, idx(m[2])]) == (m[3] == '在')
        m = re.fullmatch(r'(' + NC + r')在(' + NC + r')(上|下|左|右)方', s)
        if m:
            arr = R if m[3] in ['上', '下'] else C
            delta = arr[:, idx(m[1])]-arr[:, idx(m[2])]
            return delta < 0 if m[3] in ['上', '左'] else delta > 0
        m = re.fullmatch(NC + r'在R(\d+)房间', s)
        if m:
            return Q[:, idx(s[0])] == int(m[1])-1
        m = re.fullmatch(NC + r'在第(\d+)(行|列)', s)
        if m:
            return (R if m[2] == '行' else C)[:, idx(s[0])] == int(m[1])-1
        m = re.fullmatch(NC + r'独自在房间', s)
        if m:
            return (Q == Q[:, idx(s[0]), None]).sum(1) == 1
        m = re.fullmatch(r'(' + '|'.join(OCCUPY) + r')上有(\d+)人', s)
        if m:
            return np.isin(X, objs[m[1]]).sum(1) == int(m[2])
        raise ValueError(s)

    masks = [np.logical_and.reduce([evaluate(s) for s in card]) for card in d['cards']]
    audits = []; solutions = []
    for h in range(n-1):
        counts = np.stack([(Q == j).sum(1)-(Q[:, h] == j) for j in range(nrooms)], 1)
        region = np.zeros(len(X), bool)
        for vr in range(nrooms):
            for tr in adj[vr]:
                a = (Q[:, -1] == vr) & (Q[:, h] == tr)
                for other in adj[vr]-{tr}:
                    a &= counts[:, tr] > counts[:, other]
                region |= a
        remaining = region.copy()
        for i, msk in enumerate(masks):
            if i != h:
                remaining &= msk
        pos = np.unique(X[remaining, h])
        f = remaining & (masks[h] if len(pos) > 1 else ~masks[h]) if len(pos) else np.zeros(len(X), bool)
        for j in np.flatnonzero(f):
            solutions.append((h, X[j].tolist()))
        audits.append(dict(person=na[h], candidate_layouts=int(remaining.sum()),
                           positions=[int(v) for v in pos], final_solutions=int(f.sum())))
    assert solutions == [(na.index(d['thief']), d['target'])], solutions[:5]
    ti = int(np.flatnonzero((X == np.array(d['target'], dtype=np.int8)).all(1))[0])
    single = [[len(np.unique(X[msk, i])) for i in range(n)] for msk in masks]
    assert min(sum(single, [])) > 1, '存在单卡直接定位'
    return dict(generated_boards=len(X), all_true_boards=int(np.logical_and.reduce(masks).sum()),
                audit=audits, unique_boards=len(set(tuple(s[1]) for s in solutions)),
                unique_thieves=len(set(s[0] for s in solutions)), thief=d['thief'],
                target=d['target'], truth=[bool(m[ti]) for m in masks],
                single_card_domains=single)


def compact_domains(ds, n):
    return [[[v//n+1, v%n+1] for v in range(n*n) if mask >> v & 1] for mask in ds]


def traced_gac(model, tables, labels, domains):
    ds = domains.copy(); trace = []; n = model.n
    for _ in range(100):
        prev = ds.copy(); limit = model.all
        for i, di in enumerate(ds):
            b = 0
            for v in range(n*n):
                if di >> v & 1:
                    b |= model.cellbits[i][v]
            limit &= b
        if not limit:
            return dict(status='contradiction', reason='行列排他冲突', trace=trace)
        for label, tb in zip(labels, tables):
            b = tb & limit
            if not b:
                return dict(status='contradiction', reason=label, trace=trace)
            for i in range(n):
                nd = sum(1 << v for v in range(n*n)
                         if (ds[i] >> v & 1) and (b & model.cellbits[i][v]))
                if not nd:
                    return dict(status='contradiction', reason=label, trace=trace)
                if nd != ds[i]:
                    trace.append(dict(rule=label, person=model.names[i],
                                      before=compact_domains([ds[i]], n)[0],
                                      after=compact_domains([nd], n)[0]))
                    ds[i] = nd
        if ds == prev:
            return dict(status='solved' if all(v.bit_count() == 1 for v in ds) else 'stalled',
                        domains=compact_domains(ds, n), trace=trace)
    raise RuntimeError('propagation did not converge')
