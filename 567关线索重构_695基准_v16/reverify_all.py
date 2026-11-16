"""用当前（最终）口径重新完整复验三关定稿，并回写 _best_L*.json。

搜索产物里的 choice 是当时 Solver 的候选索引；由于候选表随随机种子变化，
这里枚举若干候选种子，找到能逐卡还原出同一套卡面的 Solver 后再全量复验。
"""
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
import design_v16 as D
import solve_v16 as SV

SEEDS = {
    5: [20261115 + rd * 131 for rd in range(0, 5)],
    6: [771103 + rd * 131 for rd in range(0, 5)],
    7: [20261115 + rd * 131 for rd in range(0, 5)],
}


def try_reverify(no, objs, cards, choice):
    """枚举候选种子，返回通过最多闸门的那次 (choice, result)。"""
    best = None
    for sd in SEEDS[no]:
        s = D.Solver(no, objects=objs, allow_direction=True, dir_penalty=14, seed=sd)
        ch = None
        if choice and max(choice) < min(len(c) for c in s.cards):
            if all(tuple(s.cards[i][j]['s']) == tuple(c)
                   for i, (j, c) in enumerate(zip(choice, cards))):
                ch = list(choice)
        if ch is None:
            ch = SV.warm(s, cards)
            if not ch or any(tuple(s.cards[i][j]['s']) != tuple(c)
                             for i, (j, c) in enumerate(zip(ch, cards))):
                continue
        res = s.verify(ch)
        key = (bool(res['PASS']), -len(res['direction_hints']),
               sum(c['ok'] for c in res['checks']))
        if best is None or key > best[0]:
            best = (key, ch, res)
        if res['PASS'] and len(res['direction_hints']) == 0:
            break
    return (best[1], best[2]) if best else None


LEVELS = [int(a) for a in sys.argv[1:]] or [5, 6, 7]

for no in LEVELS:
    best = None
    for p in sorted(ROOT.glob(f'_best_L{no}*.json')):
        x = json.loads(p.read_text(encoding='utf8'))
        objs, cards = x['objects'], x['result']['cards']
        got = try_reverify(no, objs, cards, x.get('choice'))
        if got is None:
            print(f'  {p.name}: 无法重建候选表，跳过', flush=True)
            continue
        ch, res = got
        key = (bool(res['PASS']), -len(res['direction_hints']),
               -sum(len(v) for v in objs.values()))
        print(f'  {p.name}: PASS={res["PASS"]} dirs={len(res["direction_hints"])} '
              f'S={res["all_clue_boards"]} '
              f'opts={res["optional_positions"][D.BASE[str(no)]["thief"]]} '
              f'furn={sum(len(v) for v in objs.values())} '
              f'failed={[c["item"] for c in res["checks"] if not c["ok"]]}', flush=True)
        if best is None or key > best[0]:
            best = (key, p, objs, ch, res)
    assert best, f'第{no}关无可用结果'
    key, p, objs, ch, res = best
    if res['PASS']:
        out = dict(level=no, objects=objs, choice=ch, result=res,
                   design=D.make_design(no, objs, res['cards']))
        p.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str),
                     encoding='utf8')
        print(f'== L{no} 采用 {p.name}：{sum(c["ok"] for c in res["checks"])}'
              f'/{len(res["checks"])} 项通过，方位提示 {len(res["direction_hints"])} 条', flush=True)
    else:
        print(f'== L{no} 未找到通过全部闸门的结果', flush=True)
