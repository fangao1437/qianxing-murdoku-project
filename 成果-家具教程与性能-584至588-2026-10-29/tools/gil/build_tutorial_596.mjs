// 595 -> 596: tutorial text layout. Re-lay multi-colour body lines with measured advance,
// widen clipped text boxes (step tag / chips), fix phrase breaks and restore dropped words.
// Usage: node tools/gil/build_tutorial_596.mjs <595.gil> <596.gil> [spec.json]
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,specOut]=process.argv.slice(2);
if(!input||!output||input===output)throw Error('missing arguments or same input/output');
const g=readGil(input),script=Buffer.from(findScriptLeaf(g).buf);
const original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
const byName=new Map(g.recs.filter(r=>r.name).map(r=>[r.name,r]));
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0];
const num=(r,k)=>Number(prop(r).sub.find(f=>f.field===k&&f.wt===0)?.num||0);
const setNum=(r,k,v)=>{const p=prop(r);let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0,num:0n});f.num=BigInt(v>>>0);};
const getText=r=>nodes(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8')??'';
const setText=(r,v)=>{const l=nodes(r.field,[505,503,75,510,501])[0];l.payload=Buffer.from(v,'utf8');l.len=l.payload.length;l.isText=true;};
const geom=r=>{const s=stateBlocks(r.field.sub,[])[0];return {x:pairValue(pairOf(s,504),0),y:pairValue(pairOf(s,504),1),w:pairValue(pairOf(s,505),0),h:pairValue(pairOf(s,505),1)};};
const place=(r,x,y,w,h)=>{const o=geom(r);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w??o.w,h??o.h);}};
const changed=new Set();
// Estimated advance. CJK/full-width = 1em; Latin slightly under to stay conservative on the right.
const ADV={"教":1.0,"④":1.0,"半":1.0,"法":1.0,"手":1.0,"台":1.0,"{":0.33,"格":1.0,"互":1.0,"值":1.0,"硬":1.0,"好":1.0,"N":0.81,"*":0.46,"_":0.45,"J":0.4,"无":1.0,">":0.74,"始":1.0,"回":1.0,"已":1.0,"也":1.0,"别":1.0,"虚":1.0,"能":1.0,"家":1.0,"事":1.0,"#":0.64,"像":1.0,"r":0.38,"侧":1.0,"反":1.0,"样":1.0,"但":1.0,"高":1.0,"（":1.0,"z":0.49,"$":0.59,"线":1.0,"这":1.0,"h":0.62,"盘":1.0,"门":1.0,"3":0.59,"验":1.0,"记":1.0,"图":1.0,"度":1.0,"窃":1.0,"留":1.0,"隔":1.0,"确":1.0,"销":1.0,"整":1.0,"收":1.0,"关":1.0,"洽":1.0,"S":0.58,"句":1.0,"多":1.0,"＝":1.0,"去":1.0,"害":1.0,"变":1.0,"R":0.65,"选":1.0,"M":0.98,"清":1.0,"果":1.0,"Z":0.62,"在":1.0,"部":1.0,"棋":1.0,"是":1.0,"题":1.0,"分":1.0,"游":1.0,"为":1.0,"次":1.0,"`":0.3,"按":1.0,"跨":1.0,"8":0.59,"<":0.74,"先":1.0,"边":1.0,"u":0.62,"处":1.0,"识":1.0,"你":1.0,"左":1.0,"件":1.0,"怎":1.0,"后":1.0,"双":1.0,"复":1.0,"→":1.0,"行":1.0,"结":1.0,"状":1.0,"地":1.0,"班":1.0,"洁":1.0,"/":0.43,"b":0.64,"安":1.0,"字":1.0,"间":1.0,"运":1.0,"架":1.0,"认":1.0,"没":1.0,"撤":1.0,"跳":1.0,"等":1.0,"到":1.0,"植":1.0,"逐":1.0,"突":1.0,"比":1.0,"自":1.0,"种":1.0,"终":1.0,"×":0.74,"人":1.0,"；":1.0,"连":1.0,"戏":1.0,"。":1.0,"同":1.0,"m":0.94,"要":1.0,"7":0.59,"习":1.0,"铅":1.0,"用":1.0,"：":1.0,"—":1.08,"U":0.75,"划":1.0,"落":1.0,"生":1.0,"从":1.0,"n":0.62,"目":1.0,"环":1.0,"}":0.33,"o":0.64,"(":0.33,"打":1.0,"6":0.59,"假":1.0,"V":0.68,"Y":0.6,"恒":1.0,"出":1.0,"判":1.0,"几":1.0,"式":1.0,"」":1.0,"屋":1.0,"各":1.0,"标":1.0,"笔":1.0,"每":1.0,"厅":1.0,"保":1.0,"靠":1.0,"明":1.0,"四":1.0,"《":1.0,"条":1.0,"大":1.0,"桌":1.0,"叉":1.0,"剩":1.0,"贴":1.0,",":0.24,"当":1.0,"消":1.0,"j":0.27,"子":1.0,"邻":1.0,"最":1.0,"讲":1.0,"说":1.0,"设":1.0,"坐":1.0,"直":1.0,"择":1.0,"谎":1.0,"玩":1.0,"1":0.59,"速":1.0,"?":0.48,"'":0.26,"钉":1.0,"上":1.0,"圈":1.0,"q":0.64,"p":0.64,"二":1.0,"库":1.0,"览":1.0,"步":1.0,"|":0.27,"!":0.31,"接":1.0,"-":0.43,"受":1.0,"他":1.0,"墙":1.0,"推":1.0,"至":1.0,"壁":1.0,"w":0.79,"改":1.0,"错":1.0,"哪":1.0,"定":1.0,"雕":1.0,"I":0.29,"红":1.0,"橙":1.0,"理":1.0,"再":1.0,"共":1.0,"悔":1.0,"前":1.0,"另":1.0,"0":0.59,"》":1.0,"则":1.0,"掉":1.0,"么":1.0,"谁":1.0,"天":1.0,"a":0.55,"身":1.0,"E":0.55,"董":1.0,"晓":1.0,"全":1.0,"t":0.37,"e":0.57,"里":1.0,"都":1.0,"、":1.0,"完":1.0,"诉":1.0,")":0.33,"•":0.44,"正":1.0,"将":1.0,"点":1.0,"恰":1.0,"域":1.0,"✓":0.7,"临":1.0,"D":0.76,"踩":1.0,"搬":1.0,"经":1.0,"窄":1.0,"和":1.0,"\\":0.42,"了":1.0,"告":1.0,"不":1.0,"它":1.0,"扇":1.0,"粗":1.0,"来":1.0,"死":1.0,"2":0.59,"办":1.0,"之":1.0,"–":0.54,"被":1.0,"③":1.0,"与":1.0,"通":1.0,"以":1.0,"伙":1.0,"算":1.0,"P":0.61,"局":1.0,"含":1.0,"立":1.0,"A":0.7,"i":0.27,"旁":1.0,"G":0.74,"C":0.67,"摘":1.0,"须":1.0,"做":1.0,"时":1.0,"d":0.64,"着":1.0,"者":1.0,"击":1.0,"姑":1.0,"中":1.0,"工":1.0,"解":1.0,"O":0.82,"方":1.0,"T":0.57,"廊":1.0,"头":1.0,"开":1.0,"重":1.0,"②":1.0,"一":1.0,"放":1.0,"抓":1.0,"写":1.0,"换":1.0,"势":1.0,"辜":1.0,"c":0.5,"列":1.0,"所":1.0,"长":1.0,"决":1.0,"名":1.0,"蓝":1.0,"作":1.0,"本":1.0,"满":1.0,"相":1.0,"只":1.0,"三":1.0,"书":1.0,"走":1.0,"交":1.0,"规":1.0,"动":1.0,"就":1.0,"盗":1.0,"除":1.0,"余":1.0,"空":1.0,"答":1.0,"总":1.0,"述":1.0,"我":1.0,"^":0.74,"如":1.0,"枚":1.0,"某":1.0,"预":1.0,"成":1.0,"言":1.0,"排":1.0,"内":1.0,"K":0.63,";":0.24,"才":1.0,"例":1.0,"远":1.0,"外":1.0,":":0.24,"亮":1.0,"指":1.0,"藏":1.0,"⇒":0.7,"占":1.0,"提":1.0,"摆":1.0,"论":1.0,"话":1.0,"张":1.0,"且":1.0,"数":1.0,"独":1.0,"个":1.0,"候":1.0,"供":1.0,"校":1.0,"毯":1.0,"置":1.0,"位":1.0,"小":1.0,"站":1.0,"稍":1.0,"母":1.0,"案":1.0,"y":0.53,"W":1.02,"必":1.0,"]":0.33,"[":0.33,"L":0.51,"\"":0.44,"右":1.0,"口":1.0,"下":1.0,"过":1.0,"区":1.0,"9":0.59,"B":0.63,"揪":1.0,"两":1.0,"商":1.0,"古":1.0,"看":1.0,"有":1.0,"号":1.0,"第":1.0,"「":1.0,"l":0.27,"揭":1.0,"往":1.0,"v":0.52,"g":0.64,"试":1.0,"会":1.0,"操":1.0,"住":1.0,"①":1.0,"k":0.54,"的":1.0,"，":1.0,"真":1.0,"s":0.46,"影":1.0,"夜":1.0,"房":1.0,"场":1.0,"还":1.0,"旧":1.0,".":0.24,"轻":1.0,"形":1.0,"冲":1.0,"进":1.0,"F":0.53,"）":1.0,"f":0.35,"起":1.0,"&":0.87,"可":1.0,"找":1.0,"+":0.74,"画":1.0,"5":0.59,"4":0.59,"物":1.0,"程":1.0,"椅":1.0,"淘":1.0,"？":1.0,"而":1.0," ":0.3,"X":0.65,"永":1.0,"x":0.51,"破":1.0,"金":1.0,"·":0.24,"那":1.0,"卡":1.0,"把":1.0,"取":1.0,"道":1.0,"色":1.0,"娘":1.0,"源":1.0,"索":1.0,"=":0.74,"室":1.0,"具":1.0,"汰":1.0};
function adv(t,size){return Math.max(...t.split("\n").map(line=>[...line].reduce((n,c)=>n+(ADV[c]??1)*size,0)));}
const GOLD=0xFFFFCB7A,BLUE=0xFF9ED8FF,BODY=0xFFD3CCBD,COL={g:GOLD,b:BLUE,t:BODY};
const T=s=>[s,'t'],G=s=>[s,'g'],B=s=>[s,'b'];
// Lines for groups that need a new break; groups not listed keep their text and are only re-spaced.
const NEW={
 'home.page.1.rule.1.body':[[T('每名当事人（含 1 名受害者）各占一格。')],[T('全部摆好后，指出谁是'),G('盗窃者'),T('；')],[T('如果受害者屋里还有别人，')],[T('还要说清有没有同伙。')]],
 'home.page.1.rule.2.body':[[T('放下一个人，整行整列会自动打叉。')],[T('一行不能站两个，一列也不能。')]],
 'home.page.1.rule.3.body':[[B('椅子、地毯'),T('可以站；')],[G('桌子、植物、书架、雕像'),T('不能站。')]],
 'home.page.1.rule.4.body':[[T('只算上下左右贴着的格子：')],[G('同屋直接算，跨屋必须中间有门，')],[T('隔着墙不算。')],[T('盗窃者也一定落在受害者隔壁的屋里。')]],
 'home.page.1.rule.5.body':[[T('点一张线索卡选中人。轻点格子＝铅笔笔记；'),G('双击＝预放置'),T('（先占位，可反悔）；')],[G('按住不放、进度环走完＝正式放下'),T('。')],[T('放错了用右边的撤销。')]],
 'l1.page.3.body':[[T('轻点格子只留一个铅笔小字，不占位；')],[G('双击先把棋子预放在格子上'),T('（可以反悔，不算正式落子）；')],[T('按住不放、等进度环走完，才真正落下大字母。\n放下后，这一行这一列会自动打叉。')]],
 'l1.page.5.body':[[T('卡 5：「前台姑娘在桌子旁边」→ (2,2) 和 (3,1)。')],[T('但 (3,1) 是地毯，站上去就和卡 3「只有值班保安在地毯上」冲突，')],[T('所以 '),G('B = (2,2)。')],[T('第 2 行、第 2 列被占 ⇒ A 的 (2,4)(2,5)(3,2) 出局 ⇒ '),G('A = (3,1)。')]],
 'l1.page.4.body':[[T('卡 3 是清洁工的口供：「只有值班保安站在地毯上」。')],[T('地毯一共 4 格，所以保安只可能在这 4 格之一，')],[T('别人踩上地毯就破了这句话。')]],
 'l1.page.6.body':[[T('卡 4 是古董商的口供：「夜班清洁工站在椅子上」。')],[T('椅子只有 (4,2) 和 (5,4)；')],[T('(4,2) 和前台姑娘同列，站不了 ⇒ '),G('清洁工 = (5,4)'),T('。')]],
 'l2.page.2.body':[[T('假话是'),G('整条假'),T('，不是半真半假；最多一条；受害者的话也可能落在这一条上。')],[T('另有一种「通用线索」不算谁的卡，比如本关的「地毯上没有人」；')],[T('它同样可能为假，但这一句是真的，先把 5 个地毯格划掉。')]],
 'l2.page.3.body':[[T('先假设所有线索都为真。如果一种摆法都摆不出来，就说明必有一句假话。')],[T('再逐条假设它是假、摘掉它，看剩下能不能自洽 —— 能自洽的那一条就是假话。')],[T('像「某人在某人的同一列上方」这种形状的话，')],[G('天生就假'),T('：每列只能站一个人，不可能有两个。')]],
};
const groups=new Map();
for(const r of g.recs){const m=/^td\.((?:home|l1|l2)\.page\.\d+\.(?:rule\.\d\.body|body|cluesay))\.(\d+)(?:\.(\d+))?$/.exec(r.name||'');if(!m||!prop(r))continue;if(!groups.has(m[1]))groups.set(m[1],[]);groups.get(m[1]).push({r,i:+m[2],j:m[3]===undefined?null:+m[3]});}
const report=[];const MAX=(k)=>k.startsWith('home.')?(k.includes('rule.5')?640:292):648;
for(const [key,list] of groups){
 list.sort((a,b)=>a.i-b.i||(a.j??0)-(b.j??0));
 const size=num(list[0].r,512),first=geom(list[0].r);
 const isClue=key.endsWith('cluesay');
 let lines;
 if(NEW[key])lines=NEW[key];
 else if(isClue)lines=[list.map(e=>[getText(e.r),Object.entries(COL).find(([,v])=>v===num(e.r,504))?.[0]||'t'])];
 else{const by=new Map();for(const e of list){if(!by.has(e.i))by.set(e.i,[]);by.get(e.i).push([getText(e.r),Object.entries(COL).find(([,v])=>v===num(e.r,504))?.[0]||'t']);}lines=[...by.values()];}
 const ys=[...new Set(list.map(e=>geom(e.r).y))].sort((a,b)=>b-a);
 const left=first.x-first.w/2,pool=list.map(e=>e.r);let used=0;
 const lineStep=key.startsWith('home.')?24:26; while(ys.length<lines.length)ys.push(ys[0]-ys.length*lineStep);
 lines.forEach((segs,li)=>{let x=left,total=0;for(const [text,c] of segs){if(used>=pool.length)throw Error('not enough controls '+key);const r=pool[used++],a=adv(text,size),w=Math.ceil(a*1.12+size*1.6);setText(r,text);setNum(r,504,COL[c]);setNum(r,508,0);place(r,x+w/2,ys[0]-li*lineStep-(text.includes('\n')?size*.65:0),w,Math.max(geom(r).h,Math.ceil(size*(text.includes('\n')?3.3:2))));changed.add(r.id);x+=a+1;total+=a;}
  const maxW=isClue?600:MAX(key);if(total>maxW)throw Error(`line too wide ${key} #${li}: ${Math.round(total)}>${maxW}`);});
 for(;used<pool.length;used++){setText(pool[used],' ');place(pool[used],left,ys[0],geom(pool[used]).w,geom(pool[used]).h);changed.add(pool[used].id);}
 report.push({key,lines:lines.map(s=>s.map(x=>x[0]).join(''))});
}
// Step tag pill: text box and pill were narrower than the text.
for(const r of g.recs){const m=/^td\.((?:l1|l2)\.page\.\d+)\.tag$/.exec(r.name||'');if(!m)continue;const bg=byName.get(r.name+'bg'),t=geom(r),text=getText(r),size=num(r,512),W=Math.ceil(adv(text,size)+36),left=geom(bg).x-geom(bg).w/2;
 place(bg,left+W/2,geom(bg).y,W,geom(bg).h);place(r,left+W/2,t.y,W+16,t.h);changed.add(bg.id);changed.add(r.id);}
// Chips: pill sized by estimate; make text box wider than pill so the last glyph is never clipped.
for(const r of g.recs){const m=/^td\.((?:home|l1|l2)\.page\.\d+)\.chipt\.(\d+)$/.exec(r.name||'');if(!m)continue;const pill=byName.get(`td.${m[1]}.chip.${m[2]}`);if(!pill)continue;const p=geom(pill),size=num(r,512),need=Math.ceil(adv(getText(r),size)+26);
 if(p.w<need){const dx=(need-p.w)/2;place(pill,p.x+dx,p.y,need,p.h);}const q=geom(pill);place(r,q.x,q.y,q.w+24,geom(r).h);changed.add(pill.id);changed.add(r.id);}
// Chips after a widened pill must not overlap the next one: shift following chips on the same page.
const pages=new Map();for(const r of g.recs){const m=/^td\.((?:home|l1|l2)\.page\.\d+)\.chip\.(\d+)$/.exec(r.name||'');if(m){if(!pages.has(m[1]))pages.set(m[1],[]);pages.get(m[1]).push({n:+m[2],r});}}
for(const [pg,arr] of pages){arr.sort((a,b)=>a.n-b.n);let edge=null;for(const {n,r} of arr){const p=geom(r),t=byName.get(`td.${pg}.chipt.${n}`);let left=p.x-p.w/2;if(edge!==null&&left<edge){const dx=edge-left;place(r,p.x+dx,p.y,p.w,p.h);if(t)place(t,geom(t).x+dx,geom(t).y,geom(t).w,geom(t).h);left+=dx;changed.add(r.id);if(t)changed.add(t.id);}edge=left+geom(r).w+8;}}
// Restore non-overlapping note/clue cards from the design's vertical order.
for(const pg of ['l1.page.2','l2.page.3']){
 for(const r of g.recs.filter(r=>r.name?.startsWith('td.'+pg+'.clue'))){const p=geom(r);place(r,p.x,p.y-101,p.w,p.h);changed.add(r.id);}
}
// Long coordinate note: explicit semantic lines, same left alignment as the legend.
for(const r of g.recs.filter(r=>/^td\.(home|l1|l2)\.page\.\d+\.coord$/.test(r.name||''))){
 setText(r,'坐标 =（行,列）\n行号自上而下\n列号自左而右');const pg=r.name.replace(/\.coord$/,''),last=g.recs.filter(x=>x.name?.startsWith(pg+'.lgt.')).map(x=>geom(x).y).reduce((a,b)=>Math.min(a,b));place(r,560,last-52,120,64);changed.add(r.id);
}
// Header progress should read as one phrase, without accumulated spacer boxes.
for(const pg of [...new Set(g.recs.map(r=>r.name?.match(/^td\.((?:l1|l2)\.page\.\d+)\.stepnum/)?.[1]).filter(Boolean))]){
 const rs=g.recs.filter(r=>r.name?.startsWith('td.'+pg+'.stepnum.')).sort((a,b)=>a.name.localeCompare(b.name));let x=geom(rs[0]).x-geom(rs[0]).w/2;
 for(const r of rs){const p=geom(r),a=adv(getText(r),num(r,512)),w=a+28;place(r,x+w/2,p.y,w,p.h);x+=a+1;changed.add(r.id);}
}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const rep=writeGil(g,output,{label:'596 tutorial text layout',expectRecs:g.recs.length,assert(t){const seen=new Set();for(const r of t.recs){if(seen.has(r.id))return 'duplicate id';seen.add(r.id);if(!(expected.get(r.id)||original.get(r.id))?.equals(encodeMsg([r.field])))return 'unexpected record '+r.id;}return findScriptLeaf(t).buf.equals(script)?true:'script changed';}});
if(specOut){fs.mkdirSync(specOut.replace(/[\\/][^\\/]*$/,''),{recursive:true});fs.writeFileSync(specOut,JSON.stringify(report,null,1));}
console.log(JSON.stringify({records:rep.g2.recs.length,changedRecords:changed.size,groups:report.length,scriptUnchanged:true}));
