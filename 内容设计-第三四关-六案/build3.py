import random,json,sys,time
from build_design import build,solve,domains,co,adj,room_ok,CELLS,PEOPLE,TMP
def make(level,k,limit=200):
 z=build(level,k);p=z['p'];room=z['room'];doors=z['doors']
 dset={tuple(sorted(d)) for d in doors}
 rng=random.Random(9100+level*31+k);t0=time.time();pset=set(p)
 trial=0
 while time.time()-t0<limit:
  trial+=1
  others=sorted(CELLS-pset)
  rng.shuffle(others)
  ppl=list(range(6));rng.shuffle(ppl)
  chair=set(p[i] for i in ppl[:2]);carpet=set(p[i] for i in ppl[2:4])
  for _ in range(rng.choice((0,1))):chair.add(others.pop())
  for _ in range(rng.choice((1,2))):carpet.add(others.pop())
  desk=others.pop();plant={others.pop(),others.pop()};shelf={others.pop()}
  if rng.random()<.5:desk2={others.pop()}
  else:desk2=set()
  obj={'桌子':{desk}|desk2,'植物':plant,'书架':shelf,'椅子':chair,'地毯':carpet}
  blocked=set().union(obj['桌子'],plant,shelf)
  if blocked&pset:continue
  free=CELLS-blocked
  def near(f):
   s=set()
   for y in obj[f]:
    for x in adj(y):
     if room[x]==room[y] or tuple(sorted((x,y))) in dset:s.add(x)
   return s&free
  pool={i:[] for i in range(6)}
  for i in range(6):
   nm=PEOPLE[i]
   for f in('椅子','地毯'):
    if p[i] in obj[f]:
     pool[i].append((f'{nm} 站在{f}上',{i:obj[f]&free}))
     if sum(x in obj[f] for x in p)==1:pool[i].append((f'只有 {nm} 站在{f}上',{**{j:free-obj[f] for j in range(6) if j!=i},i:obj[f]&free}))
   for f in('桌子','植物','书架'):
    if p[i] in near(f):
     pool[i].append((f'{nm} 在{f}旁边',{i:near(f)}))
     if sum(x in near(f) for x in p)==1:pool[i].append((f'只有 {nm} 在{f}旁边',{**{j:free-near(f) for j in range(6) if j!=i},i:near(f)}))
  if any(not pool[i] for i in range(6) if not(level==4 and i==3)):continue
  def evalset(cl):
   sols=solve(domains(free,[{'dom':c[1]} for c in cl if c]))
   vr={(s,t) for s in sols for t in range(5) if room_ok(room,doors,s,t)}
   return sols,vr
  active=[i for i in range(6) if not(level==4 and i==3)]
  cur={i:rng.choice(pool[i]) for i in active}
  def cost(cur):
   sols,vr=evalset(list(cur.values()))
   if (p,3) not in vr:return 10**9
   return len(vr)*100+len(sols)
  best=cost(cur)
  for _ in range(3):
   for i in rng.sample(active,len(active)):
    for c in pool[i]:
     old=cur[i];cur[i]=c;v=cost(cur)
     if v<best:best=v
     else:cur[i]=old
  sols,vr=evalset(list(cur.values()))
  if level==3:
   if vr!={(p,3)} or len(sols)<2:continue
   cl=[cur[i] for i in range(6)]
   if sum('列' in c[0] for c in cl)>0:continue
   # no card alone fixes its speaker's subject to one cell, and thief must be the only one with multiple options
   dom=domains(free,[{'dom':c[1]} for c in cl])
   opt=[len({s[i] for s in sols}) for i in range(6)]
   if opt[3]<2 or sum(o>1 for o in opt)!=2:continue  # D and V alternate; thief identified after room rule
   return pack(level,k,p,room,doors,obj,cl,sols,free,None)
  else:
   if vr!={(p,3)} or len(sols)!=1:continue
   fake=[]
   for i in range(5):
    for f in('椅子','地毯'):
     if p[i] not in obj[f]:fake.append((f'{PEOPLE[i]} 站在{f}上',{i:obj[f]&free}))
    for f in('桌子','植物','书架'):
     if p[i] not in near(f) and near(f):fake.append((f'{PEOPLE[i]} 在{f}旁边',{i:near(f)}))
   rng.shuffle(fake)
   for lie in fake:
    cl=[cur.get(i) for i in range(6)];cl[3]=lie
    good=True
    for drop in range(6):
     s2,v2=evalset([c for j,c in enumerate(cl) if j!=drop])
     if drop==3:
      if v2!={(p,3)} or len(s2)!=1:good=False;break
     elif v2:good=False;break
    if good:return pack(level,k,p,room,doors,obj,cl,sols,free,3)
 raise RuntimeError(f'失败 {level}-{k+1} 试 {trial}')
def pack(level,k,p,room,doors,obj,cl,sols,free,lie):
 trace=[]
 order=[1,2,4,0,5,3] if lie is None else [1,2,4,0,5]
 acc=[]
 for i in order:
  if i<len(cl):acc.append(cl[i]);trace.append((cl[i][0],len(solve(domains(free,[{'dom':c[1]} for c in acc])))))
 return dict(level=level,k=k,p=list(p),room=room,doors=[list(d) for d in doors],obj={a:sorted(b) for a,b in obj.items()},cards=[c[0] for c in cl],trace=trace,alt=[list(s) for s in sols if s!=tuple(p)],lie=lie,thief=3)
if __name__=='__main__':
 level=int(sys.argv[1]);res=[]
 for k in range(3):
  d=make(level,k);res.append(d);print('OK',level,k+1,d['cards'],[t[1] for t in d['trace']],flush=True)
  (TMP/f'final{level}.json').write_text(json.dumps(res,ensure_ascii=False,indent=1),encoding='utf-8')
