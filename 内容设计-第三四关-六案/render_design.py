from build_design import *
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle,Circle
plt.rcParams['font.sans-serif']=['Microsoft YaHei','SimHei','DejaVu Sans']
plt.rcParams['axes.unicode_minus']=False
D=main()
colors=['#e1edf4','#e7ead9','#f4e4d4','#e9e0f0']
report=[]
for z in D:
 level,k=z['level'],z['k'];p=z['p'];room=z['room'];doors=z['doors'];free=CELLS-set(z['blocks'])-{z['desk']}
 raw=solve(domains(free,z['clues']))
 if level==3:
  opts=[len({s[i] for s in raw}) for i in range(6)]
  assert opts[:5]==[1,1,1,2,1]
  assert [s for s in raw if room_ok(room,doors,s)]==[p]
 else:
  assert solve(domains(free,[c for card in z['cards'] for c in card]))==[]
  assert z['hyp']==[0,0,0,1,0,0]
 for card in z['cards']:
  ds=domains(free,card)
  assert all(len(s)>1 for s in ds)
 fig=plt.figure(figsize=(19,14),facecolor='#f7f4ed')
 fig.text(.045,.95,f'第{level}关 · 方案{chr(65+k)}  /  '+(['折廊藏踪','双翼会客室','错层展厅'][k]),fontsize=25,weight='bold',color='#263744')
 fig.text(.045,.917,'纯内容设计 · 6×6 / 六人 · '+('全部真话 / 双候选后空间收口' if level==3 else '唯一假话 / 家具证词交叉排除')+' · 无同伙规则',fontsize=13)
 ax=fig.add_axes([.055,.39,.43,.49]);ax.set_xlim(-.45,6.05);ax.set_ylim(6.4,-.5);ax.set_aspect('equal');ax.axis('off')
 for x in range(36):
  r,c=xy(x);ax.add_patch(Rectangle((c,r),1,1,facecolor=colors[room[x]],edgecolor='#b4b5af',lw=.7))
 for i in range(6):ax.text(i+.5,-.23,str(i+1),ha='center',fontsize=12);ax.text(-.23,i+.5,str(i+1),va='center',fontsize=12)
 furn={z['desk']:'桌'};furn.update({x:('植' if j%2==0 else '架') for j,x in enumerate(z['blocks'])})
 for name,cells in z['groups'].items():
  for x in cells:furn[x]=name
 fc={'红毯':'#d7a2a0','蓝毯':'#9ebbd6','圆毯':'#dbbd8d','木椅':'#bdad97','软椅':'#a7beae'}
 for x,name in furn.items():
  r,c=xy(x)
  if name in fc:ax.add_patch(Rectangle((c+.12,r+.12),.76,.76,facecolor=fc[name],edgecolor='#7c817c',lw=1));ax.text(c+.5,r+.83,name,ha='center',fontsize=9)
  else:ax.add_patch(Rectangle((c+.12,r+.12),.76,.76,facecolor='#68746c'));ax.text(c+.5,r+.5,name,ha='center',va='center',fontsize=17,color='white')
 for x in range(36):
  r,c=xy(x)
  for y in [x+1,x+6]:
   if y>=36 or (y==x+1 and y//6!=r) or room[x]==room[y]:continue
   if y==x+1:xx=[c+1,c+1];yy=[r,r+1]
   else:xx=[c,c+1];yy=[r+1,r+1]
   ax.plot(xx,yy,color='#35434b',lw=4,solid_capstyle='butt')
 for x,y in doors:
  r,c=xy(x)
  if y-x==1:xx=[c+1,c+1];yy=[r+.28,r+.72]
  else:xx=[c+.28,c+.72];yy=[r+1,r+1]
  ax.plot(xx,yy,color='#df8d35',lw=7,solid_capstyle='butt')
 ax.add_patch(Rectangle((0,0),6,6,fill=False,edgecolor='#35434b',lw=3))
 for i,x in enumerate(p):
  r,c=xy(x);col='#b45c3c' if i==3 else '#397b9e' if i==5 else '#344751'
  ax.add_patch(Circle((c+.5,r+.43),.25,facecolor=col,edgecolor='white',lw=2));ax.text(c+.5,r+.43,PEOPLE[i],ha='center',va='center',color='white',fontsize=17,weight='bold')
 ax.text(0,6.27,'实心字母＝答案站位  /  橙线＝门  /  粗线＝墙',fontsize=11)
 fig.text(.53,.865,'玩家口供卡（说话者 ≠ 口供对象）',fontsize=17,weight='bold')
 yy=.825
 for i,card in enumerate(z['cards']):
  text='；'.join(c['text'] for c in card)
  fig.text(.53,yy,f'{PEOPLE[i]}：{text}',fontsize=12,color='#ad4933' if level==4 and i==3 else '#273a44',wrap=True)
  yy-=.044
 fig.text(.53,.535,'站位答案',fontsize=16,weight='bold')
 fig.text(.53,.505,'  '.join(f'{PEOPLE[i]} {co(x)}' for i,x in enumerate(p[:3])),fontsize=12)
 fig.text(.53,.478,'  '.join(f'{PEOPLE[i+3]} {co(x)}' for i,x in enumerate(p[3:])),fontsize=12)
 rv=room[p[5]];rt=room[p[3]];nb=set()
 for a,b in doors:
  if room[a]==rv:nb.add(room[b])
  if room[b]==rv:nb.add(room[a])
 counts={r:sum(i!=3 and room[x]==r for i,x in enumerate(p)) for r in nb}
 fig.text(.53,.44,'盗窃者 D；受害者 V。门相邻房间无辜人数：',fontsize=12)
 fig.text(.53,.413,' / '.join(f'房间{r+1}：{n}人'+('（D 所在）' if r==rt else '') for r,n in sorted(counts.items())),fontsize=12)
 fig.text(.055,.35,'从答案反推：家具占位 → 线索交叉 → 唯一解',fontsize=18,weight='bold')
 steps=[f'不可站家具依次加入：'+ ' → '.join(f'{co(x)} / {n:,}解' for x,n in z['blockhist']),
 f'① 红毯限定 A，且排除其他人：{z["hist"][0]:,} 种摆位。',
 f'② B 在桌旁；桌旁另一格属于 A 的红毯 → B 固定，再用行列排除固定 A：{z["hist"][1]:,} 解。',
 f'③ C 的木椅候选与已占行列交叉 → {z["hist"][2]} 解；④ E 的蓝毯候选继续排除 → {z["hist"][3]} 解。',
 f'⑤ D 的软椅线索 → {z["hist"][4]} 解；⑥ V 的圆毯线索 → {z["hist"][5]} 解（确认提示，可删）。']
 if level==3:
  q=z['q'];steps += [f'收口前：A/B/C/E 各 1 格；D 在 {co(p[3])}、{co(q[3])} 可选；V 随之换位。',f'用门相邻 + 无辜人数严格最多排除 D{co(q[3])} / V{co(q[5])} 分支，留下唯一站位；D 为盗窃者。']
 else:steps += [f'假话：D 说「{z["lie"]}」。其余口供推出真实家具落点，与这句冲突。','全真 0 解；分别摘掉 A/B/C/D/E/V：0 / 0 / 0 / 1 / 0 / 0 解。','剔除 D 假话后 D 仅 1 个位置；唯一说谎者为 D，且满足门相邻与无辜人数最多。']
 for j,text in enumerate(steps):fig.text(.055,.315-j*.031,text,fontsize=11.5)
 fig.text(.055,.035,'设计口径：木椅/软椅、红毯/蓝毯/圆毯按图上外观分组；这是新增视觉区分，需落地时支持分类线索。\n空地、椅、毯可站；桌、植、架不可站。单张卡不能直接唯一定位。统计为完整摆位数，不是格数。',fontsize=10,color='#586976')
 path=OUT/f'第{level}关_方案{chr(65+k)}_设计图.png';fig.savefig(path,dpi=150,facecolor=fig.get_facecolor());plt.close(fig)
 report.append({'level':level,'variant':k,'file':str(path),'verified':True,'counts':z['hist'],'innocents':counts})
(TMP/'render_check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('已绘制并校验',len(report),'张图')
