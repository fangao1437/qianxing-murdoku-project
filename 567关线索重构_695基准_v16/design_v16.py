"""v16 · 5/6/7 关线索重构（基准：695 实际关卡设计，不写存档）

★ 口径更正（用户 2026-11-15 22:47/22:49 指定，覆盖 §一.14 与 630）：
   「可选位置」= **全线索下的候选格**，不是「摘掉本人口供后反事实世界里的候选格」。
   实证：695 第 1 关（announce=none，全真、无谎）全线索枚举有 2 盘、盗窃者 D 有
   (1,3)/(4,3) 两格；叠加「区域无辜人数唯一最多」的人数规则后收敛为 1 盘。
   旧口径的 m.audit() 在真实第 1 关上反而 correct=False，故本轮主判据改为：

     S      = 全部线索（按卡面断言为真）∧ 基本摆位规则，**不含人数规则**
     P(h)   = S 中人物 h 的不同格数                       ← 更正后的「可选位置」
     |P(h)| ≥ 2  ⇒ h 不必说谎，最终解 = S ∧ 人数规则(h)
     |P(h)| ≤ 1  ⇒ h 必须说谎，最终解 = (∧_{i≠h} 卡_i) ∧ ¬卡_h ∧ 人数规则(h)
   合格关卡：仅指定盗窃者给出唯一且等于预设答案的解；其余身份不得给出别的盘面。

本轮目标：
  ① 5/6/7 三关布局（房间/墙/门/尺寸/人物/答案/盗窃者）冻结；仅家具可改、线索可改。
  ② 人对人「方位/距离」类提示（X在Y某方、X比Y靠某方向N行/列）每关 ≤2 且尽可能少 → 目标 0。
  ③ 第 6 关改为无谎言（七卡全真）：不使用人数规则时盗窃者 ≥2 个可选格；
     使用人数规则后收敛为 1 解（复刻第 1 关/教程的实际运行方式）。
  ④ 第 5/7 关保留「恰一谎」，按更正口径复验唯一性。
  ⑤ 沿用第 3/4 关定稿验证标准（删卡非冗余 / 单卡不定位 / 语言闸门 / GAC / 视觉区分 /
     卡序与本人自述）。

用法：python design_v16.py [level] [iters]
"""
import json, pathlib, re, sys, random, itertools, time
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str((ROOT.parent / 'murdoku-project' / '第三四关内容设计').resolve()))
from murdoku_engine_generic import (Model, validate_geometry, enumerate_boards,
                                     names_of, OBJECT_REGISTRY, OCCUPY, BLOCK)

BASE = json.loads((ROOT / '695_实际关卡数据.json').read_text(encoding='utf8'))['levels']
V14 = {x['level']: x for x in json.loads(
    (ROOT.parent / 'murdoku-project' / '第三四关内容设计' /
     'design_selected_v14.json').read_text(encoding='utf8'))}

RE_DIRECTION = re.compile(r'[A-V]在[A-V][上下左右]方|[A-V]比[A-V]靠[上下左右]\d+[行列]')
RE_INTERNAL = re.compile(r'在R\d+房间|在第\d+[行列]')
RE_COUNT = re.compile(r'上有\d+人')


RE_DIR_QUAL = re.compile(r'[A-V]在[A-V][上下左右]方')
RE_DIR_NUM = re.compile(r'[A-V]比[A-V]靠[上下左右]\d+[行列]')


def clause_cost(s):
    if RE_DIR_NUM.search(s): return 3, 'numeric'
    if RE_DIR_QUAL.search(s): return 1, 'rel'
    if '不在' in s: return 2, 'neg'
    if s.startswith('只有'): return 2, 'only'
    if '独自在房间' in s: return 2, 'alone'
    if RE_INTERNAL.search(s): return 1, 'internal'
    if '同一房间' in s: return 1, 'rel'
    if '旁边' in s: return 1, 'beside'
    return 1, 'on'


def make_design(no, objects=None, cards=None):
    lv = BASE[str(no)]
    n = lv['size']
    objs = objects or lv['objects']
    return dict(level=no, grid=n, room=lv['room'], doors=lv['doors'], objects=objs,
                target=lv['target'], thief=lv['thief'],
                cards=cards or [['A在桌子旁边']] * n,
                furniture_count=sum(len(v) for v in objs.values()),
                announce='unknown', visual_theme=lv['visual_theme'],
                names=lv['suspects'], difficulty_band=V14[no]['difficulty_band'],
                asset_mapping=V14[no]['asset_mapping'], version='v16',
                source='695_实际关卡数据.json（695 内嵌 Lua + 695 静态卡面）',
                rule_note='可选位置=全线索下的候选格（覆盖 §一.14/630 旧定义）')


class Solver:
    def __init__(self, no, objects=None, seed=20261115, ncomp_cap=500,
                 allow_direction=False, dir_penalty=40):
        self.no = no
        self.lv = BASE[str(no)]
        self.n = n = self.lv['size']
        self.na = names_of(n)
        self.thief = self.na.index(self.lv['thief'])
        self.d = make_design(no, objects)
        validate_geometry(self.d)
        self.m = Model(self.d)
        self.ALL = self.m.all
        self.TBIT = 1 << self.m.t
        self.rng = random.Random(seed + no * 7919)
        self.allow_direction = allow_direction
        self.dir_penalty = dir_penalty
        self.cb = [[self.m.cb(i, v) for v in range(n * n)] for i in range(n)]
        self.pool = self._build_pool()
        self.cards = self._build_candidates(ncomp_cap)

    # ---------- 线索池：家具/房间关系，彻底排除人对人方位/距离句 ----------
    def _build_pool(self):
        m, na = self.m, self.na
        objs = self.d['objects']
        ss = []
        for a in na:
            for ob in objs:
                ss += [f'{a}在{ob}旁边', f'{a}不在{ob}旁边']
                if ob in OCCUPY:
                    ss += [f'{a}在{ob}上', f'{a}坐在{ob}上', f'{a}不在{ob}上',
                           f'只有{a}在{ob}上']
            ss.append(f'{a}独自在房间')
            for b in na:
                if a >= b:
                    continue
                ss += [f'{a}与{b}在同一房间', f'{a}与{b}不在同一房间']
        out, seen = [], set()
        for s in ss:
            if RE_DIRECTION.search(s) or RE_INTERNAL.search(s) or RE_COUNT.search(s):
                continue
            try:
                z = m.mask(s)
            except ValueError:
                continue
            if z == 0 or z == self.ALL or z in seen:
                continue
            seen.add(z)
            if not self._domains_ok(z):
                continue
            out.append(dict(s=s, z=z, tv=bool(z >> m.t & 1), dir=False))
        if self.allow_direction:
            # 兜底：仅在零方位解确实不存在时，允许少量人对人方位/距离句，
            # 每条在 score 里计价，搜索会优先把它们压到 0。
            dss = []
            for a in na:
                for b in na:
                    if a == b:
                        continue
                    for dr in ('上', '下', '左', '右'):
                        dss.append(f'{a}在{b}{dr}方')
            for s in dss:
                try:
                    z = m.mask(s)
                except ValueError:
                    continue
                if z == 0 or z == self.ALL or z in seen:
                    continue
                seen.add(z)
                if not self._domains_ok(z):
                    continue
                out.append(dict(s=s, z=z, tv=bool(z >> m.t & 1), dir=True))
        return out

    def _domains_ok(self, z):
        """任一人物在此卡下至少 2 个候选格；用预生成格位集 + 提前退出。"""
        for i in range(self.n):
            cnt = 0
            for b in self.cb[i]:
                if z & b:
                    cnt += 1
                    if cnt >= 2:
                        break
            if cnt < 2:
                return False
        return True

    def _build_candidates(self, cap):
        """每槽：单句卡 + 有限量双句复合卡；每句都已过「单卡不定位」。"""
        n = self.n
        tp = [x for x in self.pool if x['tv']]
        fp = [x for x in self.pool if not x['tv']]
        tpn = [x for x in tp if not x['dir']]
        fpn = [x for x in fp if not x['dir']]
        strong = sorted(tpn, key=lambda x: x['z'].bit_count())[:110]
        cards = []
        for slot in range(n):
            is_false = (self.no in (5, 7) and slot == self.thief)
            opts = [dict(s=(x['s'],), z=x['z'], compound=False)
                    for x in (fp if is_false else tp)]
            if slot != n - 1:  # V 卡必须单句
                seen = set()
                pairs = [(a, b) for a in strong for b in (fpn if is_false else tpn)]
                self.rng.shuffle(pairs)
                for a, b in pairs:
                    if len(seen) >= cap:
                        break
                    if a['s'] >= b['s']:
                        continue
                    z = a['z'] & b['z']
                    if z == 0 or z in seen:
                        continue
                    tv = bool(z >> self.m.t & 1)
                    if tv == is_false:
                        continue
                    if not self._domains_ok(z):
                        continue
                    seen.add(z)
                    opts.append(dict(s=(a['s'], b['s']), z=z, compound=True))
            cards.append(opts)
        return cards

    # ---------- 更正口径的主判据 ----------
    def finals(self, bs):
        n = self.n
        pre = [self.ALL] * (n + 1)
        for i, z in enumerate(bs):
            pre[i + 1] = pre[i] & z
        S = pre[n]
        suf = [self.ALL] * (n + 1)
        for i in range(n - 1, -1, -1):
            suf[i] = suf[i + 1] & bs[i]
        truth, lie = [], []
        for h in range(n - 1):
            e = pre[h] & suf[h + 1]
            truth.append(self.m.rb[h] & S)
            lie.append(self.m.rb[h] & e & (self.ALL ^ bs[h]))
        return S, truth, lie

    def pos_count(self, z, h, exact=False):
        if exact:
            arr = self.m.to_bool(z)
            if not arr.any():
                return 0
            return int(np.count_nonzero(np.bincount(self.m.x[arr, h].astype(np.int32),
                                                     minlength=self.n * self.n)))
        cnt = 0
        for b in self.cb[h]:
            if z & b:
                cnt += 1
                if cnt >= 2:
                    return 2
        return cnt

    def score(self, choice, check_deletion=False):
        n, t = self.n, self.TBIT
        bs = [self.cards[i][j]['z'] for i, j in enumerate(choice)]
        S, truth, lie = self.finals(bs)
        bad, pc = 0, {}
        # 更正口径：指定盗窃者按「全线索可选位置」选真话/假话分支；
        # 其余身份为加速起见两分支都要求干净（比必要判据更严，但更快）。
        for h in range(n - 1):
            if h == self.thief:
                pc[h] = self.pos_count(S, h)
                f = truth[h] if pc[h] >= 2 else lie[h]
                bad += 5 * (f & ~t).bit_count()
            elif self.no == 6:
                # 无谎言关卡：与第 1 关一致，全线索为真 ⇒ 不考虑任何「某人说谎」分支
                bad += 3 * (truth[h] & ~t).bit_count()
            else:
                bad += 3 * (truth[h] & ~t).bit_count() + 3 * (lie[h] & ~t).bit_count()
        desired = truth[self.thief] if self.no == 6 else lie[self.thief]
        if self.no == 6:
            if (S & ~self.m.rb[self.thief]) == 0:
                bad += 300
            if S.bit_count() < 2:
                bad += 300
            if pc[self.thief] < 2:
                bad += 150 * (2 - pc[self.thief])
        else:
            if pc[self.thief] > 1:
                bad += 150 * (pc[self.thief] - 1)
        bad += 5 * (desired & ~t).bit_count()
        if not (desired & t):
            bad += 200
        if desired.bit_count() > 1:
            bad += 3 * (desired.bit_count() - 1)
        flat = [s for i, j in enumerate(choice) for s in self.cards[i][j]['s']]
        ncomp = sum(self.cards[i][j]['compound'] for i, j in enumerate(choice))
        if ncomp > 2:
            bad += 60 * (ncomp - 2)
        neg = sum('不在' in s for s in flat)
        only = sum(s.startswith('只有') for s in flat)
        ndir = sum(bool(RE_DIRECTION.search(s)) for s in flat)
        bad += self.dir_penalty * ndir  # 方位提示：每条都计价，优先压到 0
        if neg > 2:
            bad += 40 * (neg - 2)
        if only > 1:
            bad += 40 * (only - 1)
        if bad == 0 and check_deletion and self.no != 6:
            # 一谎关才把「删卡非冗余」计分；无谎言关与真实第 1 关一致，不作硬闸门
            for i in range(n):
                if not (bs[i] >> self.m.t & 1):
                    continue
                cc = list(bs); cc[i] = self.ALL
                _, tr, li = self.finals(cc)
                f = li[self.thief]
                if f == t:
                    bad += 300
        return bad, (S, truth, lie, bs)

    def hill(self, iters=12000, restarts=40, k=None, start=None):
        n = self.n
        best = None
        k = k or (4 if n == 7 else 8)
        per = max(60, iters // restarts)
        for rs in range(restarts):
            choice = list(start) if (start is not None and rs == 0) else \
                [self.rng.randrange(len(self.cards[i])) for i in range(n)]
            cur, _ = self.score(choice)
            stall = 0
            for it in range(per):
                if cur == 0:
                    sc2, _ = self.score(choice, check_deletion=True)
                    if sc2 == 0:
                        return choice
                    cur = sc2
                # 偶尔双槽联动，跳出局部极小
                slots = [self.rng.randrange(n)]
                if self.rng.random() < 0.18:
                    j2 = self.rng.randrange(n)
                    if j2 != slots[0]:
                        slots.append(j2)
                olds = [choice[i] for i in slots]
                cand = [[self.rng.randrange(len(self.cards[i])) for i in slots]
                        for _ in range(k)]
                bestj, bs_ = olds, cur
                for combo in cand:
                    for i, j in zip(slots, combo):
                        choice[i] = j
                    sc, _ = self.score(choice)
                    if sc < bs_:
                        bestj, bs_ = combo, sc
                for i, j in zip(slots, bestj):
                    choice[i] = j
                if bs_ < cur:
                    cur, stall = bs_, 0
                else:
                    stall += 1
                if stall > 140:
                    break
            if best is None or cur < best[0]:
                best = (cur, list(choice))
            if rs % 5 == 4:
                print(f'  L{self.no} restart {rs}: score={cur}', flush=True)
        if best is None:
            return None
        ch, sc = self.polish(best[1])
        print(f'  L{self.no} polished score={sc}', flush=True)
        return ch

    def greedy(self, tries=12, cand_cap=180):
        """第 6 关专用构造式：逐槽挑卡，使「全线索 ∧ 任一身份人数规则」只剩目标盘，
        同时保留 ≥2 个盗窃者可选格与至少一盘被人数规则排除的全线索摆法。"""
        n, t = self.n, self.TBIT
        Rt = self.m.rb[self.thief]
        RB = 0
        for h in range(n - 1):
            RB |= self.m.rb[h]
        best_choice, best_sc = None, 10 ** 18
        slots = list(range(n))
        for att in range(tries):
            self.rng.shuffle(slots)
            S = self.ALL
            choice = [None] * n
            for slot in slots:
                cand = [j for j, c in enumerate(self.cards[slot]) if c['z'] & t]
                self.rng.shuffle(cand)
                cand = cand[:cand_cap]
                bj, bobj, bS = None, None, None
                for j in cand:
                    z = self.cards[slot][j]['z']
                    S2 = S & z
                    if not (S2 & t) or (S2 & ~Rt) == 0:
                        continue
                    if self.pos_count(S2, self.thief) < 2:
                        continue
                    obj = 10 * (S2 & RB & ~t).bit_count() + S2.bit_count() / 100000
                    if bobj is None or obj < bobj:
                        bj, bobj, bS = j, obj, S2
                if bj is None:
                    break
                choice[slot] = bj
                S = bS
            if any(x is None for x in choice):
                continue
            sc, _ = self.score(choice)
            if sc < best_sc:
                best_sc, best_choice = sc, list(choice)
            if sc == 0:
                return choice
        return best_choice

    def polish(self, choice, sweeps=5):
        """逐槽全量坐标下降，用来清掉最后几个残留摆法。"""
        n = self.n
        cur, _ = self.score(choice)
        for _ in range(sweeps):
            improved = False
            for i in range(n):
                old = choice[i]
                bj, bs_ = old, cur
                for j in range(len(self.cards[i])):
                    choice[i] = j
                    sc, _ = self.score(choice)
                    if sc < bs_:
                        bj, bs_ = j, sc
                choice[i] = bj
                if bs_ < cur:
                    cur, improved = bs_, True
                if cur == 0:
                    sc2, _ = self.score(choice, check_deletion=True)
                    if sc2 == 0:
                        return choice, cur
                    cur = sc2
            if not improved:
                break
        return choice, cur

    # ---------- 全量复验 ----------
    def verify(self, choice, quick=False):
        n, m = self.n, self.m
        cards = [list(self.cards[i][j]['s']) for i, j in enumerate(choice)]
        bs = [self.cards[i][j]['z'] for i, j in enumerate(choice)]
        S, truth, lie = self.finals(bs)
        t = self.TBIT
        checks = []

        def chk(group, name, ok, value):
            checks.append(dict(group=group, item=name, ok=bool(ok), value=value))
            return bool(ok)

        lv = BASE[str(self.no)]
        chk('布局冻结', 'room/doors/target/thief/size 与 695 逐项相同',
            self.d['room'] == lv['room'] and self.d['doors'] == lv['doors']
            and self.d['target'] == lv['target'] and self.d['thief'] == lv['thief'],
            f"L{self.no} {n}×{n} 门{len(self.d['doors'])} 答案{self.d['target']}")
        chk('布局冻结', '家具类型均在已支持的 6 类内',
            all(k in OBJECT_REGISTRY and OBJECT_REGISTRY[k][5] for k in self.d['objects']),
            list(self.d['objects']))
        chk('布局冻结', '卡数=人数', len(cards) == n, len(cards))
        chk('布局冻结', '不预告真假', self.d['announce'] == 'unknown', self.d['announce'])

        p = {h: self.pos_count(S, h, exact=True) for h in range(n - 1)}
        finals = []
        for h in range(n - 1):
            # 无谎言关卡（第 6 关 / 第 1 关型）：全线索为真，不启用假话分支
            mode = 'truth' if (self.no == 6 or p[h] >= 2) else 'lie'
            f = truth[h] if mode == 'truth' else lie[h]
            finals.append(dict(person=self.na[h], optional_positions=p[h], mode=mode,
                               boards=f.bit_count(), is_target=(f == t)))
        chk('更正口径', '全线索摆法 S（不含人数规则）', True, S.bit_count())
        chk('更正口径', '仅指定盗窃者给出唯一且等于预设答案的解',
            finals[self.thief]['boards'] == 1 and finals[self.thief]['is_target']
            and all(f['boards'] == 0 or f['is_target'] for j, f in enumerate(finals)
                    if j != self.thief), finals)
        if self.no == 6:
            chk('更正口径', '★ 无谎言：全线索下盗窃者 ≥2 个可选位置',
                p[self.thief] >= 2 and S.bit_count() >= 2,
                f"可选格{p[self.thief]} 全线索盘数{S.bit_count()}")
            chk('更正口径', '★ 使用人数规则后收敛为 1 解',
                truth[self.thief] == t,
                f"全线索{S.bit_count()}盘 → 人数规则后{truth[self.thief].bit_count()}盘")
            chk('更正口径', '★ 人数规则确实排除了其它全线索摆法',
                (S & ~m.rb[self.thief]).bit_count() >= 1,
                (S & ~m.rb[self.thief]).bit_count())
            chk('谎言', '七卡全真（答案处逐卡为真）',
                all(bool(z >> m.t & 1) for z in bs),
                [bool(z >> m.t & 1) for z in bs])
        else:
            chk('谎言', '恰一谎：仅盗窃者卡在答案处为假',
                all(bool(z >> m.t & 1) == (i != self.thief) for i, z in enumerate(bs)),
                [bool(z >> m.t & 1) for z in bs])
            chk('谎言', '全线索下盗窃者 ≤1 个可选位置 ⇒ 必须说谎',
                p[self.thief] <= 1, f"可选格{p[self.thief]} 全线索盘数{S.bit_count()}")
            chk('谎言', '严格摘卡后唯一解=预设答案', lie[self.thief] == t,
                lie[self.thief].bit_count())

        dirs = [s for c in cards for s in c if RE_DIRECTION.search(s)]
        chk('方向提示', '人对人方位/距离提示 ≤2', len(dirs) <= 2, len(dirs))
        chk('方向提示', '尽可能少（记录实际条数，0 为最优）', True, dirs)

        clauses = [len(c) for c in cards]
        flat = [s for c in cards for s in c]
        cats = [clause_cost(s)[1] for s in flat]
        chk('语言闸门', 'V 卡单句', clauses[-1] == 1, clauses[-1])
        chk('语言闸门', '单卡 ≤2 句', max(clauses) <= 2, max(clauses))
        chk('语言闸门', '复合卡 ≤2', sum(x > 1 for x in clauses) <= 2,
            sum(x > 1 for x in clauses))
        chk('语言闸门', '无内部标签 / 无全局计数 / 无数字距离句',
            not any(x in ('internal', 'count', 'numeric') for x in cats), cats)
        chk('语言闸门', '否定 ≤2 / 只有 ≤1',
            cats.count('neg') <= 2 and cats.count('only') <= 1,
            f"neg{cats.count('neg')} only{cats.count('only')}")
        single = [[len(np.unique(m.x[m.to_bool(z), i])) for i in range(n)] for z in bs]
        chk('单卡不定位', '任一单卡对任一人物候选格 >1',
            min(min(x) for x in single) > 1, min(min(x) for x in single))
        drop = []
        for i in range(n):
            if not bs[i] >> m.t & 1:
                drop.append(dict(card=i, skipped=True, reason='假卡由其余真卡联合否证'))
                continue
            cc = list(bs); cc[i] = self.ALL
            _, tr, li = self.finals(cc)
            f = tr[self.thief] if self.no == 6 else li[self.thief]
            drop.append(dict(card=i, unique_after_drop=(f == t)))
        if self.no == 6:
            chk('删卡非冗余', '无谎言关按第 1 关实际行为记录（不作硬闸门）', True,
                dict(note='实测 695 第 1 关摘掉第 4/5 卡后人数规则仍唯一，故本关不强制',
                     detail=drop))
        else:
            chk('删卡非冗余', '摘掉任一真卡后不再唯一',
                all(not x.get('unique_after_drop', False) for x in drop), drop)
        if quick:
            dep = dict(depth=None)  # 中间轮跳过 GAC（大盘面很慢），终轮全量复验
        else:
            tables = [m.rb[self.thief]] + [
                (self.ALL ^ bs[i]) if (i == self.thief and self.no != 6) else bs[i]
                for i in range(n)]
            dep = m.depth(tables, maxdepth=1)

        def min_contradiction():
            if S != 0:
                return None
            for k in range(2, n + 1):
                for comb in itertools.combinations(range(n), k):
                    z = self.ALL
                    for i in comb:
                        z &= bs[i]
                        if z == 0:
                            return k
            return None
        k = min_contradiction()
        keys = [V14[x]['visual_theme']['key'] for x in (5, 6, 7)]
        chk('视觉区分', '三关主题互不重复', len(set(keys)) == 3, keys)

        if quick:
            ind = dict(skipped=True)
        else:
            ind = self._independent_corrected(cards)
            same = all(ind['audit'][h]['boards'] == finals[h]['boards']
                       and ind['audit'][h]['is_target'] == finals[h]['is_target']
                       and ind['audit'][h]['optional_positions'] == finals[h]['optional_positions']
                       for h in range(n - 1))
            chk('双实现', 'numpy 独立枚举与位集主判据一致',
                ind['S_boards'] == S.bit_count() and ind['thief_final_boards'] == 1
                and ind['thief_final_is_target'] and same
                and ind['thief_optional_positions'] == p[self.thief], ind)

        legacy = m.audit(cards)
        ok = all(c['ok'] for c in checks)
        return dict(level=self.no, grid=n, PASS=ok, checks=checks, cards=cards,
                    truth_vector=[bool(z >> m.t & 1) for z in bs],
                    all_clue_boards=S.bit_count(),
                    optional_positions={self.na[h]: p[h] for h in range(n - 1)},
                    corrected_audit=finals, gac_depth=dep['depth'],
                    contradiction_min_subset=k,
                    vocabulary_cost=sum(clause_cost(s)[0] for s in flat),
                    categories=cats, card_clauses=clauses,
                    single_card_min_domain=min(min(x) for x in single),
                    deletion=drop, independent_corrected=ind,
                    legacy_audit_correct=legacy['correct'],
                    legacy_audit_alltrue=legacy['alltrue'],
                    legacy_own_positions=[len(z['positions']) for z in legacy['audit']],
                    direction_hints=dirs,
                    objects=self.d['objects'])

    def _independent_corrected(self, cards):
        """numpy 独立实现：不复用位集 Model，重算人数规则、全线索与最终解。"""
        d, n = self.d, self.n
        room = np.array(d['room'], dtype=np.int8)
        blocked = sum([d['objects'].get(k, []) for k in BLOCK], [])
        X = enumerate_boards(n, blocked)
        Q = room[X]
        nrooms = int(room.max()) + 1
        A = np.zeros((nrooms, nrooms), bool)
        for u, v in d['doors']:
            A[room[u], room[v]] = A[room[v], room[u]] = True
        na = names_of(n)
        ALLOBJ = '|'.join(sorted(OBJECT_REGISTRY, key=len, reverse=True))

        def ev(s):
            def ix(a): return na.index(a)
            m2 = re.fullmatch(r'(只有)?([A-V])(不在|在|坐在)(' + ALLOBJ + r')(旁边|上)', s)
            if m2:
                only, p, neg, ob, w = m2.groups()
                cells = d['objects'][ob]
                if w == '旁边':
                    cells = [u for u in range(n * n) if u not in blocked and
                             any(room[u] == room[v] and
                                 abs(u // n - v // n) + abs(u % n - v % n) == 1
                                 for v in cells)]
                z = np.isin(X[:, ix(p)], cells)
                if only:
                    z &= np.isin(X, cells).sum(1) == 1
                return ~z if neg == '不在' else z
            m2 = re.fullmatch(r'([A-V])与([A-V])(不在|在)同一房间', s)
            if m2:
                return (Q[:, ix(m2[1])] == Q[:, ix(m2[2])]) == (m2[3] == '在')
            m2 = re.fullmatch(r'([A-V])在([A-V])(上|下|左|右)方', s)
            if m2:
                arr = X // n if m2[3] in '上下' else X % n
                delta = arr[:, ix(m2[1])] - arr[:, ix(m2[2])]
                return delta < 0 if m2[3] in '上左' else delta > 0
            m2 = re.fullmatch(r'([A-V])比([A-V])靠(上|下|左|右)(\d+)(行|列)', s)
            if m2:
                arr = X // n if m2[5] == '行' else X % n
                return (arr[:, ix(m2[1])] - arr[:, ix(m2[2])]) == \
                    int(m2[4]) * (-1 if m2[3] in '上左' else 1)
            if re.fullmatch(r'([A-V])独自在房间', s):
                return (Q == Q[:, ix(s[0]), None]).sum(1) == 1
            raise ValueError(s)

        masks = [np.logical_and.reduce([ev(s) for s in c]) for c in cards]
        S = np.logical_and.reduce(masks)
        ti = int(np.flatnonzero((X == np.array(d['target'], dtype=np.int8)).all(1))[0])
        th = na.index(d['thief'])
        finals = []
        for h in range(n - 1):
            counts = np.stack([(Q == j).sum(1) - (Q[:, h] == j) for j in range(nrooms)], 1)
            region = np.zeros(len(X), bool)
            for vr in range(nrooms):
                for tr in np.flatnonzero(A[vr]):
                    a = (Q[:, -1] == vr) & (Q[:, h] == tr)
                    for other in np.flatnonzero(A[vr]):
                        if other != tr:
                            a &= counts[:, tr] > counts[:, other]
                    region |= a
            pos = np.unique(X[S, h])
            if self.no == 6 or len(pos) >= 2:
                f = region & S
                mode = 'truth'
            else:
                rest = region.copy()
                for i, msk in enumerate(masks):
                    if i != h:
                        rest &= msk
                f = rest & ~masks[h]
                mode = 'lie'
            finals.append(dict(person=na[h], mode=mode, boards=int(f.sum()),
                               optional_positions=int(len(pos)),
                               is_target=bool(np.array_equal(np.flatnonzero(f), [ti]))))
        tf = finals[th]
        return dict(generated_boards=len(X), S_boards=int(S.sum()),
                    all_true_board_is_target=bool(S[ti]),
                    thief_final_boards=tf['boards'],
                    thief_final_is_target=tf['is_target'],
                    other_final_boards=sum(f['boards'] for j, f in enumerate(finals) if j != th),
                    thief_optional_positions=tf['optional_positions'], audit=finals)


def main():
    no = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    iters = int(sys.argv[2]) if len(sys.argv) > 2 else 12000
    allow_dir = (len(sys.argv) > 3 and sys.argv[3] == 'dir')
    t0 = time.time()
    s = Solver(no, allow_direction=allow_dir)
    print(f"L{no}: boards={s.m.M} pool={len(s.pool)} candidates="
          f"{[len(x) for x in s.cards]} thief={s.lv['thief']}", flush=True)
    choice = s.hill(iters=iters)
    if choice is None:
        print('未找到候选'); return
    res = s.verify(choice)
    print('PASS' if res['PASS'] else 'FAIL')
    for c in res['checks']:
        if not c['ok']:
            print('  FAIL', c['group'], c['item'], c['value'])
    print('cards', res['cards'], 'truth', res['truth_vector'],
          'S', res['all_clue_boards'], 'opts', res['optional_positions'],
          'GAC', res['gac_depth'], 'time', round(time.time() - t0, 1))
    out = dict(level=no, choice=choice, cards=res['cards'], result=res, design=s.d)
    (ROOT / f'_search_L{no}.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding='utf8')


if __name__ == '__main__':
    main()
