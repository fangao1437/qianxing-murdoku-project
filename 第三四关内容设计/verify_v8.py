import numpy as np,itertools,re,json,pathlib,time
N='ABCDEV'
class Model:
 def __init__(self,d):
  self.d=d;self.n=len(d['target']);self.names=N if self.n==6 else 'ABCDV';n=self.n
  p=np.array(list(itertools.permutations(range(n))),dtype=np.int16);r=np.repeat(p,len(p),axis=0);c=np.tile(p,(len(p),1));x=r*n+c
  blocked=sum([d['objects'].get(k,[]) for k in ['桌子','植物','书架','雕塑']],[])
  base=~np.isin(x,blocked).any(1);self.x=x[base];self.r=r[base];self.c=c[base];self.room=np.array(d['room']);self.rooms=self.room[self.x];self.blocked=blocked;self.M=len(self.x)
  self.t=int(np.flatnonzero((self.x==d['target']).all(1))[0]);self.cache={};self.bits={};self.reg=[];self.rb=[];self.dom=[sum(1<<int(v) for v in np.unique(self.x[:,i])) for i in range(n)]
  adj=np.zeros((max(d['room'])+1,)*2,bool)
  for a,b in d['doors']:adj[self.room[a],self.room[b]]=adj[self.room[b],self.room[a]]=True
  for h in range(n-1):
   counts=np.stack([((self.rooms==j)&(np.arange(n)!=h)).sum(1) for j in range(len(adj))],1)
   mask=adj[self.rooms[:,-1],self.rooms[:,h]].copy()
   for j in range(len(adj)):mask &= (~adj[self.rooms[:,-1],j])|(self.rooms[:,h]==j)|(counts[np.arange(self.M),self.rooms[:,h]]>counts[:,j])
   self.reg.append(mask);self.rb.append(self.pack(mask))
  self.all=(1<<self.M)-1;self.cellbits=[[self.pack(self.x[:,i]==v) for v in range(n*n)] for i in range(n)]
 def pack(self,m):return int.from_bytes(np.packbits(m,bitorder='little').tobytes(),'little')
 def mask(self,s):
  if s in self.bits:return self.bits[s]
  n=self.n;na=self.names;X=self.x;R=self.r;C=self.c;Q=self.rooms
  def ix(a):return na.index(a)
  m=re.fullmatch(r'([ABCDEV])在R([1-4])房间',s)
  if m:z=Q[:,ix(m[1])]==int(m[2])-1
  else:
   m=re.fullmatch(r'([ABCDEV])与([ABCDEV])(不在|在)同一房间',s)
   if m:z=(Q[:,ix(m[1])]==Q[:,ix(m[2])])==(m[3]=='在')
   else:
    m=re.fullmatch(r'([ABCDEV])比([ABCDEV])靠(上|下|左|右)(\d+)(行|列)',s)
    if m:z=((R if m[5]=='行' else C)[:,ix(m[1])]-(R if m[5]=='行' else C)[:,ix(m[2])])==int(m[4])*(-1 if m[3] in ['上','左'] else 1)
    else:
     m=re.fullmatch(r'([ABCDEV])在([ABCDEV])(上|下|左|右)方',s)
     if m:z=((R if m[3] in ['上','下'] else C)[:,ix(m[1])]-(R if m[3] in ['上','下'] else C)[:,ix(m[2])])*(-1 if m[3] in ['上','左'] else 1)>0
     else:
      m=re.fullmatch(r'([ABCDEV])在第(\d+)(行|列)',s)
      if m:z=(R if m[3]=='行' else C)[:,ix(m[1])]==int(m[2])-1
      else:
       m=re.fullmatch(r'([ABCDEV])独自在房间',s)
       if m:z=(Q==Q[:,ix(m[1]),None]).sum(1)==1
       else:
        m=re.fullmatch(r'(只有)?([ABCDEV])(不在|在|坐在)(植物|椅子|地毯|桌子|书架)(旁边|上)',s)
        if m:
         only,person,neg,ob,where=m.groups();cells=self.d['objects'].get(ob,[])
         if where=='旁边':cells=[a for a in range(n*n) if a not in self.blocked and any(self.room[a]==self.room[b] and abs(a//n-b//n)+abs(a%n-b%n)==1 for b in cells)]
         z=np.isin(X[:,ix(person)],cells)
         if only:z &= np.isin(X,cells).sum(1)==1
         if neg=='不在':z=~z
        else:
         m=re.fullmatch(r'(椅子|地毯)上有(\d+)人',s)
         if not m:raise ValueError(s)
         z=np.isin(X,self.d['objects'][m[1]]).sum(1)==int(m[2])
  b=self.pack(z);self.bits[s]=b;return b
 def card(self,ss):
  z=self.all
  for s in ss:z &= self.mask(s)
  return z
 def positions(self,b,i):return [v for v,cb in enumerate(self.cellbits[i]) if b&cb]
 def audit(self,cards,details=False):
  bs=[self.card(c) for c in cards];out=[];sol=[];alltrue=self.all
  for b in bs:alltrue &= b
  relaxed=[]
  for h in range(self.n-1):
   b=self.rb[h]
   for i,z in enumerate(bs):
    if i!=h:b &= z
   ps=self.positions(b,h);cnt=len(ps);f=b&(bs[h] if cnt>1 else self.all^bs[h]) if cnt else 0
   relaxed.append((b&(self.all^bs[h])).bit_count())
   item=dict(person=self.names[h],boards=b.bit_count(),positions=ps,truth_required=cnt>1 if cnt else None,solutions=f.bit_count(),own_true=(b&bs[h]).bit_count())
   if details:item['candidates']=b
   out.append(item)
   if f:sol.append((h,f))
  return dict(audit=out,alltrue=alltrue.bit_count(),solutions=sum(f.bit_count() for _,f in sol),correct=len(sol)==1 and sol[0][0]==self.names.index(self.d['thief']) and sol[0][1]==1<<self.t,relaxed=relaxed,bs=bs)
 def gac(self,tables,domains=None):
  ds=self.dom.copy() if domains is None else domains.copy()
  while True:
   old=ds.copy();limit=self.all
   for i,di in enumerate(ds):
    b=0
    while di:v=(di&-di).bit_length()-1;di &= di-1;b |= self.cellbits[i][v]
    limit &= b
   if not limit:return None
   for tb in tables:
    b=tb&limit
    if not b:return None
    for i in range(self.n):
     dnew=0;di=ds[i]
     while di:
      v=(di&-di).bit_length()-1;di &= di-1
      if b&self.cellbits[i][v]:dnew |= 1<<v
     if not dnew:return None
     ds[i]=dnew
   if ds==old:return ds
 def depth(self,tables,domains=None,maxdepth=2,memo=None):
  if memo is None:memo={}
  ds=self.gac(tables,domains)
  if ds is None:return dict(depth=0,status='contradiction')
  if all(v.bit_count()==1 for v in ds):return dict(depth=0,status='solved',domains=ds)
  key=(tuple(ds),maxdepth)
  if key in memo:return memo[key]
  if maxdepth==0:return dict(depth=99,status='stalled',domains=ds)
  best=dict(depth=99,status='stalled',domains=ds)
  for i in sorted(range(self.n),key=lambda i:ds[i].bit_count()):
   if ds[i].bit_count()<2:continue
   children=[];worst=0
   for v in range(self.n*self.n):
    if not (ds[i]>>v)&1:continue
    nd=ds.copy();nd[i]=1<<v;ch=self.depth(tables,nd,maxdepth-1,memo);children.append(dict(cell=v,result=ch));worst=max(worst,ch['depth'])
    if worst+1>=best['depth']:break
   if worst+1<best['depth']:best=dict(depth=worst+1,status='branch',person=self.names[i],children=children,domains=ds)
   if best['depth']==1:break
  memo[key]=best;return best
 def proof(self,cards,maxdepth=2):
  a=self.audit(cards);bs=a['bs'];proof=[]
  for h,au in enumerate(a['audit']):
   tables=[self.rb[h]]+[b for i,b in enumerate(bs) if i!=h]
   if au['boards']:tables += [bs[h] if len(au['positions'])>1 else self.all^bs[h]]
   proof.append(self.depth(tables,maxdepth=maxdepth))
  return proof
 def pool(self):
  ss=[];na=self.names
  for a in na:
   for j in range(1,5):ss.append(f'{a}在R{j}房间')
   for ob in ['植物','桌子','椅子','地毯']:
    for suf in ['旁边']+(['上'] if ob in ['椅子','地毯'] else []):
     ss += [f'{a}在{ob}{suf}',f'{a}不在{ob}{suf}']
     if suf=='上':ss.append(f'只有{a}在{ob}{suf}')
   for b in na:
    if a>=b:continue
    ss += [f'{a}与{b}在同一房间',f'{a}与{b}不在同一房间']
    for dr,unit in [('上','行'),('下','行'),('左','列'),('右','列')]:
     ss.append(f'{a}在{b}{dr}方')
     for v in [1,2]:ss.append(f'{a}比{b}靠{dr}{v}{unit}')
  out=[];seen=set()
  for s in ss:
   b=self.mask(s)
   if not b or b==self.all or b in seen:continue
   seen.add(b);out.append(s)
  return out
ROOT=pathlib.Path(r'D:\新建文件夹\miHoYo Launcher\第三四关_六案内容设计')

BASELINE_DATA=[{'level': 1, 'data': {'room': [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1], 'doors': [[7, 8], [11, 16], [13, 18]], 'objects': {'桌子': [0, 5], '植物': [1, 20, 22], '椅子': [16, 23], '地毯': [10, 11, 8, 9]}, 'target': [10, 6, 23, 2, 19], 'thief': 'D', 'cards': [['只有A在地毯上'], ['B在植物旁边'], ['C在椅子上'], ['D不在桌子旁边'], ['V在第5列']]}, 'audit': {'audit': [{'person': 'A', 'boards': 1, 'positions': [10], 'truth_required': False, 'solutions': 0, 'own_true': 1}, {'person': 'B', 'boards': 1, 'positions': [6], 'truth_required': False, 'solutions': 0, 'own_true': 1}, {'person': 'C', 'boards': 5, 'positions': [2, 6], 'truth_required': True, 'solutions': 0, 'own_true': 0}, {'person': 'D', 'boards': 2, 'positions': [2, 6], 'truth_required': True, 'solutions': 1, 'own_true': 1}], 'alltrue': 4, 'solutions': 1, 'correct': True, 'relaxed': [0, 0, 5, 1]}, 'proof': [{'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'solved', 'domains': [1024, 64, 8388608, 4, 524288]}]}, {'level': 2, 'data': {'room': [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 3, 3], 'doors': [[9, 10], [12, 18], [20, 21]], 'objects': {'桌子': [1, 2, 34], '椅子': [0, 9], '地毯': [3, 14, 15, 24, 30], '雕塑': [5], '书架': [31], '植物': [13, 27, 33]}, 'target': [25, 0, 22, 9, 32, 17], 'thief': 'D', 'cards': [['A在书架旁边'], ['B在桌子旁边', '椅子上有2人'], ['C在V下方', 'C与V不在同一房间'], ['D在地毯上'], ['只有E在植物旁边'], ['V独自在房间']]}, 'audit': {'audit': [{'person': 'A', 'boards': 0, 'positions': [], 'truth_required': None, 'solutions': 0, 'own_true': 0}, {'person': 'B', 'boards': 0, 'positions': [], 'truth_required': None, 'solutions': 0, 'own_true': 0}, {'person': 'C', 'boards': 0, 'positions': [], 'truth_required': None, 'solutions': 0, 'own_true': 0}, {'person': 'D', 'boards': 1, 'positions': [9], 'truth_required': False, 'solutions': 1, 'own_true': 0}, {'person': 'E', 'boards': 0, 'positions': [], 'truth_required': None, 'solutions': 0, 'own_true': 0}], 'alltrue': 0, 'solutions': 1, 'correct': True, 'relaxed': [0, 0, 0, 1, 0]}, 'proof': [{'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'contradiction'}, {'depth': 0, 'status': 'solved', 'domains': [33554432, 1, 4194304, 512, 4294967296, 131072]}, {'depth': 0, 'status': 'contradiction'}]}]
OLD_DATA=[{'k': 2, 'room': [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 1, 1, 0, 0, 2, 2, 1, 1, 3, 3, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2], 'doors': [[9, 10], [14, 20], [19, 25], [22, 28], [27, 33]], 'objects': {'桌子': [33, 21], '植物': [0], '椅子': [6, 9], '地毯': [14, 19]}, 'target': [1, 6, 14, 27, 34, 23], 'thief': 'A', 'cards': [['A在植物旁边'], ['D在R3房间'], ['只有C在地毯上'], ['B在植物旁边'], ['B在椅子上', 'E在R4房间'], ['V在R2房间']], 'original_furniture_count': 5, 'furniture_count': 7, 'display_cards': [['我在植物旁边'], ['D在R3房间'], ['只有我在地毯上'], ['B在植物旁边'], ['B在椅子上', '我在R4房间'], ['我在R2房间']], 'added_furniture': [], 'assignment_note': {'self_cards': 4, 'valid_assignments': 104, 'new_furniture': 0}}, {'k': 4, 'room': [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2], 'doors': [[8, 9], [19, 20], [19, 25], [16, 22], [31, 32]], 'objects': {'桌子': [], '植物': [29], '椅子': [1, 34], '地毯': [8, 31]}, 'target': [27, 1, 8, 34, 12, 23], 'thief': 'E', 'cards': [['A与D在同一房间'], ['B在椅子上'], ['只有C在地毯上'], ['E比C靠下1行'], ['E坐在椅子上'], ['D在椅子上', 'V在植物旁边']], 'original_furniture_count': 5, 'furniture_count': 5, 'display_cards': [['我与D在同一房间'], ['我在椅子上'], ['只有我在地毯上'], ['E比C靠下1行'], ['我坐在椅子上'], ['D在椅子上', '我在植物旁边']], 'added_furniture': []}]
def independent(d):
 n=len(d['target']);names='ABCDEV';p=np.array(list(itertools.permutations(range(n))),dtype=np.int16);R=np.repeat(p,len(p),0);C=np.tile(p,(len(p),1));X=n*R+C;room=np.array(d['room']);Q=room[X];objects=d['objects'];blocked=objects['桌子']+objects['植物'];base=~np.isin(X,blocked).any(1)
 assert len(set(sum(objects.values(),[])))==len(sum(objects.values(),[]))
 assert all(v not in blocked for v in d['target'])
 for j in range(4):
  cells=set(np.flatnonzero(room==j));seen={next(iter(cells))}
  while True:
   more={v for v in cells if any(abs(int(v)//6-int(w)//6)+abs(int(v)%6-int(w)%6)==1 for w in seen)}
   if more<=seen:break
   seen |= more
  assert seen==cells
 adjacency=[set() for _ in range(4)]
 for u,v in d['doors']:
  assert abs(u//6-v//6)+abs(u%6-v%6)==1 and room[u]!=room[v]
  adjacency[room[u]].add(int(room[v]));adjacency[room[v]].add(int(room[u]))
 def evaluate(s):
  def idx(a):return names.index(a)
  m=re.fullmatch(r'([ABCDEV])在(植物|桌子|椅子|地毯)(旁边|上)',s)
  if m:
   a,ob,w=m.groups();cells=objects[ob]
   if w=='旁边':cells=[u for u in range(36) if u not in blocked and any(room[u]==room[v] and abs(u//6-v//6)+abs(u%6-v%6)==1 for v in cells)]
   return np.isin(X[:,idx(a)],cells)
  m=re.fullmatch(r'([ABCDEV])不在(植物|桌子|椅子|地毯)旁边',s)
  if m:return ~evaluate(m[1]+'在'+m[2]+'旁边')
  m=re.fullmatch(r'只有([ABCDEV])在地毯上',s)
  if m:return np.isin(X[:,idx(m[1])],objects['地毯']) & (np.isin(X,objects['地毯']).sum(1)==1)
  m=re.fullmatch(r'([ABCDEV])比([ABCDEV])靠(上|下|左|右)(\d+)(行|列)',s)
  if m:
   arr=R if m[5]=='行' else C;delta=arr[:,idx(m[1])]-arr[:,idx(m[2])];return delta==int(m[4])*(-1 if m[3] in ['上','左'] else 1)
  m=re.fullmatch(r'([ABCDEV])在([ABCDEV])(上|下|左|右)方',s)
  if m:
   arr=R if m[3] in ['上','下'] else C;delta=arr[:,idx(m[1])]-arr[:,idx(m[2])];return delta<0 if m[3] in ['上','左'] else delta>0
  m=re.fullmatch(r'([ABCDEV])与([ABCDEV])在同一房间',s)
  if m:return Q[:,idx(m[1])]==Q[:,idx(m[2])]
  raise ValueError(s)
 masks=[np.logical_and.reduce([evaluate(s) for s in card]) for card in d['cards']]
 audits=[];solutions=[]
 for h in range(5):
  # independent region implementation: uniquely maximal among the victim's neighbor rooms
  counts=np.stack([(Q==j).sum(1)-(Q[:,h]==j) for j in range(4)],1)
  region=np.zeros(len(X),bool)
  for vr in range(4):
   neighbors=adjacency[vr]
   for tr in neighbors:
    a=(Q[:,5]==vr)&(Q[:,h]==tr)
    for other in neighbors-{tr}:a &= counts[:,tr]>counts[:,other]
    region |= a
  remaining=base&region
  for i,mask in enumerate(masks):
   if i!=h:remaining &= mask
  pos=np.unique(X[remaining,h]);f=remaining & (masks[h] if len(pos)>1 else ~masks[h]) if len(pos) else np.zeros(len(X),bool)
  for j in np.flatnonzero(f):solutions.append((h,X[j].tolist()))
  audits.append(dict(person=names[h],candidate_layouts=int(remaining.sum()),positions=[int(v) for v in pos],own_true=int((remaining&masks[h]).sum()),final_solutions=int(f.sum()),candidate_boards=X[remaining].tolist() if remaining.sum()<30 else []))
 assert solutions==[(names.index(d['thief']),d['target'])],solutions
 single=[[len(np.unique(X[base&mask,i])) for i in range(6)] for mask in masks];assert min(sum(single,[]))>1
 ti=int(np.flatnonzero((X==d['target']).all(1))[0])
 return dict(generated_boards=len(X),base_count=int(base.sum()),all_true_boards=int((base&np.logical_and.reduce(masks)).sum()),audit=audits,unique_boards=1,unique_thieves=1,thief=d['thief'],target=d['target'],truth=[bool(m[ti]) for m in masks],single_card_domains=single)
def compact_domains(ds,n=6):return [[[v//n+1,v%n+1] for v in range(n*n) if mask>>v&1] for mask in ds]
def traced_gac(model,tables,labels,domains):
 ds=domains.copy();trace=[]
 for iteration in range(100):
  prev=ds.copy();limit=model.all
  for i,di in enumerate(ds):
   b=0
   for v in range(model.n**2):
    if di>>v&1:b |= model.cellbits[i][v]
   limit &= b
  if not limit:return dict(status='contradiction',reason='每行每列恰好一人与当前候选冲突',trace=trace)
  for label,tb in zip(labels,tables):
   b=tb&limit
   if not b:return dict(status='contradiction',reason=label,trace=trace)
   for i in range(model.n):
    nd=sum(1<<v for v in range(model.n**2) if (ds[i]>>v&1) and (b&model.cellbits[i][v]))
    if not nd:return dict(status='contradiction',reason=label+'使'+model.names[i]+'无位置',trace=trace)
    if nd!=ds[i]:trace.append(dict(rule=label,person=model.names[i],before=compact_domains([ds[i]],model.n)[0],after=compact_domains([nd],model.n)[0]));ds[i]=nd
  if ds==prev:return dict(status='solved' if all(v.bit_count()==1 for v in ds) else 'stalled',domains=compact_domains(ds,model.n),trace=trace)
 raise RuntimeError('propagation did not converge')
if __name__=='__main__':
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('data');ap.add_argument('output');args=ap.parse_args();src=pathlib.Path(args.data);DATA=json.loads(src.read_text(encoding='utf8'));BASELINE=BASELINE_DATA
 output=dict(method='每卡独立广义弧一致传播；全局行列排他与区域规则各自作为一张约束表；身份分支及严格余位判定另列；位置试探按最坏分支最大嵌套深度计数',limitations='绝对人类最短推理不具备可计算的统一定义；本证书只在声明的传播与试位操作集中成立。不能把枚举中候选多直接算成假设次数。',tutorials=[],levels=[])
 for bd in BASELINE:
  d=bd['data'];m=Model(d)
  if len(d['target'])==6:
   gen=m.mask('地毯上有0人');m.all &= gen;m.rb=[b&gen for b in m.rb]
  a=m.audit(d['cards']);pr=m.proof(d['cards'],maxdepth=1);assert a['correct'] and all(p['depth']==0 for p in pr);a.pop('bs');output['tutorials'].append(dict(level=bd['level'],data=d,verification=a,proof=pr,additional_position_depth=0))
 for q,d in enumerate(DATA):
  iv=independent(d);m=Model(d);a=m.audit(d['cards']);assert a['correct'];h=N.index(d['thief']);proofs=m.proof(d['cards'],maxdepth=1);bs=a['bs'];tables=[m.rb[h]]+[z if i!=h or q==0 else m.all^z for i,z in enumerate(bs)];labels=['门相邻＋无辜人数唯一最多']+[('卡'+N[i]+'真：' if i!=h or q==0 else '卡'+N[i]+'假：')+'；'.join(c) for i,c in enumerate(d['cards'])]
  ds=m.gac(tables);assert ds is not None and any(z.bit_count()>1 for z in ds);p=m.depth(tables,maxdepth=1);assert p['depth']==1
  traces=[];person=N.index(p['person'])
  for child in p['children']:
   nd=ds.copy();nd[person]=1<<child['cell'];tr=traced_gac(m,tables,labels,nd);traces.append(dict(person=N[person],cell=[child['cell']//6+1,child['cell']%6+1],**tr))
  assert sum(t['status']=='solved' for t in traces)==1
  old=OLD_DATA[q]
  for key in ['room','doors','target','thief','objects']:assert d[key]==old[key],key
  assert len(d['cards'][5])==1
  iv.update(level=q+3,position_assumption_depth=1,identity_branch_proofs=proofs,correct_identity_proof=p,stalled_domains=compact_domains(ds),branch_traces=traces,unchanged=['房间','门','家具','答案站位','盗窃者身份'],new_furniture=0)
  output['levels'].append(iv)
  print('VERIFIED',q+3,'alltrue',iv['all_true_boards'],'audit',[(v['person'],v['candidate_layouts'],len(v['positions']),v['final_solutions']) for v in iv['audit']],'depth',1,'wrong-branch',[(t['cell'],t['reason'] if 'reason' in t else t['status']) for t in traces],flush=True)
 pathlib.Path(args.output).write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf8');print('两种枚举实现一致；教程深度0，新两关深度1；所有不变项、单卡与真假推导检查通过')
