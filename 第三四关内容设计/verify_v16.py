"""v16 当前验收入口：全线索候选格；3/6教学，4/5/7真假分支。
旧 Model.audit 是历史摘卡算法，本入口不调用它。
用法 python verify_v16.py [current_design_v16.json] [verification_v16.json]
"""
import json, pathlib, sys, re, itertools
import numpy as np
from murdoku_engine_generic import Model, names_of, validate_geometry, BLOCK
ROOT = pathlib.Path(__file__).resolve().parent
BASIS = 'all-clue-v16/2026-11-16'

def independent(d):
    n=len(d['target']); names=names_of(n); room=np.array(d['room']); blocked=sum([d['objects'].get(k,[]) for k in BLOCK],[])
    # 独立逐行排列生成，不使用 Model 的板面或位集。
    perms=np.array(list(itertools.permutations(range(n))),dtype=np.int16)
    parts=[]
    for rr in itertools.permutations(range(n)):
        x=np.array(rr,dtype=np.int16)*n+perms
        parts.append(x[~np.isin(x,blocked).any(axis=1)])
    x=np.concatenate(parts); q=room[x]; nr=int(room.max())+1
    def ev(s):
        m=re.fullmatch(r'(椅子|地毯)上有(\d+)人',s)
        if m: return np.isin(x,d['objects'][m[1]]).sum(axis=1)==int(m[2])
        m=re.fullmatch(r'([A-V])在([A-V])([上下左右])方',s)
        if m:
            arr=x//n if m[3] in '上下' else x%n
            delta=arr[:,names.index(m[1])]-arr[:,names.index(m[2])]
            return delta<0 if m[3] in '上左' else delta>0
        m=re.fullmatch(r'([A-V])与([A-V])(不在|在)同一房间',s)
        if m: return (q[:,names.index(m[1])]==q[:,names.index(m[2])])==(m[3]=='在')
        m=re.fullmatch(r'([A-V])独自在房间',s)
        if m: return (q==q[:,names.index(m[1]),None]).sum(axis=1)==1
        m=re.fullmatch(r'(只有)?([A-V])(不在|在|坐在)(.+)(旁边|上)',s)
        if not m: raise ValueError('不支持的当前线索: '+s)
        only,p,neg,ob,where=m.groups(); cells=d['objects'][ob]
        if where=='旁边':
            cells=[a for a in range(n*n) if a not in blocked and any(room[a]==room[b] and abs(a//n-b//n)+abs(a%n-b%n)==1 for b in cells)]
        z=np.isin(x[:,names.index(p)],cells)
        if only: z &= np.isin(x,cells).sum(axis=1)==1
        return ~z if neg=='不在' else z
    masks=[np.logical_and.reduce([ev(s) for s in c]) for c in d['cards']]
    G=np.ones(len(x),bool)
    for s in d.get('general_clues',[]): G &= ev(s)
    S=G & np.logical_and.reduce(masks); adj=[set() for _ in range(nr)]
    for a,b in d['doors']: adj[int(room[a])].add(int(room[b])); adj[int(room[b])].add(int(room[a]))
    rows=[]; finals=[]
    for h in range(n-1):
        region=np.zeros(len(x),bool)
        counts=np.stack([(q==j).sum(axis=1)-(q[:,h]==j) for j in range(nr)],axis=1)
        for vr in range(nr):
            for tr in adj[vr]:
                z=(q[:,-1]==vr)&(q[:,h]==tr)
                for other in adj[vr]-{tr}: z &= counts[:,tr]>counts[:,other]
                region |= z
        pos=sorted(map(int,np.unique(x[S,h])))
        truth=d['level'] in (3,6) or len(pos)>=2
        f=S&region if truth else G&region&~masks[h]&np.logical_and.reduce([v for i,v in enumerate(masks) if i!=h])
        boards=sorted(map(tuple,x[f].tolist())); finals.append(boards)
        rows.append(dict(person=names[h],mode='truth' if truth else 'lie',optional_positions=pos,boards=len(boards),is_target=boards==[tuple(d['target'])]))
    return x,masks,S,rows,finals

def verify(d):
    n=len(d['target']); names=names_of(n); h=names.index(d['thief']); teaching=d['level'] in (3,6)
    assert d['version']=='v16'; assert len(d['cards'])==n
    validate_geometry(d); m=Model(d); bs=[m.card(c) for c in d['cards']]
    general=d.get('general_clues',[])
    G=m.card(general)
    S=G
    for b in bs: S &= b
    target=1<<m.t; tv=[bool(b&target) for b in bs]
    checks=[]
    def ck(label,ok,value=None):
        checks.append(dict(item=label,ok=bool(ok),value=value))
    if general:
        ck('通用线索至多一条且不引用人物身份',len(general)==1 and all(re.fullmatch(r'(椅子|地毯)上有\d+人',s) for s in general))
        ck('通用线索答案处为真',bool(G&target))
    ck('全真教学/仅盗窃者假',all(tv) if teaching else tv==[i!=h for i in range(n)],tv)
    positions={names[j]:m.positions(S,j) for j in range(n-1)}
    finals=[]; audit=[]
    for j in range(n-1):
        truth=teaching or len(positions[names[j]])>=2
        f=S&m.rb[j] if truth else G&m.rb[j]&(m.all^bs[j])
        if not truth:
            for i,b in enumerate(bs):
                if i!=j: f &= b
        finals.append(f); audit.append(dict(person=names[j],mode='truth' if truth else 'lie',optional_positions=positions[names[j]],boards=f.bit_count(),is_target=f==target))
    ck('预设身份人数规则后唯一摆位',finals[h]==target,finals[h].bit_count())
    if teaching:
        ck('全线索可选格至少2且人数规则确实消解',len(positions[names[h]])>=2 and S.bit_count()>1,dict(boards=S.bit_count(),positions=positions[names[h]]))
        ck('教学分支禁止启用假话反事实',all(a['mode']=='truth' for a in audit))
        # 教学验收只要求预设盗窃者下摆位唯一，不伪称身份唯一。
    else:
        ck('其他身份不得给出其他盘面',all(f==0 or f==target for f in finals))
        ck('盗窃者全线索候选格不超过1',len(positions[names[h]])<=1)
    single=[[len(m.positions(b,j)) for j in range(n)] for b in bs]
    ck('单卡不直接定位',min(map(min,single))>1,min(map(min,single)))
    clauses=[len(c) for c in d['cards']]; flat=sum(d['cards'],[])
    ck('第五七关每卡一句' if d['level'] in (5,7) else '单卡至多两句且复合卡至多2',all(x==1 for x in clauses) if d['level'] in (5,7) else max(clauses)<=2 and sum(x>1 for x in clauses)<=2)
    ck('不使用模糊距离靠近',not any('靠近' in s for s in flat+general))
    ck('受害者单句',clauses[-1]==1)
    ck('否定至多2只有至多1',sum('不在' in s for s in flat)<=2 and sum(s.startswith('只有') for s in flat)<=1)
    ck('无内部标签及全局人数句',not any(re.search(r'在R\d+房间|在第\d+(行|列)|上有\d+人',s) for s in flat))
    ck('方位距离条数至多2',sum(bool(re.search(r'[A-V]在[A-V][上下左右]方|比',s)) for s in flat)<=2)
    deletion=[]
    for i in range(n):
        if not tv[i]: continue
        f=G&m.rb[h]
        for j,b in enumerate(bs):
            if j!=i: f &= (m.all^b) if (not teaching and j==h) else b
        deletion.append(dict(card=i+1,boards=f.bit_count(),unique_target=f==target))
    if not teaching: ck('真卡删卡非冗余',all(not x['unique_target'] for x in deletion))
    if general:
        f=m.rb[h]
        for i,b in enumerate(bs): f &= (m.all^b) if not teaching and i==h else b
        ck('通用线索非冗余',f!=target,f.bit_count())
    x,masks,S2,audit2,boards2=independent(d)
    ck('独立实现全线索盘面完全一致',sorted(map(tuple,x[S2].tolist()))==sorted(map(tuple,m.x[m.to_bool(S)].tolist())))
    ck('独立实现逐卡语义一致',all(np.array_equal(x[z],m.x[m.to_bool(b)]) for z,b in zip(masks,bs)))
    ck('独立实现每个身份最终盘面一致',all(sorted(map(tuple,m.x[m.to_bool(f)].tolist()))==b for f,b in zip(finals,boards2)))
    ck('独立实现候选位置一致',all(a['optional_positions']==positions[a['person']] for a in audit2))
    out=dict(level=d['level'],version='v16',basis=BASIS,mode='teaching_all_true' if teaching else 'conditional_lie',PASS=all(c['ok'] for c in checks),checks=checks,truth_vector=tv,all_true_boards=S.bit_count(),final_solutions=finals[h].bit_count(),thief_own_positions=len(positions[names[h]]),thief_option_positions=[[v//n+1,v%n+1] for v in positions[names[h]]],identity_uniqueness_claimed=False,corrected_audit=audit,deletion_test=deletion,deletion_is_hard_gate=not teaching,legacy_audit_status='作废：不调用、不参与PASS',general_clues=general,cards=d['cards'],display_cards=d['display_cards'],target=d['target'],objects=d['objects'])
    print('L%d %s: S=%d P=%d final=%d checks=%d/%d'%(d['level'],'PASS' if out['PASS'] else 'FAIL',out['all_true_boards'],out['thief_own_positions'],out['final_solutions'],sum(c['ok'] for c in checks),len(checks)),flush=True)
    if not out['PASS']: print([c for c in checks if not c['ok']],flush=True)
    return out

def main():
    src=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'current_design_v16.json'
    dst=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'verification_v16.json'
    data=json.loads(src.read_text(encoding='utf8'))
    # 旧混合文件只在第三关更新了v16，不再据其旧5/6/7生成有效报告。
    if src.name=='design_selected_v16.json':
        current=json.loads((ROOT/'current_design_v16.json').read_text(encoding='utf8'))
        data=[next(d for d in data if d['level']==3)]+[d for d in current if d['level']!=3]
    data=[d for d in data if d['level'] in (3,4,5,6,7)]
    assert {d['level'] for d in data}=={3,4,5,6,7}
    result=[verify(d) for d in data]
    assert all(r['PASS'] for r in result),'未通过，不覆盖验收报告'
    dst.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print('已写入 '+str(dst),flush=True)
if __name__=='__main__': main()
