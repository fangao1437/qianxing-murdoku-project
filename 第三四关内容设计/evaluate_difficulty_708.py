"""708五关难度画像。首次 --runtime Lua导出JSON；后续直接运行使用报告中的冻结输入。
不修改正式设计/验收报告；不调用历史audit/depth。输出同目录MD和JSON。
python -B evaluate_difficulty_708.py [--runtime runtime_levels.json]
"""
import argparse, copy, gc, hashlib, itertools, json, pathlib, re
import numpy as np
from murdoku_engine_generic import Model, names_of
from verify_v16 import independent
ROOT = pathlib.Path(__file__).resolve().parent
JSON_PATH = ROOT / '708_第3至7关难度指数.json'
MD_PATH = ROOT / '708_第3至7关难度指数.md'
COMMIT = '295818b17b84e5d159d255cf06dd985954990b5f'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def clause(c):
    t = c['type']
    if t == 'all_of': return sum([clause(x) for x in c['clauses']], [])
    if t in ('above','below','left_of','right_of'):
        axis = 'same_column' if t in ('above','below') else 'same_row'
        assert c.get(axis) is False
        return [c['a']+'在'+c['b']+dict(above='上',below='下',left_of='左',right_of='右')[t]+'方']
    if t in ('same_room','not_with'):
        return [c['a']+'与'+c['b']+('不在' if t=='not_with' else '在')+'同一房间']
    if t == 'n_on_object': return [c['object']+'上有'+str(c['n'])+'人']
    if t in ('beside_object','not_beside_object','on_object','only_on_object'):
        return [('只有' if t=='only_on_object' else '')+c['who']+('不在' if t=='not_beside_object' else '在')+c['object']+('旁边' if 'beside' in t else '上')]
    raise ValueError(t)

def load_inputs(runtime):
    current = {d['level']:d for d in json.loads((ROOT/'current_design_v16.json').read_text(encoding='utf8'))}
    old4 = next(d for d in json.loads((ROOT/'design_selected_v14.json').read_text(encoding='utf8')) if d['level']==4)
    out=[]
    for row in runtime:
        level=row['level']; lv=row['data']; n=lv['size']['rows']; names=names_of(n)
        d=copy.deepcopy(old4 if level==4 else current[level])
        room=[v-1 for r in row['room_grid'] for v in r]
        assert all((room[a]==room[b])==(d['room'][a]==d['room'][b]) for a in range(n*n) for b in range(n*n))
        objects={k:sorted((p['r']-1)*n+p['c']-1 for p in v['cells']) for k,v in lv['objects'].items()}
        assert objects=={k:sorted(v) for k,v in d['objects'].items()}
        target=[(lv['solution'][p]['r']-1)*n+lv['solution'][p]['c']-1 for p in names]
        assert target==d['target'] and lv['roles']['thief']==d['thief']
        cards=[clause(c) for c in lv['clues']]
        if level!=4: assert cards==d['cards']
        general=sum([clause(c) for c in lv.get('general_clues',[])],[])
        if level!=4: assert general==d.get('general_clues',[])
        doors=[]
        for kind,r,c in lv['doors']:
            u=(r-1)*n+c-1; doors.append([u,u+(1 if kind=='v' else n)])
        assert {tuple(sorted(p)) for p in doors}=={tuple(sorted(p)) for p in d['doors']}
        hints=lv['hint_preview']; hints=[hints[str(i)] for i in range(1,n+1)] if isinstance(hints,dict) else hints
        # 第4关历史卡序不同，只采用运行时语义，不沿用旧display_cards。
        display=d['display_cards'] if level!=4 else [[s.replace(names[i],'我') for s in c] for i,c in enumerate(cards)]
        out.append(dict(level=level,version=d['version'],room=room,doors=doors,objects=objects,target=target,thief=d['thief'],cards=cards,general_clues=general,display_cards=display,hint_preview=hints,announce=lv['meta']['announce'],walls=lv['walls']))
    assert sorted(d['level'] for d in out)==[3,4,5,6,7]
    return out

def evaluate(d):
    level=d['level']; n=len(d['target']); na=names_of(n); h=na.index(d['thief']); teaching=level in (3,6)
    m=Model(d); bs=[m.card(c) for c in d['cards']]; G=m.card(d['general_clues']); S=G
    for b in bs: S &= b
    target=1<<m.t
    def positions(b,i): return sorted(map(int,np.unique(m.x[m.to_bool(b),i]))) if b else []
    def boards(b): return sorted(map(tuple,m.x[m.to_bool(b)].tolist()))
    ps=[positions(S,j) for j in range(n-1)]
    finals=[]; pre=[]; audits=[]
    for j in range(n-1):
        truth=teaching or len(ps[j])>=2
        f=S if truth else G&(m.all^bs[j])
        if not truth:
            for i,b in enumerate(bs):
                if i!=j: f &= b
        pre.append(f); f &= m.rb[j]; finals.append(f)
        audits.append(dict(person=na[j],branch='truth' if truth else 'lie',positions=ps[j],before_population=pre[-1].bit_count(),final=f.bit_count(),is_target=f==target))
    # 独立逐行枚举和独立语义实现，避免复用主实现的位集运算。
    x,masks,S2,audit2,final2=independent(d)
    agreement=dict(all_true_boards=boards(S)==sorted(map(tuple,x[S2].tolist())),cards=all(np.array_equal(m.x[m.to_bool(b)],x[z]) for b,z in zip(bs,masks)),finals=all(boards(b)==bb for b,bb in zip(finals,final2)),positions=all(ps[i]==a['optional_positions'] for i,a in enumerate(audit2)))
    assert all(agreement.values()), agreement
    del x,masks,S2,audit2,final2; gc.collect()
    tv=[bool(b&target) for b in bs]
    single=[min(len(positions(b,j)) for j in range(n)) for b in bs]
    deletion=[]
    for i in range(n):
        if not tv[i]: continue
        f=G&m.rb[h]
        for j,b in enumerate(bs):
            if i!=j: f &= (m.all^b) if not teaching and j==h else b
        deletion.append(dict(card=i+1,boards=f.bit_count(),unique_target=f==target))
    # 新观察实验：固定通用线索为真，不含人数规则，全卡当真找最小矛盾子集。
    min_conflict=None; witnesses=[]
    if not S:
        for k in range(1,n+1):
            for subset in itertools.combinations(range(n),k):
                f=G
                for i in subset: f &= bs[i]
                if not f: witnesses.append([i+1 for i in subset])
            if witnesses: min_conflict=k; break
    general_without=m.rb[h]
    for i,b in enumerate(bs): general_without &= (m.all^b) if not teaching and i==h else b
    flat=sum(d['cards'],[])
    lang=dict(cards=n,clauses=len(flat),compound=sum(len(c)>1 for c in d['cards']),negative=sum('不在' in s for s in flat),only=sum(s.startswith('只有') for s in flat),direction=sum(bool(re.search(r'[A-V]在[A-V][上下左右]方|比',s)) for s in flat),general=len(d['general_clues']),self_reference=sum(any(na[i] in re.findall(r'[A-Z]',s) for s in c) for i,c in enumerate(d['cards'])),fuzzy_distance=any('靠近' in s for s in flat+d['general_clues']))
    hc=[p['count'] for p in d['hint_preview']]
    checks=dict(geometry=True,target_truth=all(tv) if teaching else tv==[i!=h for i in range(n)],target_unique=finals[h]==target,other_identity_boards=None if teaching else all(f in (0,target) for f in finals),teaching_candidates=len(ps[h])>=2 if teaching else None,single_card_not_locating=min(single)>1,truth_cards_nonredundant=None if teaching else all(not v['unique_target'] for v in deletion),dual_implementation=all(agreement.values()))
    extra={}
    if level==5:
        weak=m.mask('E在地毯上'); f=G&m.rb[h]
        for i,b in enumerate(bs): f &= weak if i==5 else ((m.all^b) if i==h else b)
        extra['only_to_on']=dict(original=finals[h].bit_count(),weakened=f.bit_count(),added_boards=f.bit_count()-finals[h].bit_count(),assumption='固定B假、其余真、人数规则成立；仅删去只有的排他语义')
    if level==7:
        extra['remove_general']=dict(original=finals[h].bit_count(),without=general_without.bit_count(),assumption='固定B假、其余真、人数规则成立；仅移除通用计数')
        E=m.mask('E在椅子上'); B=m.mask('B在椅子上'); f=G&E&B
        extra['capacity_implication']=dict(premise_boards=f.bit_count(),others_on_chair={p:int(np.isin(m.x[m.to_bool(f),j],d['objects']['椅子']).sum()) for j,p in enumerate(na) if p not in ('B','E')})
    if level in (5,7):
        # 仅重排五张真卡，保持假卡属于B；每个排列重新检查所有身份盘面。
        true_slots=[i for i in range(n) if i!=h]; best=-1; valid=0
        for order in itertools.permutations(true_slots):
            perm=list(range(n))
            for slot,src in zip(true_slots,order): perm[slot]=src
            bb=[bs[i] for i in perm]; good=True
            for j in range(n-1):
                f=S&m.rb[j] if len(ps[j])>=2 else G&m.rb[j]&(m.all^bb[j])
                if len(ps[j])<2:
                    for i,b in enumerate(bb):
                        if i!=j: f &= b
                if (j==h and f!=target) or f not in (0,target): good=False; break
            if good:
                valid+=1
                score=sum(any(na[i] in re.findall(r'[A-Z]',s) for s in d['cards'][src]) for i,src in enumerate(perm))
                best=max(best,score)
        extra['self_order']=dict(searched=120,valid=valid,maximum=best,current=lang['self_reference'],fixed_false_slot=h+1)
    result=dict(level=level,design_version=d['version'],mode='teaching_all_true' if teaching else 'conditional_lie',scope='独立当前口径评估，未升级正式版本' if level==4 else '708当前v16复算',grid=n,base_boards=m.M,S=S.bit_count(),P=len(ps[h]),before_population=pre[h].bit_count(),final=finals[h].bit_count(),population_eliminated=pre[h].bit_count()-finals[h].bit_count(),truth_vector=tv,identity_audit=audits,identity_uniqueness_claimed=False,checks=checks,dual_agreement=agreement,language=lang,hints=dict(counts=hc,covered=sum(x>0 for x in hc),total=sum(hc),positive_average=sum(hc)/sum(x>0 for x in hc),interpretation='计数为展示范围，0为不作静态提示；负句高亮可为排除区域，不等于候选格'),single_card_minima=single,deletion=deletion,min_conflict_observation=dict(size=min_conflict,witnesses=witnesses,scope='本轮新增观察值；全卡当真+通用线索+基础摆位；不含人数规则，不是旧闸门'),enhanced_sentence=extra,gac_depth=None)
    print(json.dumps({k:result[k] for k in ['level','S','P','before_population','final','checks','min_conflict_observation','enhanced_sentence']},ensure_ascii=False),flush=True)
    del m; gc.collect()
    return result

def make_report(result):
    lines=['# 708 第3～7关难度指数与相对梯度','','指标基准：GitHub `fangao1437/qianxing-murdoku-project` 提交 `'+COMMIT+'`；评估日期：2026-11-17。','',
    '这里的难度指数采用多维画像，不设未经标定的百分制总分。GitHub指标体系没有总分公式；检查项通过数量不计入难度。GAC/位置试位深度未重算，不借用旧值。','',
    '## 统一数据表','','S为全部卡面和通用线索全真、不含人数规则的盘数；P为S中预设盗窃者的格数。人数前/后采用正确教学或真假分支，身份固定为预设盗窃者。','',
    '|关|模式|盘面|S / P|人数前→后|子句/复合卡|否定/只有/方位|通用|提示覆盖|提示格数|最小矛盾卡数¹|',
    '|---|---|---|---|---|---|---|---|---|---|---|']
    for r in result:
        l=r['language']; h=r['hints']; conflict=r['min_conflict_observation']['size']
        lines.append(f"|{r['level']}|{'全真教学' if r['mode']=='teaching_all_true' else '条件说谎'}|{r['grid']}×{r['grid']}|{r['S']} / {r['P']}|{r['before_population']}→{r['final']}|{l['clauses']} / {l['compound']}|{l['negative']} / {l['only']} / {l['direction']}|{l['general']}|{h['covered']}/{l['cards']}|{'/'.join(map(str,h['counts']))}|{conflict if conflict is not None else '不适用'}|")
    lines += ['', '¹ 最小矛盾卡数为本轮新增观察实验：通用线索始终成立，不含人数规则，找出最少几张卡全当真即不可能。不是历史值、不是验收闸门，也不等同于人类推理深度。', '',
    '## 难度判断边界','',
    '- 第3关：全真教学、六张单句，侧重方位关系与人数收口；作为基础教学档。',
    '- 第4关：六张单句、一条方位，适合作为真假机制入门；本轮用实际Lua卡序独立复算，原v14版本不变。具体能否通过当前核心约束看下表，不能引用历史PASS替代。',
    '- 第5关：单句包含否定与唯一量词。但固定B假、其余真、人数规则成立时，把「只有E在地毯上」弱化为「E在地毯上」，最终仍为1盘。排他语义虽更强，却未证明是本题这个分支的必要信息；不能仅按有「只有」就加难度分。',
    '- 第6关：全真，但7×7、七人九子句、两复合卡、两否定，自述相关卡0/7，阅读和交叉引用负担最高；不因全真就断言比4/5/7都简单。第1/3/6张卡的删卡观察仍唯一，教学口径不将它们判为不合法。',
    '- 第7关：每卡一句，无否定和方位词；最小矛盾组需要5张人物卡（另有通用计数始终成立），第4/5关仅需2张。移除通用计数使最终盘面1→6，是明确的容量联动实例；这些指标支持其联动范围更大，不证明人类解法必需试位。',
    '- 机制维度可采用3（全真入门）→4（真假入门）→5（排他）→7（全局计数）的教学梯度；第6关是大盘面综合教学支线。此为设计建议，不是经玩家测试确认的总难度排名。',
    '- 5与7的绝对难度先后、6与真假关的跨机制比较，目前证据不足；不能据19项检查或提示30格就断言7最难。',
    '- 提示统计分开记录覆盖卡数与高亮范围。更大的范围可能更不精确；负句可能高亮排除格。不得将总格数直接折算成帮助强弱。', '', '## 当前口径复算与独立交叉检查','', '|关|核心约束|双实现|自述相关卡|最少单卡候选格|','|---|---|---|---|---|']
    for r in result:
        failed=[k for k,v in r['checks'].items() if v is False]
        lines.append(f"|{r['level']}|{'通过' if not failed else '未通过：'+','.join(failed)}|四项一致|{r['language']['self_reference']}/{r['language']['cards']}|{min(r['single_card_minima'])}|")
    lines += ['', '核心约束与本轮难度观察分开列示：本脚本不覆盖正式verification_v16.json，也不扩展正式验收的关卡范围。所有关卡都不声称身份唯一。自述相关卡计数指该卡至少引用说话者本人，不代表复合卡全部子句都是自述。', '', '**第4关不能标为当前口径全部通过**：第1卡「A在D上方」删去后，在预设E说假话及人数规则分支仍只剩答案，未满足真假关的真卡非冗余要求。其摆位唯一与双实现一致均通过。此次只报告，不修谜面。', '', '人数前→后、矛盾卡组大小、卡面负担分别反映不同方面，不能直接相加成心理难度。第7关30个提示格为人物卡累计，另有通用卡4格；不将这4格重复计入人物卡覆盖。', '', '## 增强单句的实测贡献','']
    for r in result:
        if r['enhanced_sentence']: lines += [f"### 第{r['level']}关",'', '```json',json.dumps(r['enhanced_sentence'],ensure_ascii=False,indent=2),'```','']
    lines += ['## 可复跑与数据来源','', '`python -B 第三四关内容设计/evaluate_difficulty_708.py`：使用配套JSON冻结的运行时输入复算；首次可加 `--runtime` 指定Lua导出。', '', 'JSON包含五关冻结输入、每关各身份分支、删卡数据、最小矛盾见证、增强单句消融实验、两套实现一致性及源文件哈希。运行时房间分区、门、家具、答案均与设计逐项核对；第4关历史卡序差异已由实际Lua替换。', '', '本轮未修改关卡、存档、正式验收入口或历史深度；未进行玩家计时、试错率或实机测试。因此不输出无实测依据的预计通关分钟数。','']
    return '\n'.join(lines)

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--runtime',type=pathlib.Path); args=parser.parse_args()
    inputs=load_inputs(json.loads(args.runtime.read_text(encoding='utf8'))) if args.runtime else json.loads(JSON_PATH.read_text(encoding='utf8'))['inputs']
    results=[evaluate(d) for d in sorted(inputs,key=lambda d:d['level'])]
    hashes={p.name:digest(p) for p in [ROOT/'难度判定指标体系.md',ROOT/'difficulty_metrics.json',ROOT/'current_design_v16.json',ROOT/'verify_v16.py',ROOT/'murdoku_engine_generic.py']}
    out=dict(save_revision=708,evaluation_date='2026-11-17',metrics_commit=COMMIT,aggregate_score=None,reason_no_score='上游没有标定总分公式；采用多维指标',source_hashes=hashes,inputs=inputs,results=results)
    JSON_PATH.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    MD_PATH.write_text(make_report(results),encoding='utf8')
    print('WROTE',JSON_PATH,MD_PATH,flush=True)
if __name__=='__main__': main()
