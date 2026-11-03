import random,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent;TMP=ROOT/'_tmp';TMP.mkdir(exist_ok=True)
cells=list(range(36));ROWNAME='ABCDEV'
KIND={'桌':2,'植':3,'架':1,'椅':3,'毯':4}
def rc(x):return divmod(x,6)
def coord(x):r,c=rc(x);return f'({r+1},{c+1})'
T3=[['AAAABB','AAAABB','AAAABB','AAAABB','CCCCBB','CCCCBB'],
    ['AAAABB','AAAABB','AAAABB','CAAABB','CCCCCB','CCCCCB'],
    ['AAAAAA','AAAAAA','BBAACC','BBAACC','BBBCCC','BBBCCC']]
T4=[['AAAABB','AAAABB','CCDDBB','CCDDBB','CCDDDD','CCDDDD'],
    ['AAABBB','AAABBB','CCCBBB','CDDDDD','CDDDDD','CCDDDD'],
    ['AAABBB','CCABBB','CCABDD','CCCCDD','EEEEDD','EEEEDD']]
def edges(room):
 g={}
 for a in cells:
  for b in (a+1,a+6):
   if b<36 and (b==a+6 or a//6==b//6) and room[a]!=room[b]:g.setdefault(''.join(sorted((room[a],room[b]))),[]).append((a,b))
 return g
def connected(rooms,pairs):
 seen={rooms[0]};ch=True
 while ch:
  ch=False
  for p in pairs:
   if (p[0] in seen)!=(p[1] in seen):seen|=set(p);ch=True
 return seen==set(rooms)
def layout(rng,room):
 room=''.join(room)
 g=edges(room);rooms=sorted(set(room))
 while True:
  keep=[k for k in g if rng.random()<(.9 if len(rooms)==3 else .65)]
  if connected(rooms,keep):break
 doors=[rng.choice(g[k]) for k in keep]
 adj={r:set() for r in rooms}
 for a,b in doors:adj[room[a]].add(room[b]);adj[room[b]].add(room[a])
 pos=rng.sample(cells,13)
 obj={'桌':pos[:2],'植':pos[2:5],'架':pos[5:6],'椅':pos[6:9],'毯':pos[9:13]}
 return dict(room=''.join(room),doors=doors,adj=adj,obj=obj)
def near(b,kind):
 d=set()
 for y in b['obj'][kind]:
  r,c=rc(y)
  for dr,dc in((1,0),(-1,0),(0,1),(0,-1)):
   rr,cc=r+dr,c+dc
   if 0<=rr<6 and 0<=cc<6:
    x=rr*6+cc
    if b['room'][x]==b['room'][y] or tuple(sorted((x,y))) in [tuple(sorted(z)) for z in b['doors']]:d.add(x)
 return d
def blocked(b):return set(b['obj']['桌'])|set(b['obj']['植'])|set(b['obj']['架'])
def spatial(b,p,t):
 rm=[b['room'][x] for x in p];v=rm[5];rt=rm[t]
 if rm.count(v)!=1 or len(b['adj'][v])<2 or rt not in b['adj'][v]:return False
 ns={q:sum(i!=t and z==q for i,z in enumerate(rm)) for q in b['adj'][v]}
 return all(ns[rt]>n for q,n in ns.items() if q!=rt)
# clue: dict(text,dom={person:set},pred)
def clue(b,p,j,speaker,kind,truth=True):
 name='ABCDEV'[j];free=set(cells)-blocked(b);sit=set(b['obj']['椅'])|set(b['obj']['毯'])
 T={'on':lambda k:(f'{name} 站在{k}上',{j:set(b['obj'][k])},None),
    'beside':lambda k:(f'{name} 在{k}旁边',{j:near(b,k)&free},None),
    'only_on':lambda k:(f'只有 {name} 站在{k}上',{**{i:set(free)-set(b['obj'][k]) for i in range(6) if i!=j},j:set(b['obj'][k])},None),
    'only_beside':lambda k:(f'只有 {name} 在{k}旁边',{**{i:set(free)-near(b,k) for i in range(6) if i!=j},j:near(b,k)&free},None),
    'col':lambda k:(f'{name} 在第{k+1}列',{j:{x for x in free if x%6==k}},None),
    'row':lambda k:(f'{name} 在第{k+1}行',{j:{x for x in free if x//6==k}},None),
    'chairs':lambda k:(f'有 {k} 人坐在椅子上',{},lambda q,k=k:sum(x in b['obj']['椅'] for x in q)==k),
    'nobody':lambda k:(f'{k}上没有人',{i:set(free)-set(b['obj'][k]) for i in range(6)},None)}
 k=None
 if kind in('on','beside','only_on','only_beside','nobody'):k=kind_obj
 return T
def sat(b,p,j,kind,k):
 pos=p[j];free=set(cells)-blocked(b)
 if kind=='on':return pos in b['obj'][k]
 if kind=='beside':return pos in near(b,k)
 if kind=='only_on':return pos in b['obj'][k] and all(p[i] not in b['obj'][k] for i in range(6) if i!=j)
 if kind=='only_beside':return pos in near(b,k) and all(p[i] not in near(b,k) for i in range(6) if i!=j)
 if kind=='col':return pos%6==k
 if kind=='row':return pos//6==k
 if kind=='chairs':return sum(x in b['obj']['椅'] for x in p)==k
 if kind=='nobody':return all(x not in b['obj'][k] for x in p)
def mk(b,j,kind,k):
 name='ABCDEV'[j];free=set(cells)-blocked(b)
 if kind=='on':return (f'{name} 站在{k}上',{j:set(b['obj'][k])},None)
 if kind=='beside':return (f'{name} 在{k}旁边',{j:near(b,k)&free},None)
 if kind=='only_on':return (f'只有 {name} 站在{k}上',{**{i:free-set(b['obj'][k]) for i in range(6) if i!=j},j:set(b['obj'][k])},None)
 if kind=='only_beside':return (f'只有 {name} 在{k}旁边',{**{i:free-near(b,k) for i in range(6) if i!=j},j:near(b,k)&free},None)
 if kind=='col':return (f'{name} 在第{k+1}列',{j:{x for x in free if x%6==k}},None)
 if kind=='row':return (f'{name} 在第{k+1}行',{j:{x for x in free if x//6==k}},None)
 if kind=='chairs':return (f'有 {k} 人坐在椅子上',{},lambda q,k=k:sum(x in b['obj']['椅'] for x in q)==k)
 if kind=='nobody':return (f'{k}上没有人',{i:free-set(b['obj'][k]) for i in range(6)},None)
def solve(b,clues,limit=200):
 free=set(cells)-blocked(b)
 ds=[set(free) for _ in range(6)]
 for c in clues:
  for i,s in c[1].items():ds[i]&=s
 sit=set(b['obj']['椅'])|set(b['obj']['毯'])
 out=[];order=sorted(range(6),key=lambda i:len(ds[i]));p=[-1]*6
 def rec(j,R,C):
  if len(out)>=limit:return
  if j==6:
   if all(c[2] is None or c[2](p) for c in clues):out.append(tuple(p))
   return
  i=order[j]
  for x in ds[i]:
   r,c=rc(x)
   if R>>r&1 or C>>c&1:continue
   p[i]=x;rec(j+1,R|1<<r,C|1<<c)
 rec(0,0,0);return out
def fullsols(b,clues):
 res=set()
 for p in solve(b,clues,5000):
  for t in range(5):
   if spatial(b,p,t):res.add((p,t))
 return res
def candidates(b,p):
 out=[]
 for j in range(6):
  for kind in('on','beside','only_on','only_beside'):
   for k in('椅','毯') if kind in('on','only_on') else('桌','植','架'):
    if kind=='only_on' and k=='椅':continue
    if kind=='on' and p[j] in b['obj'][k] or kind in('beside','only_beside','only_on') and sat(b,p,j,kind,k):out.append((j,kind,k))
  if j!=5:pass
  out.append((j,'col',p[j]%6));out.append((j,'row',p[j]//6))
 out.append((0,'chairs',sum(x in b['obj']['椅'] for x in p)))
 out.append((0,'nobody','毯')) if all(x not in b['obj']['毯'] for x in p) else None
 return [c for c in out if sat(b,p,c[0],c[1],c[2])]
WEIGHT={'on':3,'beside':4,'only_on':3,'only_beside':3,'col':.3,'row':.2,'chairs':1,'nobody':1}
def pick_answer(rng,b):
 free=sorted(set(cells)-blocked(b))
 for _ in range(3000):
  rows=rng.sample(range(6),6);cols=rng.sample(range(6),6)
  p=[rows[i]*6+cols[i] for i in range(6)]
  if all(x in free for x in p):
   for t in rng.sample(range(5),5):
    if spatial(b,p,t):return tuple(p),t
 return None
def design(level,k,seed):
 rng=random.Random(seed)
 for trial in range(60000):
  b=layout(rng,(T3 if level==3 else T4)[k]);pa=pick_answer(rng,b)
  if not pa:continue
  p,t=pa
  cand=candidates(b,p)
  # one card per person; speaker is assigned by letter (speaker i says clue i)
  chosen=[];used=set()
  kinds=set()
  for sp in range(6):
   opts=[c for c in cand if (c[1],c[2],c[0]) not in used]
   w=[WEIGHT[c[1]]*(2 if c[0]!=sp else .6)*(0.25 if c[1] in kinds and c[1] in('col','row','chairs','nobody') else 1) for c in opts]
   c=rng.choices(opts,w)[0];chosen.append(c);used.add((c[1],c[2],c[0]));kinds.add(c[1])
  furn={c[2] for c in chosen if c[1] in('on','beside','only_on','only_beside','nobody')}
  if len(furn)<3 or sum(c[1] in('col','row') for c in chosen)>1:continue
  # every person must be referenced
  refd={c[0] for c in chosen if c[1]!='chairs' and c[1]!='nobody'}
  clues=[mk(b,*c) for c in chosen]
  if level==3:
   fs=fullsols(b,clues)
   if fs!={(p,t)}:continue
   raw=len(solve(b,clues,50))
   if raw<2:continue
   return dict(level=3,variant=k,b=b,p=p,t=t,chosen=chosen,texts=[c[0] for c in clues],raw=[list(x) for x in solve(b,clues,50)],trial=trial,false=None)
  else:
   # replace one non-victim clue by a false one
   fi=rng.choice(range(5))
   falsec=[]
   for j in range(5):
    for kind in('on','beside','only_on','only_beside'):
     for kk in('椅','毯') if kind in('on','only_on') else('桌','植','架'):
      if not sat(b,p,j,kind,kk):falsec.append((j,kind,kk))
   falsec.append((0,'chairs',3 if sum(x in b['obj']['椅'] for x in p)!=3 else 2))
   fc=rng.choice(falsec);new=list(chosen);new[fi]=fc
   clues=[mk(b,*c) for c in new]
   if solve(b,clues,1) and any(spatial(b,q,tt) for q in solve(b,clues,500) for tt in range(5)):continue
   total=set()
   for drop in range(6):
    cl=[c for i,c in enumerate(clues) if i!=drop]
    total|=fullsols(b,cl)
    if len(total)>1:break
   if total!={(p,t)}:continue
   return dict(level=4,variant=k,b=b,p=p,t=t,chosen=new,texts=[c[0] for c in clues],raw=[],trial=trial,false=fi)
 raise RuntimeError(f'exhausted {level}-{k}')
def ser(x):
 b=x['b'];x=dict(x);x['b']=dict(room=b['room'],doors=[list(d) for d in b['doors']],adj={k:sorted(v) for k,v in b['adj'].items()},obj=b['obj'])
 x['p']=list(x['p']);return x
if __name__=='__main__':
 level=int(sys.argv[1]);out=[]
 for k in range(3):
  d=design(level,k,1000*level+k+int(sys.argv[2]) if len(sys.argv)>2 else 1000*level+k)
  out.append(ser(d));print(level,k+1,'试',d['trial'],[coord(x) for x in d['p']],'盗窃者','ABCDE'[d['t']],d['texts'],'假话',d['false'],flush=True)
 (TMP/f'level{level}.json').write_text(json.dumps(out,ensure_ascii=False,indent=1),encoding='utf8')
