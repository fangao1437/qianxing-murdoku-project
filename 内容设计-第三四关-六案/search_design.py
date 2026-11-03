from design import *
import time

def run(level,k):
 rng=random.Random(80329+level*89+k)
 for trial in range(400000):
  b=layout(rng,(T3 if level==3 else T4)[k]); col=rng.randrange(6)
  chosen=[(5,'col',col),(3,'beside','植'),(0,'only_on','毯'),(2,'on','椅'),(4,'beside','架'),(1,'beside','桌')]
  cs=[mk(b,*c) for c in chosen]
  raw=solve(b,cs,4)
  if level==3:
   if len(raw)<2 or len(raw)>4:continue
   fs=fullsols(b,cs)
   if len(fs)!=1:continue
   p,t=next(iter(fs))
   # at least 3 people have multiple furniture-derived initial domains
   ds=[set(cells)-blocked(b) for _ in range(6)]
   for c in cs:
    for j,s in c[1].items():ds[j]&=s
   if sum(len(d)>1 for d in ds)<4:continue
   res=dict(level=level,variant=k,b=b,p=p,t=t,chosen=chosen,texts=[c[0] for c in cs],raw=raw,trial=trial,false=None,domains=[sorted(d) for d in ds])
   return ser(res)
  else:
   if len(raw)!=1:continue
   p=raw[0]
   ts=[i for i in range(5) if spatial(b,p,i)]
   if not ts:continue
   # combine E and D furniture facts into one compound card, count lie on thief card
   truecs=[cs[0],cs[2],cs[5],cs[3],(cs[1][0]+'；'+cs[4][0],{**cs[1][1],**cs[4][1]},None)]
   actual=sum(x in b['obj']['椅'] for x in p)
   for count in [2,3,1]:
    if count==actual:continue
    lie=mk(b,0,'chairs',count)
    for t in ts:
     cards=list(truecs);cards.insert(t,lie)
     alltrue=solve(b,cards,1)
     if alltrue:continue
     variants={};bad=False
     for drop in range(5):
      rest=[c for i,c in enumerate(cards) if i!=drop]
      ss=solve(b,rest,2000)
      if len(ss)>=2000:bad=True;break
      ss=[q for q in ss if spatial(b,q,drop)]
      variants[drop]=ss
      if drop!=t and ss:bad=True;break
      if drop==t and ss!=[p]:bad=True;break
     if bad:continue
     # reject universal false claim: count must be achievable respecting rows/columns and objects
     chair=sorted(b['obj']['椅'])
     import itertools
     if not any(len({x//6 for x in cmb})==count and len({x%6 for x in cmb})==count for cmb in itertools.combinations(chair,count)):continue
     res=dict(level=level,variant=k,b=b,p=p,t=t,texts=[c[0] for c in cards],raw=[p],trial=trial,false=t,actual=actual,false_n=count,hypotheses={str(d):len(ss) for d,ss in variants.items()})
     return ser(res)
 raise RuntimeError('exhausted')
if __name__=='__main__':
 level=int(sys.argv[1]);out=[]
 for k in range(3):
  d=run(level,k);out.append(d)
  (TMP/f'level{level}.json').write_text(json.dumps(out,ensure_ascii=False,indent=1),encoding='utf8')
  print('完成',level,k+1,'尝试',d['trial'],'答案',d['p'],'身份',d['t'],'线索',d['texts'],flush=True)
