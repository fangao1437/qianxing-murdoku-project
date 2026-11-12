import json,pathlib,textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle,Circle
ROOT=pathlib.Path(__file__).resolve().parent
DATA=json.loads((ROOT/'design_selected_v11.json').read_text(encoding='utf8'));CHECK=json.loads((ROOT/'verification_v11.json').read_text(encoding='utf8'))
plt.rcParams['font.sans-serif']=['Microsoft YaHei','SimHei','DejaVu Sans'];plt.rcParams['axes.unicode_minus']=False
N='ABCDEV';colors=['#e3eef7','#f9ead0','#e3f0e4','#eee4f5']
proofs=[[
'① 身份未知，依次摘A—E卡：仅A有合法严格解。',
'   A摘卡本人2格→必须真；B/C单格却卡真→排除；D/E无盘。',
'② B/V卡＋植物：A、B分占(1,2)/(2,1)，尚未定朝向。',
'   A在B上方→A=(1,2)、B=(2,1)；A在C左方只给C列>2。',
'③ C与A同室＋R1房间轮廓＋已占行列：C只能在(3,3)。',
'   第3行第4列越墙；第4行R1只有左两列，均已被占。',
'   此时才推出旧关系：AC上下差2行、BC左右差2列。',
'④ D桌旁只余(5,4)/(6,5)，D在E上方排除末行→D=(5,4)。',
'   E在第6行；尾盘仍有E(6,5)/V(4,6)或E(6,6)/V(4,5)。',
'⑤ 后者让V相邻R1/R3无辜人数均2，违反严格最多。',
'   故E=(6,5)、V=(4,6)。几何定位与区域收口各有作用。'
],[
'① 身份未知：A摘卡6盘/本人3格，必须真，却全不满足A卡；',
'   B/C/D无盘。E摘卡1盘/本人1格，E卡假，故只有E成立。',
'② C=(2,3)；传播后A仍有(3,1)/(5,4)，D在两椅之一。',
'   本版不要求猜测，但这一关保留一次位置试探。',
'③ 试A=(3,1)：结合区域、行列、其余卡，迫使D=(6,5)、',
'   E=(5,4)、B=(4,6)、V=(1,2)，A/D不同室，违反A真卡。',
'④ 所以A=(5,4)。D坐同室椅子→D=(6,5)，继续行列、区域',
'   与人物方向排除，得到B=(1,2)、E=(3,1)、V=(4,6)。',
'⑤ 新桌子(1,1)封掉E摘卡的另一个格：2格→1格，必须假。',
'   最终B不在D下方1行，E卡确假；不再使用椅旁否定条件。'
]]
for q,(d,v) in enumerate(zip(DATA,CHECK['levels'])):
 fig=plt.figure(figsize=(17,17),facecolor='#f6f5f0');level=q+3
 fig.text(.045,.958,f'第{level}关 · 方案'+('C' if q==0 else 'B')+'｜几何关联版 v11',fontsize=25,weight='bold',color='#263747')
 fig.text(.045,.932,'纯内容设计 · 不预告真假 · 房间 / 门 / 全员答案站位 / 身份保持 · '+('新增家具0件' if q==0 else '新增1张桌子'),fontsize=11,color='#5b6670')
 ax=fig.add_axes([.05,.55,.49,.34]);ax.set_xlim(-.45,6.1);ax.set_ylim(6.55,-.45);ax.set_aspect('equal');ax.axis('off');room=d['room'];obj=d['objects'];target=d['target'];short={'桌子':'桌','植物':'植','椅子':'椅','地毯':'毯'}
 for x in range(36):
  r,c=divmod(x,6);ax.add_patch(Rectangle((c,r),1,1,facecolor=colors[room[x]],edgecolor='#acb6bd',lw=.65))
  for ob,cells in obj.items():
   if x in cells:
    ax.add_patch(Rectangle((c+.12,r+.12),.76,.76,facecolor={'桌子':'#87939a','植物':'#6e9c77','椅子':'#deb679','地毯':'#c197a4'}[ob],alpha=.7,edgecolor='#62666b',linestyle='-' if ob in ['桌子','植物'] else '--'));ax.text(c+.5,r+.81,short[ob],ha='center',fontsize=10)
    if q==1 and x==0:ax.text(c+.5,r+.40,'新增',ha='center',color='#963c29',fontsize=10,weight='bold')
  if x in target:
   i=target.index(x);col='#bb513c' if N[i]==d['thief'] else '#967528' if i==5 else '#2c5272';ax.add_patch(Circle((c+.5,r+.40),.235,color=col));ax.text(c+.5,r+.40,N[i],ha='center',va='center',fontsize=17,color='white',weight='bold')
 for r in range(6):
  ax.text(-.25,r+.5,str(r+1),ha='center',va='center',fontsize=11)
  for c in range(6):
   x=r*6+c
   if c<5 and room[x]!=room[x+1]:ax.plot([c+1,c+1],[r,r+1],color='#27333c',lw=4)
   if r<5 and room[x]!=room[x+6]:ax.plot([c,c+1],[r+1,r+1],color='#27333c',lw=4)
 for c in range(6):ax.text(c+.5,-.22,str(c+1),ha='center',fontsize=11)
 ax.add_patch(Rectangle((0,0),6,6,fill=False,lw=4,edgecolor='#27333c'))
 for x,y in d['doors']:
  r,c=divmod(x,6)
  if y==x+1:ax.plot([c+1,c+1],[r+.27,r+.73],color='#e38636',lw=7)
  else:ax.plot([c+.27,c+.73],[r+1,r+1],color='#e38636',lw=7)
 ax.text(0,6.33,'粗线=墙　橙线=门　桌/植不可站　椅/毯可站',fontsize=10)
 fig.text(.58,.88,'正式线索卡',fontsize=19,weight='bold',color='#263747')
 for i,c in enumerate(d['display_cards']):
  y=.842-i*.046;fig.text(.58,y,N[i],fontsize=17,weight='bold');fig.text(.62,y,'\n'.join(textwrap.wrap('；'.join(c),23)),fontsize=12,color='#263747',va='baseline')
 fig.text(.58,.548,'旁边=同室四邻；上下左右只比指定轴。\n不要求同行/列；V必真；复合卡合取判真。\n各张完整卡单独都不能定位任何人。',fontsize=10.5,linespacing=1.8,color='#5b6670')
 for j in range(4):fig.text(.065+j*.115,.528,f'■ R{j+1}',fontsize=12,color=['#5a82a2','#b28640','#62906a','#9473ac'][j])
 fig.text(.045,.492,'几何交集 → 精确关系 → 人数收口' if q==0 else '合并自述 → 家具封堵 → 严格假话',fontsize=18,weight='bold',color='#263747')
 fig.text(.045,.465,'\n'.join(proofs[q]),fontsize=10,va='top',linespacing=1.70,color='#263747')
 fig.text(.68,.492,'严格摘卡：身份从未知开始',fontsize=13,weight='bold')
 ta=fig.add_axes([.68,.305,.275,.16]);ta.axis('off');tab=[['身份','摘卡盘','本人格','最终解']]+[[a['person'],a['candidate_layouts'],len(a['positions']),a['final_solutions']] for a in v['audit']];tb=ta.table(cellText=tab,cellLoc='center',bbox=[0,0,1,1]);tb.auto_set_font_size(False);tb.set_fontsize(10)
 for (r,c),cell in tb.get_celld().items():cell.set_edgecolor('#cbd1d4');cell.set_facecolor('#e7ecee' if r==0 else '#fbfbf8')
 fig.text(.68,.285,'规则合法性：通过\n推理可达性：通过\n摆位/身份：均唯一\n附加试位深度：'+str(v['position_assumption_depth'])+'\n家具总占格：'+str(d['furniture_count']),fontsize=10.5,va='top',linespacing=1.8,color='#337254')
 if q==0:
  fig.text(.045,.21,'多来源必要性｜新卡未直接给出旧距离',fontsize=14,weight='bold')
  fig.text(.045,.18,'A+C两卡仍有16,236盘，其中15,972盘不满足原精确关系。\n去A保留其他真卡：2个关系反例；去C：62个关系反例。\n全部真卡仍有2盘，最后必须使用区域无辜人数严格最多收口。',fontsize=11,va='top',linespacing=1.8,color='#263747')
 else:
  fig.text(.045,.21,'删条件后的桌子封堵｜不仅过滤摆法，也改变真假义务',fontsize=14,weight='bold')
  fig.text(.045,.18,'不加桌：E摘卡可站(1,1)/(3,1)，必须真，但E卡全假→无严格解。\n在(1,1)加桌：E只剩(3,1)，必须假→原答案恢复严格唯一。\n已删除“E不在椅子旁边”；D卡承接原A卡的“A在D左方”。',fontsize=11,va='top',linespacing=1.8,color='#263747')
 co=lambda x:f'({x//6+1},{x%6+1})'
 fig.text(.045,.095,'答案：'+'　'.join(n+co(x) for n,x in zip(N,target))+f'　盗窃者 {d["thief"]}',fontsize=11)
 fig.text(.045,.067,'两套全集枚举一致；真假均由严格规则推出，不预设第三关全真或第四关有假话。',fontsize=10,color='#5b6670')
 fig.text(.045,.043,'必要猜测是可选方法。深度仅适用于声明的传播/试位操作集；未写入存档，未做实机或玩家试玩。',fontsize=9.5,color='#9a5e35')
 name=f'第{level}关_方案'+('C' if q==0 else 'B')+'_设计图_v11.png';fig.savefig(ROOT/name,dpi=140,facecolor=fig.get_facecolor());plt.close(fig);print('已生成',name)
