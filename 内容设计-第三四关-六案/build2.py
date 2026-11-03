import random,json,itertools
from build_design import build,solve,domains,co,adj,room_ok,CELLS,PEOPLE,TMP
NAMES={'A':0,'B':1,'C':2,'D':3,'E':4,'V':5}
def make(level,k):
 z=build(level,k);p=z['p'];room=z['room'];doors=z['doors']
 g=z['groups']
 chair=set(g['木椅'])|set(g['软椅']);carpet=set(g['红毯'])|set(g['蓝毯'])|set(g['圆毯'])
 desk=z['desk'];bl=z['blocks']
 plant=set(bl[:max(1,len(bl)-1)]);shelf=set(bl)-plant
 if not shelf and len(plant)>1:
  x=max(plant);plant.discard(x);shelf.add(x)
 obj={'桌子':{desk},'植物':plant,'书架':shelf,'椅子':chair,'地毯':carpet}
 blocked=set().union(obj['桌子'],plant,shelf)
 free=CELLS-blocked
 dset={tuple(sorted(d)) for d in doors}
 def near(f):
  s=set()
  for y in obj[f]:
   for x in adj(y):
    if room[x]==room[y] or tuple(sorted((x,y))) in dset:s.add(x)
  return s&free
 pool=[]
 for i in range(6):
  nm=PEOPLE[i]
  for f in('椅子','地毯'):
   if p[i] in obj[f]:
    pool.append((f'{nm} 站在{f}上',{i:obj[f]&free}))
    if sum(x in obj[f] for x in p)==1:
     pool.append((f'只有 {nm} 站在{f}上',{**{j:free-obj[f] for j in range(6) if j!=i},i:obj[f]&free}))
  for f in('桌子','植物','书架'):
   if obj[f] and p[i] in near(f):
    pool.append((f'{nm} 在{f}旁边',{i:near(f)}))
    if sum(x in near(f) for x in p)==1:
     pool.append((f'只有 {nm} 在{f}旁边',{**{j:free-near(f) for j in range(6) if j!=i},i:near(f)}))
  pool.append((f'{nm} 在第{p[i]%6+1}列',{i:{x for x in free if x%6==p[i]%6}}))
 nchair=sum(x in chair for x in p)
 def valid_roles(sols):
  return {(s,t) for s in sols for t in range(5) if room_ok(room,doors,s,t)}
 def furn(c):return any(w in c[0] for w in('椅子','地毯','桌子','植物','书架'))
 rng=random.Random(7000+level*10+k)
 for trial in range(60000):
  if level==3:
   cards=[]
   for i in rng.sample(range(6),6):
    opts=[c for c in pool if c[0].split()[0]==PEOPLE[i] or c[0].split()[1]==PEOPLE[i]]
    cards.append((i,rng.choice(opts)))
   cards.sort()
   cl=[c for _,c in cards]
   if sum(furn(c) for c in cl)<5 or sum('列' in c[0] for c in cl)>1:continue
   sols=solve(domains(free,[{'dom':c[1]} for c in cl]))
   vr=valid_roles(sols)
   if vr!={(p,3)} or len(sols)<2:continue
   dom=[set(free) for _ in range(6)]
   for c in cl:
    for i,s in c[1].items():dom[i]&=s
   if sum(len(d)>1 for d in dom)<4 or any(len(domains(free,[{'dom':c[1]}])[i])==1 for c in cl for i in c[1]):continue
   trace=[len(solve(domains(free,[{'dom':c[1]} for c in cl[:n]])) ) for n in range(1,7)]
   return dict(level=level,k=k,p=p,room=room,doors=doors,obj={a:sorted(b) for a,b in obj.items()},cards=[c[0] for c in cl],speakers=PEOPLE,trace=trace,raw=len(sols),victim_alt=[co(x) for x in sols[0] if False],alt=[ [co(x) for x in s] for s in sols if s!=p],lie=None,thief=3)
  else:
   cl=[]
   for i in range(6):
    if i==3:cl.append(None);continue
    opts=[c for c in pool if c[0].split()[0]==PEOPLE[i] or c[0].split()[1]==PEOPLE[i]]
    cl.append(rng.choice(opts))
   fake=[]
   for i in rng.sample(range(5),5):
    for f in('椅子','地毯'):
     if p[i] not in obj[f]:fake.append((f'{PEOPLE[i]} 站在{f}上',{i:obj[f]&free}))
    for f in('桌子','植物','书架'):
     if obj[f] and p[i] not in near(f):fake.append((f'{PEOPLE[i]} 在{f}旁边',{i:near(f)}))
   lie=rng.choice(fake);cl[3]=lie
   cs=[{'dom':c[1]} for c in cl]
   ok=True
   for drop in range(6):
    sols=solve(domains(free,[c for j,c in enumerate(cs) if j!=drop]))
    vr=valid_roles(sols)
    if drop==3:
     if vr!={(p,3)}:ok=False;break
    elif vr:ok=False;break
   if not ok:continue
   if sum(furn(c) for c in cl)<5:continue
   base=solve(domains(free,[c for j,c in enumerate(cs) if j!=3]))
   dom=domains(free,[c for j,c in enumerate(cs) if j!=3])
   if len(dom[3])<1 or len([x for x in base if True])!=1:continue
   trace=[len(solve(domains(free,[c for j,c in enumerate(cs) if j!=3][:n]))) for n in range(1,6)]
   return dict(level=level,k=k,p=p,room=room,doors=doors,obj={a:sorted(b) for a,b in obj.items()},cards=[c[0] for c in cl],speakers=PEOPLE,trace=trace,raw=len(base),alt=[],lie=3,thief=3)
 raise RuntimeError(f'失败 {level}-{k+1}')
if __name__=='__main__':
 res=[]
 for level in(3,4):
  for k in range(3):
   d=make(level,k);res.append(d);print('OK',level,k+1,d['trace'],d['cards'],flush=True)
 (TMP/'final.json').write_text(json.dumps(res,ensure_ascii=False,indent=1),encoding='utf-8')
