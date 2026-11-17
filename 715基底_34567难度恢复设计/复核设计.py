# 重算本目录五关设计：python -B 复核设计.py [3 4 5 6 7]
# 依赖numpy；输出JSON到标准输出，不写运行时、不导出存档。
import json,itertools,copy,hashlib,sys
from pathlib import Path
from types import SimpleNamespace
import numpy as np
class Puzzle:
 def __init__(self,d):
  self.d=d;self.n=d['size']['rows'];self.names=[s['id'] for s in d['suspects']];self.vi=self.names.index(d['victim']['id']);n=self.n
  def cell(p):return (p['r']-1)*n+p['c']-1
  self.cell=cell;self.obj={k:set(map(cell,v['cells'])) for k,v in d['objects'].items()}
  self.block=set(map(cell,d.get('blocked',[])))|set(map(cell,d.get('water',[])))
  for k,v in d['objects'].items():
   if not v['occupiable']:self.block|=self.obj[k]
  def edge(e):
   dr=1 if e[0]=='h' else 0;dc=1-dr;a=(e[1]-1)*n+e[2]-1;return tuple(sorted((a,a+dr*n+dc)))
  walls=set(map(edge,d['walls']));self.room={};rid=0
  for a in range(n*n):
   if a in self.room:continue
   self.room[a]=rid;todo=[a]
   while todo:
    b=todo.pop()
    for c in range(n*n):
     if c not in self.room and abs(c//n-b//n)+abs(c%n-b%n)==1 and tuple(sorted((b,c))) not in walls:self.room[c]=rid;todo.append(c)
   rid+=1
  self.adj={r:set() for r in range(rid)}
  for e in d['doors']:
   a,b=edge(e);ra,rb=self.room[a],self.room[b];assert ra!=rb
   self.adj[ra].add(rb);self.adj[rb].add(ra)
  self.stand=set(range(n*n))-self.block
  self.beside={k:{a for a in self.stand if any(self.room[a]==self.room[b] and abs(a//n-b//n)+abs(a%n-b%n)==1 for b in cells)} for k,cells in self.obj.items()}
  self.cards=d['clues'];self.general=d.get('general_clues',[]);self.cache={}
 def ev(self,cl,x):
  t=cl['type'];n=self.n
  def p(k):return x[self.names.index(cl[k])]
  if t in ('on_object','only_on_object','beside_object','not_beside_object'):
   cells=self.beside[cl['object']] if 'beside' in t else self.obj[cl['object']];z=p('who') in cells
   if t=='only_on_object':z=z and sum(v in cells for v in x)==1
   return not z if t=='not_beside_object' else z
  if t=='above':return p('a')//n<p('b')//n and (cl.get('same_column')==False or p('a')%n==p('b')%n)
  if t in ('same_room','not_with','different_room'):return (self.room[p('a')]==self.room[p('b')])==(t=='same_room')
  if t=='in_col':return p('who')%n==cl['c']-1
  if t=='in_row':return p('who')//n==cl['r']-1
  if t=='n_on_object':return sum(v in self.obj[cl['object']] for v in x)==cl['n']
  raise ValueError(cl)
 def solve(self,removed=(),nogeneral=False,negative=None):
  key=(tuple(sorted(removed)),nogeneral,negative)
  if key in self.cache:return self.cache[key]
  cls=[c for i,c in enumerate(self.cards) if i not in removed and i!=negative]+([] if nogeneral else list(self.general));n=self.n
  # Negative card stays as an enforced false predicate, never ignored.
  negative_card=self.cards[negative] if negative is not None else None
  dom=[set(self.stand) for _ in self.names];binary=[];globals=[]
  for c in cls:
   t=c['type']
   if t in ('on_object','only_on_object','beside_object','not_beside_object','in_col','in_row'):
    i=self.names.index(c['who']);s=self.stand
    if t in ('on_object','only_on_object'):s=self.obj[c['object']]
    elif t=='beside_object':s=self.beside[c['object']]
    elif t=='not_beside_object':s=self.stand-self.beside[c['object']]
    elif t=='in_col':s={v for v in self.stand if v%n==c['c']-1}
    elif t=='in_row':s={v for v in self.stand if v//n==c['r']-1}
    dom[i]&=s
    if t=='only_on_object':
     for j in range(n):
      if j!=i:dom[j]-=self.obj[c['object']]
   elif t=='n_on_object':globals.append(c)
   else:binary.append((self.names.index(c['a']),self.names.index(c['b']),c))
  order=sorted(range(n),key=lambda i:len(dom[i]));x=[-1]*n;out=[]
  def rec(k,rs,cs):
   if k==n:
    if all(self.ev(c,x) for c in globals) and (negative_card is None or not self.ev(negative_card,x)):out.append(tuple(x))
    return
   i=order[k]
   for a in sorted(dom[i]):
    r,c=divmod(a,n)
    if rs>>r&1 or cs>>c&1:continue
    x[i]=a
    if all(x[j]<0 or x[h]<0 or self.ev(cl,x) for j,h,cl in binary):rec(k+1,rs|1<<r,cs|1<<c)
    x[i]=-1
  rec(0,0,0);self.cache[key]=out;return out
 def people(self,x,h):
  vr=self.room[x[self.vi]];tr=self.room[x[h]]
  if tr not in self.adj[vr]:return False
  counts={r:sum(self.room[a]==r for i,a in enumerate(x) if i!=h) for r in self.adj[vr]}
  return all(counts[tr]>v for r,v in counts.items() if r!=tr)
 def audit(self,removed=(),nogeneral=False,relaxed=False):
  s0=self.solve(removed,nogeneral);announce=self.d.get('meta',{}).get('announce','unknown');final=set();branches=[]
  for h,name in enumerate(self.names):
   if h==self.vi:continue
   p0=sorted({x[h] for x in s0});truth_raw=[x for x in s0 if self.people(x,h)]
   truth_final=truth_raw if announce!='one' and len(p0)>1 and len({x[h] for x in truth_raw})==1 else []
   # All card predicates are retained. This identity hypothesis enforces exactly its owner's card FALSE.
   sf=self.solve(removed,nogeneral,negative=h) if h not in removed else []
   pf=sorted({x[h] for x in sf});lie_raw=[x for x in sf if self.people(x,h)]
   lie_final=lie_raw if announce!='none' and len(pf)==1 else []
   for x in truth_final+lie_final:final.add((name,x))
   branches.append({'person':name,'truth':{'before_boards':len(s0),'before_positions':p0,'people_boards':len(truth_raw),'after_positions':sorted({x[h] for x in truth_raw}),'final':len(truth_final)},'lie':{'before_boards':len(sf),'before_positions':pf,'people_boards':len(lie_raw),'after_positions':sorted({x[h] for x in lie_raw}),'final':len(lie_final)},'final':len(truth_final)+len(lie_final)})
  return {'alltrue':len(s0),'alltrue_boards':s0,'branches':branches,'solutions':[{'thief':h,'positions':dict(zip(self.names,x))} for h,x in sorted(final)],'count':len(final)}
 def hints(self):
  res=[]
  for c in self.cards:
   t=c['type'];s=set();rule='不做位置提示'
   if t in ('on_object','only_on_object'):s=self.obj[c['object']]&self.stand;rule='该家具自己的格子'
   elif t in ('beside_object','not_beside_object'):s=self.beside[c['object']];rule='该家具四邻、同区域、可站人的格'
   elif t=='in_col':s={v for v in self.stand if v%self.n==c['c']-1};rule=f"第 {c['c']} 列的可站格"
   res.append({'rule':rule,'cells':[f'{v//self.n+1}:{v%self.n+1}' for v in sorted(s)],'count':len(s)})
  return res

old=SimpleNamespace(Puzzle=Puzzle)
def key(c):return json.dumps(c,sort_keys=True,ensure_ascii=False)
def text(c):
 t=c['type'];p=c.get('who','')
 if t in ('on_object','only_on_object','beside_object','not_beside_object'):return ('只有' if t=='only_on_object' else '')+p+('不在' if t=='not_beside_object' else '在')+c['object']+('旁边' if 'beside' in t else '上')
 if t in ('above','left_of'):return c['a']+'在'+c['b']+('上方' if t=='above' else '左方')
 if t in ('same_room','not_with'):return c['a']+'与'+c['b']+('在' if t=='same_room' else '不在')+'同一房间'
 if t=='in_col':return p+'在第'+str(c['c'])+'列'
 if t=='in_row':return p+'在第'+str(c['r'])+'行'
 if t=='n_on_object':return c['object']+'上有'+str(c['n'])+'人'
 raise ValueError(c)
class Engine:
 def __init__(self,d):
  self.d=copy.deepcopy(d);self.p=old.Puzzle(d);p=self.p;self.n=n=p.n;self.names=p.names;self.room=np.array([p.room[i] for i in range(n*n)]);self.cells=sorted(p.stand)
  perms=np.array(list(itertools.permutations(range(n))),dtype=np.int16)
  grids=np.arange(n)*n+perms;grids=grids[np.isin(grids,self.cells).all(axis=1)]
  self.x=np.concatenate([g[perms] for g in grids]).astype(np.int8);self.M=len(self.x);self.all=(1<<self.M)-1;self.cache={};self.people=[]
  rr=self.room[self.x];adj=np.zeros((len(p.adj),len(p.adj)),dtype=bool)
  for r,ns in p.adj.items():
   for s in ns:adj[r,s]=True
  for h in range(n-1):
   counts=np.stack([((rr==r)&(np.arange(n)!=h)).sum(axis=1) for r in p.adj],axis=1);vr=rr[:,p.vi];tr=rr[:,h];z=adj[vr,tr].copy()
   for r in p.adj:z &= (~adj[vr,r])|(tr==r)|(counts[np.arange(self.M),tr]>counts[:,r])
   self.people.append(self.pack(z))
  self.G=self.all
  for c in d.get('general_clues',[]):self.G&=self.mask(c)
  self.base=[self.mask(c) for c in d['clues']]
  print('universe',d['id'],self.M,flush=True)
 def pack(self,z):return int.from_bytes(np.packbits(z,bitorder='little').tobytes(),'little')
 def ids(self,b):
  if b.bit_count()<2000:
   out=[]
   while b:
    a=b&-b;out.append(a.bit_length()-1);b^=a
   return np.array(out,dtype=np.int64)
  z=np.unpackbits(np.frombuffer(b.to_bytes((self.M+7)//8,'little'),dtype=np.uint8),bitorder='little')[:self.M];return np.flatnonzero(z)
 def boards(self,b):return self.x[self.ids(b)]
 def pos(self,b,h):return np.unique(self.boards(b)[:,h]).tolist() if b else []
 def mask(self,c):
  k=key(c)
  if k in self.cache:return self.cache[k]
  t=c['type'];x=self.x;n=self.n
  def col(s):return x[:,self.names.index(c[s])]
  if t in ('on_object','only_on_object','beside_object','not_beside_object'):
   cells=self.p.beside[c['object']] if 'beside' in t else self.p.obj[c['object']];z=np.isin(col('who'),list(cells))
   if t=='only_on_object':z &= np.isin(x,list(cells)).sum(axis=1)==1
   if t=='not_beside_object':z=~z
  elif t in ('above','left_of'):z=(col('a')//n<col('b')//n) if t=='above' else (col('a')%n<col('b')%n)
  elif t in ('same_room','not_with'):z=(self.room[col('a')]==self.room[col('b')])==(t=='same_room')
  elif t=='in_col':z=col('who')%n==c['c']-1
  elif t=='in_row':z=col('who')//n==c['r']-1
  elif t=='n_on_object':z=np.isin(x,list(self.p.obj[c['object']])).sum(axis=1)==c['n']
  else:raise ValueError(c)
  self.cache[k]=self.pack(z);return self.cache[k]
 def audit(self,cards,details=False):
  bs=[self.mask(c) for c in cards];s=self.G
  for b in bs:s&=b
  prefix=[self.G]
  for b in bs:prefix.append(prefix[-1]&b)
  suffix=[self.all]*(self.n+1)
  for i in range(self.n-1,-1,-1):suffix[i]=suffix[i+1]&bs[i]
  result=[];br=[]
  for h in range(self.n-1):
   sf=prefix[h]&suffix[h+1]&(self.all^bs[h]);p0=self.pos(s,h);pf=self.pos(sf,h);ft=s&self.people[h];fl=sf&self.people[h]
   tf=ft if len(p0)>1 and len(self.pos(ft,h))==1 else 0;lf=fl if len(pf)==1 else 0
   if tf|lf:
    for ix in self.ids(tf|lf):result.append((h,int(ix)))
   if details:br.append({'person':self.names[h],'truth_before':s.bit_count(),'truth_positions':p0,'truth_after_people':ft.bit_count(),'truth_final':tf.bit_count(),'lie_before':sf.bit_count(),'lie_positions':pf,'lie_after_people':fl.bit_count(),'lie_final':lf.bit_count()})
  return (result,br,s) if details else result
 def pool(self):
  cs=list(self.d['clues']);ns=self.names
  for who in ns:
   for obj in self.p.obj:
    for t in ('on_object','only_on_object') if self.d['objects'][obj]['occupiable'] else () :cs.append({'type':t,'who':who,'object':obj})
    cs.append({'type':'beside_object','who':who,'object':obj})
   for b in ns:
    if who==b:continue
    cs.append({'type':'above','a':who,'b':b,'same_column':False})
    cs.append({'type':'left_of','a':who,'b':b,'same_row':False})
    if ns.index(who)<ns.index(b):
     cs.extend({'type':t,'a':who,'b':b} for t in ('same_room','not_with'))
  cs=list({key(c):c for c in cs}.values());return cs
 def metrics(self,cards,full=False):
  result,br,s=self.audit(cards,True)
  if len(result)!=1:return None
  h,idx=result[0];islie=not bool(self.mask(cards[h])&(1<<idx));tables=[self.mask(c) if not (islie and i==h) else self.all^self.mask(c) for i,c in enumerate(cards)];f=self.G
  for b in tables:f&=b
  conflict=None;witness=[]
  if not s:
   for k in range(1,self.n+1):
    for sub in itertools.combinations(range(self.n),k):
     b=self.G
     for j in sub:b &= self.mask(cards[j])
     if not b:witness.append([j+1 for j in sub])
    if witness:conflict=k;break
  # Minimal number of other active card predicates needed to entail each card.
  deps=[]
  if full:
   for i in range(self.n):
    found=None
    for k in range(self.n):
     for sub in itertools.combinations([j for j in range(self.n) if j!=i],k):
      b=self.G
      for j in sub:b&=tables[j]
      if b and not (b&(self.all^tables[i])):found={'size':k,'cards':[j+1 for j in sub],'premise_boards':b.bit_count()};break
     if found:break
    deps.append(found)
  prop=propagate(self,cards,h if islie else None)
  return {'joint_solutions':1,'thief':self.names[h],'is_lie':islie,'all_true_boards':s.bit_count(),'before_people_boards':f.bit_count(),'before_people_positions':self.pos(f,h),'conflict_min':conflict,'conflict_witnesses':witness,'propagation':prop,'branches':br if full else [],'card_implications':deps,'solution':dict(zip(self.names,map(int,self.x[idx])))}

def propagate(e,cards,negative=None,initial=None,hall=False):
 n=e.n;ds=[set(e.cells) for _ in range(n)] if initial is None else [set(s) for s in initial];logs=[]
 # Synchronous rounds: pairwise row/column exclusion, relational arc consistency,
 # furniture and count constraints. No hidden solution or preset identity used by a constraint.
 def apply(c,truth,ds,new):
  t=c['type'];ix=lambda s:e.names.index(c[s])
  if t in ('above','left_of','same_room','not_with'):
   a,b=ix('a'),ix('b')
   def rel(u,v):
    if t=='above':return u//n<v//n
    if t=='left_of':return u%n<v%n
    return (e.room[u]==e.room[v])==(t=='same_room')
   new[a]&={u for u in ds[a] if any(rel(u,v)==truth for v in ds[b])};new[b]&={v for v in ds[b] if any(rel(u,v)==truth for u in ds[a])}
  elif t in ('on_object','beside_object','not_beside_object','in_col','in_row'):
   a=ix('who')
   if t in ('in_col','in_row'):ss={v for v in e.cells if (v%n==c['c']-1 if t=='in_col' else v//n==c['r']-1)}
   else:
    ss=set(e.p.beside[c['object']] if 'beside' in t else e.p.obj[c['object']])
    if t=='not_beside_object':ss=set(e.cells)-ss
   new[a]&=ss if truth else set(e.cells)-ss
  elif t=='only_on_object':
   a=ix('who');ss=e.p.obj[c['object']]
   if truth:
    for i in range(n):new[i]&=ss if i==a else set(e.cells)-ss
   else:
    for i in range(n):
     good=set()
     for v in ds[i]:
      test=[s if j!=i else {v} for j,s in enumerate(ds)]
      # Negation: designated person off furniture OR at least one other person on it.
      if test[a]-ss or any(test[j]&ss for j in range(n) if j!=a):good.add(v)
     new[i]&=good
  elif t=='n_on_object':
   ss=e.p.obj[c['object']];target=c['n']
   for i in range(n):
    good=set()
    for v in ds[i]:
     low=int(v in ss)+sum(bool(ds[j]) and ds[j]<=ss for j in range(n) if j!=i);high=int(v in ss)+sum(bool(ds[j]&ss) for j in range(n) if j!=i)
     if (low<=target<=high) if truth else not(low==high==target):good.add(v)
    new[i]&=good
  else:raise ValueError(c)
 for roundno in range(1,100):
  new=[set(s) for s in ds]
  for i in range(n):
   for j in range(i):
    new[i]&={u for u in ds[i] if any(u//n!=v//n and u%n!=v%n for v in ds[j])};new[j]&={v for v in ds[j] if any(u//n!=v//n and u%n!=v%n for u in ds[i])}
  if hall:
   for axis in ('row','col'):
    proj=[{v//n if axis=='row' else v%n for v in s} for s in ds]
    for k in range(2,n):
     for sub in itertools.combinations(range(n),k):
      union=set().union(*(proj[j] for j in sub))
      if len(union)<k:
       new[sub[0]]=set();continue
      if len(union)==k:
       for j in range(n):
        if j not in sub:new[j]={v for v in new[j] if (v//n if axis=='row' else v%n) not in union}
  for i,c in enumerate(cards):apply(c,i!=negative,ds,new)
  for c in e.d.get('general_clues',[]):apply(c,True,ds,new)
  changes={e.names[i]:{'before':sorted(ds[i]),'after':sorted(new[i])} for i in range(n) if new[i]!=ds[i]}
  if not changes:break
  logs.append({'round':roundno,'changes':changes});ds=new
  if any(not s for s in ds):break
 return {'rounds':len(logs),'remaining_sizes':[len(s) for s in ds],'remaining_total':sum(map(len,ds)),'fixed':sum(len(s)==1 for s in ds),'contradiction':any(not s for s in ds),'domains':[sorted(s) for s in ds],'trace':logs}

def scalar(e,c,x):
 if c['type']=='left_of':return x[e.names.index(c['a'])]%e.n<x[e.names.index(c['b'])]%e.n
 return e.p.ev(c,x)
def domain_boards(e,ds):
 order=sorted(range(e.n),key=lambda i:len(ds[i]));x=[-1]*e.n;out=[]
 def go(k,rs,cs):
  if k==e.n:out.append(tuple(x));return
  i=order[k]
  for v in ds[i]:
   r,c=divmod(v,e.n)
   if r in rs or c in cs:continue
   x[i]=v;go(k+1,rs|{r},cs|{c})
 go(0,set(),set());return out

def depth(e,cards,negative=None,ds=None,budget=1):
 pr=propagate(e,cards,negative,ds,hall=True);ds=[set(a) for a in pr['domains']]
 if pr['contradiction']:return {'depth':0,'status':'contradiction'}
 boards=domain_boards(e,ds)
 if not boards:return {'depth':0,'status':'row_column_contradiction'}
 def ok(x):return all(scalar(e,c,x)==(i!=negative) for i,c in enumerate(cards)) and all(scalar(e,c,x) for c in e.d.get('general_clues',[]))
 if all(ok(x) for x in boards):return {'depth':0,'status':'settled','boards':len(boards),'domains':pr['domains']}
 if budget==0:return {'depth':None,'status':'stalled','boards_before_combination':len(boards)}
 best=None
 for i in sorted(range(e.n),key=lambda i:len(ds[i])):
  if len(ds[i])<2:continue
  children=[];failed=False
  for v in sorted(ds[i]):
   dd=[set(a) for a in ds];dd[i]={v};r=depth(e,cards,negative,dd,budget-1);children.append({'cell':int(v),'result':r})
   if r['depth'] is None:failed=True;break
  if not failed:
   score=len(children)
   if best is None or score<best['width']:best={'depth':1+max(c['result']['depth'] for c in children),'person':e.names[i],'width':score,'children':children,'status':'split'}
 return best or {'depth':None,'status':'exceeds_budget','budget':budget}

def independent(d):
 n=d['size']['rows'];names=[p['id'] for p in d['suspects']];N=n*n
 cell=lambda p:(p['r']-1)*n+p['c']-1
 walls=set()
 for axis,r,c in d['walls']:
  a=(r-1)*n+c-1;b=a+(n if axis=='h' else 1);walls.add(frozenset((a,b)))
 parents=list(range(N))
 def root(a):
  while parents[a]!=a:a=parents[a]
  return a
 for a in range(N):
  for b in (a+1,a+n):
   if b>=N or abs(a//n-b//n)+abs(a%n-b%n)!=1 or frozenset((a,b)) in walls:continue
   parents[root(b)]=root(a)
 room=[root(a) for a in range(N)];adj={r:set() for r in set(room)}
 for axis,r,c in d['doors']:
  a=(r-1)*n+c-1;b=a+(n if axis=='h' else 1);assert room[a]!=room[b];adj[room[a]].add(room[b]);adj[room[b]].add(room[a])
 obj={k:{cell(p) for p in v['cells']} for k,v in d['objects'].items()};blocked={cell(p) for p in list(d.get('blocked',[]))+list(d.get('water',[]))}
 for k,v in d['objects'].items():
  if not v['occupiable']:blocked|=obj[k]
 stand=set(range(N))-blocked
 beside={k:{a for a in stand if any(room[a]==room[b] and abs(a//n-b//n)+abs(a%n-b%n)==1 for b in ss)} for k,ss in obj.items()}
 def refs(c):
  if c['type'] in ('n_on_object','only_on_object'):return set(range(n))
  return {names.index(c[k]) for k in ('who','a','b') if k in c}
 def ev(c,x):
  t=c['type'];p=lambda k:x[names.index(c[k])]
  if t in ('on_object','only_on_object','beside_object','not_beside_object'):
   ss=beside[c['object']] if 'beside' in t else obj[c['object']];z=p('who') in ss
   if t=='only_on_object':z=z and sum(v in ss for v in x)==1
   return not z if t=='not_beside_object' else z
  if t=='above':return p('a')//n<p('b')//n and (c.get('same_column') is False or p('a')%n==p('b')%n)
  if t=='left_of':return p('a')%n<p('b')%n and (c.get('same_row') is False or p('a')//n==p('b')//n)
  if t in ('same_room','not_with'):return (room[p('a')]==room[p('b')])==(t=='same_room')
  if t=='in_col':return p('who')%n==c['c']-1
  if t=='in_row':return p('who')//n==c['r']-1
  if t=='n_on_object':return sum(v in obj[c['object']] for v in x)==c['n']
  raise ValueError(c)
 def solve(negative):
  cs=[(c,i!=negative,refs(c)) for i,c in enumerate(d['clues'])]+[(c,True,refs(c)) for c in d.get('general_clues',[])]
  dom=[set(stand) for _ in names];dummy=[0]*n
  for c,truth,who in cs:
   if len(who)==1:
    j=next(iter(who));keep=set()
    for a in dom[j]:
     dummy[j]=a
     if ev(c,dummy)==truth:keep.add(a)
    dom[j]=keep
   elif c['type']=='only_on_object' and truth:
    j=names.index(c['who']);ss=obj[c['object']]
    for k in range(n):dom[k]&=ss if j==k else stand-ss
  order=sorted(range(n),key=lambda i:len(dom[i]));x=[-1]*n;out=set()
  def rec(k,rows,cols,assigned):
   if k==n:out.add(tuple(x));return
   j=order[k]
   for a in dom[j]:
    r,c=divmod(a,n)
    if r in rows or c in cols:continue
    x[j]=a;now=assigned|{j}
    if all(ev(cl,x)==truth for cl,truth,who in cs if who<=now):rec(k+1,rows|{r},cols|{c},now)
    x[j]=-1
  rec(0,set(),set(),set());return out
 vi=names.index(d['victim']['id'])
 def people(x,h):
  vr=room[x[vi]];tr=room[x[h]]
  if tr not in adj[vr]:return False
  counts={r:sum(i!=h and room[a]==r for i,a in enumerate(x)) for r in adj[vr]}
  return all(counts[tr]>v for r,v in counts.items() if r!=tr)
 s0=solve(None);branches=[];joint=set();sets={None:s0}
 for h in range(n-1):
  sf=solve(h);sets[h]=sf;p0={x[h] for x in s0};pf={x[h] for x in sf};ft={x for x in s0 if people(x,h)};fl={x for x in sf if people(x,h)}
  a=ft if len(p0)>1 and len({x[h] for x in ft})==1 else set();b=fl if len(pf)==1 else set()
  joint|={(names[h],x) for x in a|b};branches.append({'person':names[h],'truth_before':len(s0),'truth_positions':sorted(p0),'truth_after_people':len(ft),'truth_final':len(a),'lie_before':len(sf),'lie_positions':sorted(pf),'lie_after_people':len(fl),'lie_final':len(b)})
 return sets,branches,joint,people


def main():
 data=json.loads((Path(__file__).resolve().parent/'34567_候选关卡设计.json').read_text(encoding='utf8'))
 wanted=set(map(int,sys.argv[1:])) if len(sys.argv)>1 else set(range(3,8))
 for label in ('baseline','candidates'):
  for d in data[label]:
   lv=int(d['id'][-3:])
   if lv not in wanted:continue
   e=Engine(d);m=e.metrics(d['clues'],True);assert m and m['joint_solutions']==1
   sets,br,joint,people=independent(d);assert br==m['branches']
   for neg,boards in sets.items():
    bits=e.G
    for i,c in enumerate(d['clues']):bits &= (e.all^e.mask(c)) if i==neg else e.mask(c)
    assert set(map(tuple,e.boards(bits).tolist()))==boards
   expected={(m['thief'],tuple(m['solution'][name] for name in e.names))};assert joint==expected
   target=tuple(e.p.cell(d['solution'][name]) for name in e.names);assert next(iter(joint))[1]==target
   neg=e.names.index(m['thief']) if m['is_lie'] else None
   print(json.dumps({'version':label,'level':lv,'independent_sets_equal':True,'metrics':m,'hall':propagate(e,d['clues'],neg,hall=True),'depth':depth(e,d['clues'],neg,budget=2)},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
