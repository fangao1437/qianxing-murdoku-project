import json,pathlib,textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle,Circle
ROOT=pathlib.Path(__file__).resolve().parent
DATA=json.loads((ROOT/'design_selected_v8.json').read_text(encoding='utf8'))
CHECK=json.loads((ROOT/'verification_v8.json').read_text(encoding='utf8'))
N='ABCDEV';colors=['#e3eef7','#f9ead0','#e3f0e4','#eee4f5']
plt.rcParams['font.sans-serif']=['Microsoft YaHei','SimHei','DejaVu Sans'];plt.rcParams['axes.unicode_minus']=False
proofs=[[
'① 不预告全真，先分别检查 A–E 的身份分支。',
'② B/C 分支各只有本人1个格，应说假话，但本人卡为真；排除。',
'   D/E 分支无合法候选。仅 A 身份成立，摘卡有5盘、本人2格。',
'③ A 有余位必须说真话；加入 A 卡后进行约束传播仍未收口。',
'   A/B 均留 (1,2)、(2,1)；C、D、E、V 也仍有多个候选。',
'④ 必要试位：若 A=(2,1)，B 的植物旁条件迫使 B=(1,2)。',
'   A比C靠上2行 → C在第4行；B比C靠左2列 → C在第4列。',
'   C只能在 (4,4)，但那里是不可站的桌子，矛盾。',
'⑤ 所以 A=(1,2)，B=(2,1)，两条关系合定 C=(3,3)。',
'   桌旁、D在E上方、行列排他与区域人数联动完成 D/E/V。'
],[
'① 全真不能成立；但不把有假话作为题面条件。',
'② 假定 A：摘卡有24盘、本人6格，因此A必须说真话。',
'   这24盘的A卡全假，严格规则矛盾，排除A。',
'   B/C/D 分支无候选；仅E剩1盘、本人1格，E必须说假话。',
'③ 给定E身份及真假条件后，传播仍留下 A=(3,1)/(5,4)。',
'   C已确定 (2,3)，D仍在两把椅子之间，B/E/V尚未定死。',
'④ 必要试位：若 A=(3,1)，A与D同室 → D只能坐 (1,2)。',
'   A在V下方且与D分占第1/3行 → V在第2行；C已占第2行，矛盾。',
'⑤ 所以 A=(5,4)，同室椅子条件定 D=(6,5)。',
'   C独占地毯、B在E右方及行列区域约束完成 B/E/V。'
]]
def co(v):return f'({v//6+1},{v%6+1})'
report=['# 第三、四关 v8：线索加难与可复现路径复核','',
'本版为纯内容设计，不更新游戏存档。房间、门、家具及全部人物答案站位与 v7/638 最终编号一致；新增家具0件。原有游戏规则不改。第三关盗窃者A、六卡全真；第四关盗窃者E、仅E卡假，均为求解结果，不是玩家前提。','',
'## 验证口径与重要边界','',
'规则合法性：每行每列恰好一人；桌/植物不可站；椅/毯可站；旁边为同区域四邻；盗窃者在受害者门相邻区域中无辜人数严格最多的唯一房间；无同伙。复合卡按合取判真。',
'严格规则：逐一假定盗窃者、摘其整张卡，以其余真卡及区域规则枚举其不同可选格；0格排除、1格必须假、多格必须真。没有使用预设答案/身份过滤来求解；求解结束才与冻结答案比较。',
'推理可达性：完整有限身份分支＋严格候选格统计＋约束传播＋一次位置试探可以得到答案。这里包括有限枚举，不冒充全部步骤都是轻量的手工直推。',
'难度方法：每张完整卡为独立约束表，区域门/人数为独立约束表，行列排他内置；反复删去在单个约束表中没有支持的候选格（广义弧一致传播）。停滞后任选一个人物分割其所有候选格，递归传播，按最坏分支的最大嵌套深度计数。遍历所有可选人物得到该操作集中的最小深度。',
'关键限制：身份和该身份的严格真假条件先给定，再测额外位置试探深度；身份判断的枚举成本另列，未混作位置假设。为避免夸大，**不能宣称已经证明“所有人类解法必然至少假设一次”**，因为合并多张线索或更强的整体计数可绕过某些试位。证明的是本报告明确操作集中的0→1提升。若目标是所有高级逻辑方法都不能直推，本轮尚未证明这一更强命题。','',
'## 实机教程基线','',
'读取当前成果目录中带665更新注记的 case_001.lua / case_002.lua，使用实际卡片条件，而非旧教程说明。第一关五卡均自述；第二关D卡为“我站在地毯上”，与通用“地毯上没有人”直接冲突。旧b/d/e推导不代表这次实机题面。',
'两关在同一约束传播口径下，所有身份分支的附加位置试探深度均为0；新两关正确身份分支为1。第一关即使不利用全真教学预告也唯一。教程数据、逐身份结果和传播证书一并固化在verification_v8.json，验证脚本可从零复现。','',
'| 关卡 | 常规传播后的附加试位深度 | 完整摆位 | 身份 |','|---|---:|---:|---|','| 实机教程1 | 0 | 1 | D |','| 实机教程2 | 0 | 1 | D |','| 新第三关 | 1 | 1 | A |','| 新第四关 | 1 | 1 | E |','']
for q,(d,v) in enumerate(zip(DATA,CHECK['levels'])):
 level=q+3;fig=plt.figure(figsize=(17,17),facecolor='#f6f5f0')
 fig.text(.045,.958,f'第{level}关 · 方案'+('C' if q==0 else 'B')+'｜线索加难版 v8',fontsize=26,weight='bold',color='#263747')
 fig.text(.045,.933,'纯内容设计 · 答案可见 · 不预告真假 · 房间 / 门 / 家具 / 全员站位保持',fontsize=12,color='#5b6670')
 ax=fig.add_axes([.05,.55,.49,.34]);ax.set_xlim(-.45,6.1);ax.set_ylim(6.55,-.45);ax.set_aspect('equal');ax.axis('off')
 room=d['room'];obj=d['objects'];target=d['target'];short={'桌子':'桌','植物':'植','椅子':'椅','地毯':'毯'}
 for x in range(36):
  r,c=divmod(x,6);ax.add_patch(Rectangle((c,r),1,1,facecolor=colors[room[x]],edgecolor='#acb6bd',lw=.65))
  for ob,cells in obj.items():
   if x in cells:
    ax.add_patch(Rectangle((c+.12,r+.12),.76,.76,facecolor={'桌子':'#87939a','植物':'#6e9c77','椅子':'#deb679','地毯':'#c197a4'}[ob],alpha=.7,edgecolor='#62666b',linestyle='-' if ob in ['桌子','植物'] else '--'));ax.text(c+.5,r+.81,short[ob],ha='center',fontsize=10)
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
  y=.842-i*.046;fig.text(.58,y,N[i],fontsize=17,weight='bold');fig.text(.62,y,'\n'.join(textwrap.wrap('；'.join(c),23)),fontsize=11.5,color='#263747',va='baseline')
 fig.text(.58,.548,'V必真；旁边=同室四邻。\n上下左右只比指定轴，不要求同行/列。\n每张完整卡单独都不能定位任何人。',fontsize=10.5,linespacing=1.8,color='#5b6670')
 for j in range(4):fig.text(.065+j*.115,.528,f'■ R{j+1}',fontsize=12,color=['#5a82a2','#b28640','#62906a','#9473ac'][j])
 fig.text(.045,.492,'身份前置推导 → 位置分支 → 反证收口',fontsize=19,weight='bold',color='#263747')
 fig.text(.045,.465,'\n'.join(proofs[q]),fontsize=10.6,va='top',linespacing=1.75,color='#263747')
 fig.text(.66,.492,'严格摘卡：从身份未知开始',fontsize=14,weight='bold')
 ta=fig.add_axes([.655,.295,.30,.17]);ta.axis('off');tab=[['身份','摘卡盘','本人格','最终解']]+[[a['person'],a['candidate_layouts'],len(a['positions']),a['final_solutions']] for a in v['audit']];table=ta.table(cellText=tab,cellLoc='center',bbox=[0,0,1,1]);table.auto_set_font_size(False);table.set_fontsize(10)
 for (r,c),cell in table.get_celld().items():cell.set_edgecolor('#cbd1d4');cell.set_facecolor('#e7ecee' if r==0 else '#fbfbf8')
 fig.text(.66,.273,'同口径教程：附加试位深度 0\n本版两关：附加试位深度 1\n规则合法 / 双重唯一：通过\n新增家具：0件',fontsize=10.5,va='top',linespacing=1.8,color='#337254')
 fig.text(.045,.18,'传播停滞证据｜已给定正确身份与其严格真假条件',fontsize=14,weight='bold')
 for i in range(6):
  domains=v['stalled_domains'][i];s=' / '.join(f'({r},{c})' for r,c in domains);fig.text(.045+(i%3)*.31,.151-(i//3)*.022,f'{N[i]}：{s}',fontsize=8.5)
 fig.text(.045,.09,'答案：'+'　'.join(n+co(x) for n,x in zip(N,target))+f'　盗窃者 {d["thief"]}',fontsize=11)
 fig.text(.045,.061,'深度是声明的约束传播/位置试探操作集中的最小值；不声称是所有人类推理的绝对下界。',fontsize=10,color='#9a5e35')
 fig.text(.045,.04,'两种独立枚举一致；无实机渲染/玩家试玩。本版只交付内容设计，未写入存档。',fontsize=9.5,color='#5b6670')
 filename=f'第{level}关_方案'+('C' if q==0 else 'B')+'_设计图_v8.png';fig.savefig(ROOT/filename,dpi=140,facecolor=fig.get_facecolor());plt.close(fig)
 report.extend([f'## 第{level}关正式线索','', '| 提供者 | 卡片全文 |','|---|---|']+[f'| {n} | {"；".join(c)} |' for n,c in zip(N,d['display_cards'])]+['',f'与本人相关 {d["self_cards"]}/6 张；V只有一句；家具共{sum(map(len,obj.values()))}格。第三关为尽量降低家具密度保留两条2格关系；未实现完全去数字距离。','',f'### 规则合法性与唯一性','',f'从 {v["generated_boards"]:,} 种带身份行列合法摆法独立枚举，家具过滤后 {v["base_count"]:,}；完整摆位1、身份1。全真摆法（不加区域/严格身份）{v["all_true_boards"]}。两个独立区域规则实现结果一致。','', '| 假定身份 | 摘卡盘数 | 本人不同格数 | 本卡真盘数 | 最终解 |','|---|---:|---:|---:|---:|']+[f'| {a["person"]} | {a["candidate_layouts"]} | {len(a["positions"])} | {a["own_true"]} | {a["final_solutions"]} |' for a in v['audit']]+['','### 推理可达性与试位见证','']+proofs[q]+['','停滞时各人物候选：']+[f'- {n}：'+ '、'.join(f'({r},{c})' for r,c in dom) for n,dom in zip(N,v['stalled_domains'])]+['','分支传播详细记录（不同合法顺序可能更早发现其他等价矛盾）：',''])
 for t in v['branch_traces']:
  report.extend([f'#### 假定{t["person"]}在{tuple(t["cell"])}', '',f'结果：{t["status"]}。'+t.get('reason',''),''])
  for z in t['trace']:report.append(f'- {z["rule"]} → {z["person"]}：{z["before"]} 缩为 {z["after"]}')
 report.extend(['','答案：'+'；'.join(n+co(x) for n,x in zip(N,target))+'。',''])
report.extend(['## 同步边界','', 'v8设计图、设计数据、验证脚本、验证JSON及本报告是一组同步成果。v7与638代表历史版本，保留未覆盖；游戏内仍为原设计，不因本次设计图而更新。未修改规则规范、运行代码或存档。本轮无实机验收、无玩家试玩，也未宣称两关难度已获用户确认。'])
(ROOT/'两关难度复核_v8.md').write_text('\n'.join(report),encoding='utf8')
print('生成两张v8设计图与完整难度复核报告')
