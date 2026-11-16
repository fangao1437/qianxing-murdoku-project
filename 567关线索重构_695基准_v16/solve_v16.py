"""v16 驱动：按更正口径搜索 5/6/7 三关新线索，必要时做最小家具增补。

只读 695 数据，不写任何 .gil / 存档；产物写到本目录。
用法：python solve_v16.py <level> [iters] [rounds] [dir]
"""
import json, pathlib, sys, copy, time, collections
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
import design_v16 as D


def warm(s, prev):
    if not prev:
        return None
    out = []
    for i, card in enumerate(prev):
        hit = [j for j, c in enumerate(s.cards[i]) if tuple(c['s']) == tuple(card)]
        out.append(hit[0] if hit else s.rng.randrange(len(s.cards[i])))
    return out


def wrong_boards(s, choice):
    bs = [s.cards[i][j]['z'] for i, j in enumerate(choice)]
    S, truth, lie = s.finals(bs)
    t = s.TBIT
    if s.no == 6:
        # 无谎言：残留盘 = 任一身份的「人数规则 ∧ 全线索」非答案盘
        wrong = 0
        for h in range(s.n - 1):
            wrong |= truth[h] & ~t
        keep = S & ~s.m.rb[s.thief] & ~t
    else:
        wrong = lie[s.thief] & ~t
        keep = 0
    return S, wrong, keep


def pick_cell(s, wrong, keep, objects):
    n = s.n
    allf = set(sum(objects.values(), []))
    tgt = set(s.d['target'])
    arr = s.m.to_bool(wrong)
    boards = s.m.x[arr]
    karr = s.m.to_bool(keep) if keep else None
    keepcells = set(int(q) for q in s.m.x[karr].ravel()) if karr is not None else set()
    cnt = collections.Counter()
    for b in boards:
        for q in b:
            q = int(q)
            if q not in tgt and q not in allf and q not in keepcells:
                cnt[q] += 1
    if not cnt:
        return None, boards
    # 优先出现在最多错误盘里的格
    return max(cnt, key=lambda q: (cnt[q], -q)), boards


def run(no, iters=8000, rounds=8, allow_dir=True, dir_penalty=40, seed0=20261115):
    t0 = time.time()
    suffix = '' if seed0 == 20261115 else f'_s{seed0}'
    objects = copy.deepcopy(D.BASE[str(no)]['objects'])
    prev = None
    best = None
    for rd in range(rounds):
        s = D.Solver(no, objects=objects, allow_direction=allow_dir,
                     dir_penalty=dir_penalty, seed=seed0 + rd * 131)
        w = warm(s, prev)
        if w:
            cur, _ = s.score(w)
            print(f'  round{rd} warm score={cur}', flush=True)
            choice = s.hill(iters=iters, restarts=30, start=w)
        elif no == 6:
            g = s.greedy(tries=25)
            if g:
                gs, _ = s.score(g)
                print(f'  round{rd} greedy score={gs}', flush=True)
                ch, sc = s.polish(list(g), sweeps=4)
                choice = ch if sc == 0 else s.hill(iters=iters, restarts=20, start=ch)
            else:
                choice = s.hill(iters=iters, restarts=30)
        else:
            choice = s.hill(iters=iters, restarts=30)
        res = s.verify(choice, quick=True)
        prev = res['cards']
        if res['PASS']:
            full = s.verify(choice)
            res = full
            if not full['PASS']:
                print('  终轮全量复验未通过：',
                      [c['item'] for c in full['checks'] if not c['ok']], flush=True)
        dirs = res['direction_hints']
        print(f'L{no} round{rd}: PASS={res["PASS"]} S={res["all_clue_boards"]} '
              f'opts={res["optional_positions"]} dirs={len(dirs)} '
              f'furn={sum(len(v) for v in objects.values())} '
              f'failed={[c["item"] for c in res["checks"] if not c["ok"]]}', flush=True)
        if best is None or (res['PASS'], -len(dirs)) > best[0]:
            best = ((res['PASS'], -len(dirs)), copy.deepcopy(objects),
                    list(choice), res)
            # 每轮落盘快照，避免中途被打断丢失结果
            snap = dict(level=no, objects=best[1], choice=best[2], result=best[3],
                        design=D.make_design(no, best[1], best[3]['cards']))
            (ROOT / f'_best_L{no}{suffix}.json').write_text(
                json.dumps(snap, ensure_ascii=False, indent=2, default=str), encoding='utf8')
        if res['PASS'] and len(dirs) == 0:
            break
        S, wrong, keep = wrong_boards(s, choice)
        if wrong == 0:
            print('  无残留错误盘，换随机家具扰动', flush=True)
            # 随机加一格雕塑，扩大线索池
            free = [q for q in range(s.n * s.n) if q not in set(s.d['target'])
                    and q not in set(sum(objects.values(), []))]
            q = s.rng.choice(free)
            objects.setdefault('雕塑', []).append(int(q))
            continue
        c, boards = pick_cell(s, wrong, keep, objects)
        if c is not None:
            objects.setdefault('雕塑', []).append(c)
            print(f'  增补雕塑格 ({c // s.n + 1},{c % s.n + 1}) 以清除 '
                  f'{s.m.to_bool(wrong).sum()} 盘', flush=True)
        else:
            # 残留盘与目标盘共用同一组格（只是人物互换）⇒ 不可站家具无法区分；
            # 改为在目标格上补一格可站「椅子」，制造新的「在椅子旁边」判据。
            used = set(sum(objects.values(), []))
            free = [q for q in s.d['target'] if q not in used]
            if not free:
                print('  无可加家具格', flush=True)
                break
            q = s.rng.choice(free)
            objects.setdefault('椅子', []).append(int(q))
            print(f'  增补椅子格 ({q // s.n + 1},{q % s.n + 1}) 以制造人物区分判据',
                  flush=True)
    (flag, objects, choice, res) = best
    # 通过的结果在轮内已经做过完整复验；不再重建 Solver 重映射卡面
    # （各轮 Solver 候选表随种子变化，按卡面反查会取错卡）。
    out = dict(level=no, objects=objects, choice=choice, result=res,
               design=D.make_design(no, objects, res['cards']))
    suffix = '' if seed0 == 20261115 else f'_s{seed0}'
    (ROOT / f'_best_L{no}{suffix}.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding='utf8')
    print(f'== L{no} 最终 PASS={res["PASS"]} 方位提示={len(res["direction_hints"])} '
          f'家具={objects} 用时={round(time.time() - t0, 1)}s', flush=True)
    return out


if __name__ == '__main__':
    no = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    iters = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    rounds = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    allow = (len(sys.argv) > 4 and sys.argv[4] == 'dir')
    dp = int(sys.argv[5]) if len(sys.argv) > 5 else 40
    sd = int(sys.argv[6]) if len(sys.argv) > 6 else 20261115
    run(no, iters, rounds, allow, dp, sd)
