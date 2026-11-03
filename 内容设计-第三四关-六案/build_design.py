from pathlib import Path
import itertools,json,math
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'设计图'; OUT.mkdir(exist_ok=True)
TMP=ROOT/'_tmp'; TMP.mkdir(exist_ok=True)
N=6; CELLS=set(range(36)); PEOPLE='ABCDEV'
def xy(x):return divmod(x,6)
def co(x):r,c=xy(x);return f'({r+1},{c+1})'
def adj(x):
 r,c=xy(x);return {rr*6+cc for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)] if 0<=rr<6 and 0<=cc<6}
def solve(dom):
 out=[];p=[-1]*6; order=sorted(range(6),key=lambda i:len(dom[i]))
 def walk(k,rs,cs):
  if k==6:out.append(tuple(p));return
  i=order[k]
  for x in sorted(dom[i]):
   r,c=xy(x)
   if r in rs or c in cs:continue
   p[i]=x;walk(k+1,rs|{r},cs|{c})
 walk(0,set(),set());return out
def domains(free,clues):
 ds=[set(free) for _ in range(6)]
 for cl in clues:
  for i,s in cl['dom'].items():ds[i]&=set(s)
 return ds
def cl(text,dom):return {'text':text,'dom':dom}
def room_ok(room,doors,p,t=3):
 rv=room[p[5]]; rt=room[p[t]]; nb=set()
 for a,b in doors:
  if room[a]==rv:nb.add(room[b])
  if room[b]==rv:nb.add(room[a])
 if rt not in nb:return False
 counts={r:sum(i!=t and room[x]==r for i,x in enumerate(p)) for r in nb}
 return all(counts[rt]>n for r,n in counts.items() if r!=rt)
def build(level,k):
 # Fixed answer first. Each variant has an independent permutation, not a rotated board.
 targets=[(12,7,33,2,29,22),(7,12,29,33,22,2),(22,27,6,17,1,32)]
 p=targets[k];a,b,c,d,e,v=p
 assert len({x//6 for x in p})==len({x%6 for x in p})==6
 anchors=sorted(adj(a)&adj(b));assert anchors
 # Select a desk linking A and B, then protect every answer cell.
 desk=next(x for x in anchors if x not in p)
 blocks=adj(desk)-{a,b};blocks.discard(desk)
 assert not blocks&set(p)
 occupied=set(p)|blocks|{desk}
 groups={}
 def pick(pool):
  z=next((x for x in sorted(pool) if x not in occupied),None)
  if z is None:raise ValueError('no decoy')
  occupied.add(z);return z
 # All decoys are deliberately chosen to be removed by a previously established row/column.
 ra=pick({x for x in CELLS if x//6==b//6})
 cc=pick({x for x in CELLS if (x//6==a//6 if k!=1 else x%6==a%6)})
 ee=pick({x for x in CELLS if (x%6==c%6 if k==2 else x//6==c//6)})
 if level==3:
  dd=(v//6)*6+d%6;vv=(d//6)*6+v%6
  if dd in occupied or vv in occupied:raise ValueError('reserved alternate collision')
  occupied|={dd,vv}
 else:
  dd=pick({x for x in CELLS if x//6==e//6})
  vv=pick({x for x in CELLS if x%6==d%6})
 groups={'红毯':[a,ra],'木椅':[c,cc],'蓝毯':[e,ee],'软椅':[d,dd],'圆毯':[v,vv]}
 free=CELLS-blocks-{desk}
 clues=[cl('只有 A 站在红毯上',{**{i:free-set(groups['红毯']) for i in range(6) if i!=0},0:set(groups['红毯'])}),cl('B 在桌子旁边',{1:adj(desk)&free}),cl('C 站在木椅上',{2:set(groups['木椅'])}),cl('E 站在蓝毯上',{4:set(groups['蓝毯'])}),cl('D 坐在软椅上',{3:set(groups['软椅'])}),cl('V 站在圆毯上',{5:set(groups['圆毯'])})]
 raw=solve(domains(free,clues));q=list(p);q[3]=dd;q[5]=vv;q=tuple(q)
 assert set(raw)==({p,q} if level==3 else {p}),(level,k,raw,p,q)
 # Connected room shapes are selected deterministically from axis-aligned cuts.
 # A/B must share a room with the table: preserve the intended furniture interaction.
 templates=[]
 for cutr in range(1,6):
  for cutc in range(1,6):
   for mode in range(3):
    room=[]
    for x in range(36):
     r,col=xy(x)
     if mode==0:z=0 if col<cutc and r<cutr else (1 if col>=cutc else 2)
     elif mode==1:z=0 if r<cutr else (1 if col<cutc else 2)
     else:z=(r>=cutr)*2+(col>=cutc)
     room.append(int(z))
    if not(room[a]==room[b]==room[desk]):continue
    edges={}
    for x in range(36):
     for y in sorted(adj(x)):
      if y>x and room[x]!=room[y]:edges.setdefault(tuple(sorted((room[x],room[y]))),[]).append((x,y))
    pairs=list(edges)
    for mask in range(1,1<<len(pairs)):
     doors=[edges[pairs[j]][len(edges[pairs[j]])//2] for j in range(len(pairs)) if mask>>j&1]
     if not room_ok(room,doors,p):continue
     if level==3 and room_ok(room,doors,q):continue
     # Prefer at least two directly connected rooms at victim, so innocent comparison is substantive.
     rv=room[v];neigh={room[y] if room[x]==rv else room[x] for x,y in doors if rv in (room[x],room[y])}
     score=10*len(neigh)+len(set(room))+(cutr+cutc+k)%3
     templates.append((score,room,doors))
 if not templates:raise ValueError('no room topology')
 _,room,doors=max(templates,key=lambda z:z[0])
 # B's desk neighbours were reserved in its own room. Door elsewhere does not affect these clues.
 assert room[a]==room[b]==room[desk]
 hist=[]
 for n in range(1,7):hist.append(len(solve(domains(free,clues[:n]))))
 blockhist=[]
 # Counting before clues analytically: each unlabeled row/column permutation admits 6! labelings.
 bb=set()
 for x in [desk]+sorted(blocks):
  bb.add(x)
  count=sum(all(r*6+cols[r] not in bb for r in range(6)) for cols in itertools.permutations(range(6)))*math.factorial(6)
  blockhist.append((x,count))
 cards=[];hyp=[];lie=None
 if level==4:
  # Five truthful cards cover six conditions. Find a non-tautological false furniture statement.
  # Test all six removal hypotheses exhaustively; no room rule is needed to recognise the lie.
  partitions=[[[0],[1,2],[3],[4],[5]],[[0],[1],[2,3],[4],[5]],[[0],[1],[2],[3,4],[5]]]
  for partition in partitions:
   truthcards=[[clues[i] for i in inds] for inds in partition]
   candidates=[]
   for i in range(6):
    for name,locs in groups.items():
     if p[i] not in locs:candidates.append(cl(f'{PEOPLE[i]} 站在{name}上', {i:set(locs)}))
   found=False
   for lie0 in candidates:
    card0=list(truthcards);card0.insert(3,[lie0])
    vals=[]
    for drop in range(6):
     ss=solve(domains(free,[z for j,card in enumerate(card0) if j!=drop for z in card]))
     vals.append(ss)
    if vals[3]!=[p] or any(vals[j] for j in range(6) if j!=3):continue
    # False statement alone must allow legal complete boards: reject inherently impossible lies.
    assert len(lie0['dom'][next(iter(lie0['dom']))])>=2
    cards=card0;hyp=[len(x) for x in vals];lie=lie0['text'];found=True;break
   if found:break
  if not cards:raise ValueError('no valid lie')
 else:
  cards=[[clues[i]] for i in [1,4,0,2,3,5]]
 return dict(level=level,k=k,p=p,q=q if level==3 else None,desk=desk,blocks=sorted(blocks),groups=groups,room=room,doors=doors,clues=clues,cards=cards,hist=hist,blockhist=blockhist,hyp=hyp,lie=lie,raw=len(raw))

def main():
 designs=[]
 for level in (3,4):
  for k in range(3):
   z=build(level,k);designs.append(z)
   print('OK',level,k+1,'答案',z['p'],'收敛',z['hist'],'摘卡',z['hyp'],flush=True)
 (TMP/'designs.json').write_text(json.dumps(designs,ensure_ascii=False,default=lambda o:sorted(o),indent=2),encoding='utf-8')
 return designs
if __name__=='__main__':main()
