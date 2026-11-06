import json,itertools,re,sys,pathlib
import numpy as np
source=pathlib.Path(sys.argv[1]); data=json.loads(source.read_text(encoding='utf-8'))
p=np.array(list(itertools.permutations(range(6))))
r=np.repeat(p,720,axis=0); c=np.tile(p,(720,1)); x=r*6+c
names='ABCDEV'; results=[]
for d in data:
 room=np.array(d['room']); rooms=room[x]; obj=d['objects']; blocked=obj['桌子']+obj['植物']
 assert len(room)==36 and set(room)==set(range(4))
 allobj=sum(obj.values(),[]); assert len(allobj)==len(set(allobj))
 for j in range(4):
  cells=set(np.flatnonzero(room==j).tolist()); seen={next(iter(cells))}; todo=list(seen)
  while todo:
   a=todo.pop()
   for b in cells-seen:
    if abs(a//6-b//6)+abs(a%6-b%6)==1:seen.add(b);todo.append(b)
  assert seen==cells
 adj=np.zeros((4,4),bool)
 for a,b in d['doors']:
  assert abs(a//6-b//6)+abs(a%6-b%6)==1 and room[a]!=room[b]
  adj[room[a],room[b]]=adj[room[b],room[a]]=True
 base=~np.isin(x,blocked).any(axis=1)
 def atom(s):
  m=re.fullmatch(r'([ABCDEV])在R([1-4])房间',s)
  if m:return rooms[:,names.index(m[1])]==int(m[2])-1
  m=re.fullmatch(r'([ABCDEV])比([ABCDEV])靠下(\d+)行',s)
  if m:return r[:,names.index(m[1])]-r[:,names.index(m[2])]==int(m[3])
  m=re.fullmatch(r'([ABCDEV])与([ABCDEV])在同一房间',s)
  if m:return rooms[:,names.index(m[1])]==rooms[:,names.index(m[2])]
  m=re.fullmatch(r'(只有)?([ABCDEV])(?:坐在|在)(植物|椅子|地毯)(旁边|上)',s)
  if not m:raise ValueError(s)
  only,person,ob,where=m.groups(); cells=obj[ob]
  if where=='旁边':cells=[a for a in range(36) if a not in blocked and any(room[a]==room[b] and abs(a//6-b//6)+abs(a%6-b%6)==1 for b in cells)]
  v=np.isin(x[:,names.index(person)],cells)
  if only:v &= np.isin(x,cells).sum(axis=1)==1
  return v
 masks=[np.logical_and.reduce([atom(s) for s in card]) for card in d['cards']]
 true=base & np.logical_and.reduce(masks)
 def coord(a):return [[int(v)//6+1,int(v)%6+1] for v in a]
 audits=[]; solutions=[]
 for h in range(5):
  counts=np.stack([((rooms==j)&(np.arange(6)!=h)).sum(axis=1) for j in range(4)],axis=1)
  region=adj[rooms[:,5],rooms[:,h]].copy()
  for j in range(4):region &= (~adj[rooms[:,5],j])|(rooms[:,h]==j)|(counts[np.arange(len(x)),rooms[:,h]]>counts[:,j])
  v=base & region
  for i,m in enumerate(masks):
   if i!=h:v &= m
  pos=np.unique(x[v,h]); n=len(pos)
  final=v & (masks[h] if n>1 else ~masks[h]) if n else np.zeros(len(x),bool)
  if d['k']==2:final &= np.logical_and.reduce(masks)
  ids=np.flatnonzero(final)
  solutions.extend([(int(i),h) for i in ids])
  audits.append(dict(person=names[h],candidate_layouts=int(v.sum()),positions=coord(pos),own_card_true=int((v&masks[h]).sum()),solutions=len(ids),candidate_boards=[coord(a) for a in x[v]] if v.sum()<15 else []))
 assert len(solutions)==1
 idx,h=solutions[0]; assert x[idx].tolist()==d['target'] and names[h]==d['thief']
 assert all(min(len(np.unique(x[base&m,i])) for i in range(6))>1 for m in masks)
 result=dict(level=3 if d['k']==2 else 4,base_count=int(base.sum()),all_true_boards=int(true.sum()),all_true_examples=[coord(a) for a in x[true]][:10],audit=audits,unique_boards=len(set(i for i,h in solutions)),unique_thieves=len(set(h for i,h in solutions)),answer=coord(x[idx]),thief=names[h],truth=[bool(m[idx]) for m in masks])
 results.append(result)
print(json.dumps(results,ensure_ascii=False,indent=2))
if len(sys.argv)>2:pathlib.Path(sys.argv[2]).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
