"""读取 695 存档内嵌 Lua 的「实际关卡设计」，并还原 695 卡面文本。

输出 695_实际关卡数据.json：
  - lua        : 695 内嵌 Lua 的 levels.case_00N 模块（权威：墙/门/家具/答案/线索）
  - texts      : 695 实际静态卡面（693 文本 + 695 的「墨绿誊写→誊写员」改名）
  - room       : 按 695 内嵌 Lua 的 room_map.compute_rooms 从 walls 推出的区域掩码(0-based)
  - door_pairs : 按 695 的 wall_key 语义把 doors 段还原成 (u,v) 格对（0-based）
  - target     : 0-based 格号数组
  - objects    : {家具: [0-based 格号]}
只读，不改任何 .gil / 存档。
"""
import json, pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent
QX = ROOT.parent / 'qianxing-murdoku'
LUA695 = QX / '695_地毯原型注册与改名' / '695_内嵌Lua_695.lua'
TEXT693 = QX / '693_真机修正' / '693_静态文本补丁.json'

# ---------- 极简 Lua 表解析器（只处理 695 模块里出现的语法） ----------
PUNCT = '{}=,[]'


def tokenize(s):
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch.isspace():
            i += 1; continue
        if ch in PUNCT:
            out.append(ch); i += 1; continue
        if ch == '"':
            j = i + 1
            while j < len(s) and s[j] != '"':
                j += 2 if s[j] == '\\' else 1
            out.append(('str', s[i + 1:j].replace('\\"', '"')))
            i = j + 1; continue
        j = i
        while j < len(s) and not s[j].isspace() and s[j] not in PUNCT and s[j] != '"':
            j += 1
        out.append(s[i:j])
        i = j
    return out


def parse_table(src):
    toks = tokenize(src)
    pos = 0

    def peek():
        return toks[pos] if pos < len(toks) else ('EOF', '')

    def value():
        nonlocal pos
        t = toks[pos]; pos += 1
        if t == '{':
            obj, seq = {}, 1
            while peek() != '}':
                if peek() == '[':
                    pos += 1
                    k = toks[pos]; pos += 1
                    k = k[1] if isinstance(k, tuple) else k
                    assert toks[pos] == ']', ('missing ]', pos, toks[pos:pos + 3])
                    assert toks[pos + 1] == '=', ('missing =', pos, toks[pos:pos + 3])
                    pos += 2
                    obj[str(k)] = value()
                elif not isinstance(peek(), tuple) and peek() not in PUNCT \
                        and pos + 1 < len(toks) and toks[pos + 1] == '=':
                    k = toks[pos]; pos += 2
                    obj[str(k)] = value()
                else:
                    v = value()
                    obj[str(seq)] = v
                    seq += 1
                if peek() == ',':
                    pos += 1
                else:
                    assert peek() == '}', ('expect }', pos, toks[pos:pos + 4])
            pos += 1  # }
            return obj
        if isinstance(t, tuple):
            return t[1]
        if t == 'true':
            return True
        if t == 'false':
            return False
        if t == 'nil':
            return None
        assert re.fullmatch(r'-?\d+', t), ('unknown token', t, pos)
        return int(t)

    out = value()
    assert pos == len(toks), (pos, len(toks), toks[pos:pos + 5])
    return out


def norm(x):
    """把解析出的「数字字符串键」表还原成 Lua 数组，其余递归还原。"""
    if isinstance(x, dict):
        ks = list(x)
        if ks and all(k.isdigit() for k in ks) and sorted(int(k) for k in ks) == list(range(1, len(ks) + 1)):
            return [norm(x[str(i)]) for i in range(1, len(ks) + 1)]
        return {k: norm(v) for k, v in x.items()}
    return x


def main():
    lines = LUA695.read_text(encoding='utf8').split('\n')
    levels = {}
    for i, line in enumerate(lines):
        m = re.match(r'__M\["levels\.(case_00\d)"\] = function\(\)', line)
        if not m:
            continue
        j = i + 1
        while j < len(lines) and lines[j].strip() != 'end':
            j += 1
        body = '\n'.join(lines[i + 1:j]).strip()
        assert body.startswith('return '), body[:40]
        lv = norm(parse_table(body[len('return '):]))
        levels[m[1]] = lv

    t693 = json.loads(TEXT693.read_text(encoding='utf8'))['texts']
    texts = {}
    for lv in range(1, 8):
        rows = json.loads(json.dumps(t693[str(lv)], ensure_ascii=False))
        if lv == 7:
            for r in rows:
                r['what'] = r['what'].replace('C墨绿誊写', 'C誊写员')
                r['who'] = r['who'].replace('墨绿誊写', '誊写员')
        texts[str(lv)] = rows

    out = {'version': 695, 'source_lua': str(LUA695.relative_to(ROOT.parent)),
           'source_texts': str(TEXT693.relative_to(ROOT.parent)), 'levels': {}}
    for k, lv in levels.items():
        n = lv['size']['rows']
        assert n == lv['size']['cols']
        # --- walls → room mask（照抄 695 room_map.compute_rooms） ---
        wall = set()
        for w in lv['walls']:
            wall.add((w[0], w[1], w[2]))
        room = [[0] * n for _ in range(n)]
        index = 0
        for sr in range(1, n + 1):
            for sc in range(1, n + 1):
                if room[sr - 1][sc - 1] != 0:
                    continue
                index += 1
                stack = [(sr, sc)]
                room[sr - 1][sc - 1] = index
                while stack:
                    r, c = stack.pop()
                    if c < n and ('v', r, c) not in wall and room[r - 1][c] == 0:
                        room[r - 1][c] = index; stack.append((r, c + 1))
                    if c > 1 and ('v', r, c - 1) not in wall and room[r - 1][c - 2] == 0:
                        room[r - 1][c - 2] = index; stack.append((r, c - 1))
                    if r < n and ('h', r, c) not in wall and room[r][c - 1] == 0:
                        room[r][c - 1] = index; stack.append((r + 1, c))
                    if r > 1 and ('h', r - 1, c) not in wall and room[r - 2][c - 1] == 0:
                        room[r - 2][c - 1] = index; stack.append((r - 1, c))
        room_flat = [x - 1 for row in room for x in row]
        # --- doors 段 → 格对 ---
        pairs = []
        for kind, r, c in lv['doors']:
            if kind == 'v':
                pairs.append([(r - 1) * n + c - 1, (r - 1) * n + c])
            else:
                pairs.append([(r - 1) * n + c - 1, r * n + c - 1])
        objs = {name: [(q['r'] - 1) * n + q['c'] - 1 for q in spec['cells']]
                for name, spec in lv['objects'].items()}
        na = ''.join(s['id'] for s in lv['suspects'])
        target = [(lv['solution'][a]['r'] - 1) * n + lv['solution'][a]['c'] - 1 for a in na]
        out['levels'][str(int(k[-3:]))] = dict(
            id=lv['id'], name=lv['name'], difficulty=lv['difficulty'], size=n,
            room=room_flat, doors=pairs, walls=lv['walls'], doors_raw=lv['doors'],
            objects=objs,
            object_spec={k2: dict(occupiable=v['occupiable'], kind=v['kind'])
                         for k2, v in lv['objects'].items()},
            target=target, thief=lv['roles']['thief'], meta=lv['meta'],
            clues=lv['clues'], visual_theme=lv.get('visual_theme'),
            suspects={s['id']: s['name'] for s in lv['suspects']},
            texts=texts[str(int(k[-3:]))],
            hint_preview=lv.get('hint_preview', {}),
        )
    (ROOT / '695_实际关卡数据.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
    for no, lv in out['levels'].items():
        print(f"case_00{no} {lv['size']}x{lv['size']} 房间数={max(lv['room'])+1} "
              f"门={len(lv['doors'])} 家具={sum(len(v) for v in lv['objects'].values())}格 "
              f"盗窃者={lv['thief']} 线索={len(lv['clues'])} "
              f"相邻对={sorted({tuple(sorted((lv['room'][a], lv['room'][b]))) for a, b in lv['doors']})}")
    print('已写 695_实际关卡数据.json')


if __name__ == '__main__':
    main()
