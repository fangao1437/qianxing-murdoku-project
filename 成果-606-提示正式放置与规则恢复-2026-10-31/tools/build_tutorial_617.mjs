import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output||input===output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),added=[],copy={};
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0],text=r=>nodes(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,v){const f=nodes(r.field,[505,503,75,510,501])[0];if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(v);f.len=f.payload.length;changed.add(r.id);copy[r.name]=v;}
function num(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0);}
function font(r,size=16,color=0xFFD3CCBD,align=0){const p=prop(r);num(p,512,size);num(p,504,color);num(p,508,align);num(p,509,1);num(p,502,0);num(p,513,size);changed.add(r.id);}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function art(r,id,color){for(const p of nodes(r.field,[505,503,84])){num(p,503,id);num(p,502,color);}changed.add(r.id);}
let max=BigInt(g.maxId);
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);function walk(a,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,d+1);}}walk(f.sub);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;let pf=f.sub.find(q=>q.field===504&&q.wt===0);if(!pf)f.sub.push(pf={field:504,wt:0});pf.num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let found=false;while(stack.length&&!found){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);found=true;break;}stack.push(q.sub);}}if(!found)throw Error('holder');const r={id,name,field:f};for(const s of stateBlocks(f.sub,[]))for(const q of s.sub||[])if([501,502,503,506].includes(q.field))for(const v of q.sub||[])if(v.wt===5)v.f=q.field===501?1:0.5;place(r,x,y,w,h);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);added.push(r);by.set(name,r);return r;}
function line(parent,name,t,x,y,w=650,size=16){const r=clone(R('td.l2.page.1.body.0.0'),parent,name,x,y,w,26);txt(r,t);font(r,size);return r;}
function clearPrefix(pre){for(const r of g.recs)if(r.name?.startsWith(pre)&&text(r)!==undefined)txt(r,'');}
// All player-facing archive text: same terminology throughout.
for(const r of g.recs){let t=text(r);if(t===undefined)continue;let u=t.replaceAll('他的口供','他提供的线索').replaceAll('口供','提供的线索').replaceAll('的提供的线索','提供的线索');if(u!==t)txt(r,u);}
const hp='td.home.page.1.';clearPrefix(hp+'rule.3.body.');
const homeLines=['椅子、地毯等家具可以站人；','桌子、植物等家具不能站人。','每关线索栏右上角的「?」注释中，','会标明本关相关内容。'];
homeLines.forEach((t,i)=>line(R('td.home.page.1'),hp+'furniture617.'+i,t,-497,-16-i*24,286,14));
// Other furniture explanations: append 等 to the category, never imply only furniture is standable.
for(const r of g.recs){const t=text(r);if(!t||!r.name?.startsWith('td.')||r.name.startsWith(hp))continue;let u=t.replace(/椅子、地毯(?!等)/g,'椅子、地毯等').replace(/桌子、植物、书架、雕像(?!等)/g,'桌子、植物、书架、雕像等');if(u!==t){txt(r,u);}}
const pages=[
 {heading:'复习：四个要点',lines:['① 每行、每列恰好一人。','② 只能站可站格；椅子、地毯等家具也可站人。','③ 用线索逐步缩小每个人的候选位置。','④ 只有门直接连通的两间屋才算相邻。'],chips:['6×6 · 6 人','四间屋','门连通才相邻']},
 {heading:'线索可能存在至多一条假话',lines:['不会提前告知是否存在假话。','除通用线索外，任何人提供的线索都可能是假话。','受害者提供的线索也不例外；通用线索始终为真。','本关通用线索：地毯上没有人。'],chips:['至多一条假话','是否存在不预告','通用线索为真']},
 {heading:'抓谎：三条常用的判断方法',lines:['① 看线索是否与规则或其他线索直接矛盾。','② 假设所有线索为真，检查是否存在可行摆位。','③ 看是否有人有多个可选位置；若没有，','   根据规则，一定有人说谎，且说谎者就是盗窃者。'],chips:null},
 {heading:'收口：位置唯一，锁定盗窃者',lines:['经过推导，所有人的位置都已唯一确定。','D 提供的线索要求 E 与 A 在同一列，','这与「每列恰好一人」直接矛盾，因此 D 说了谎。','没有人有多个可选位置，所以盗窃者是 D（鉴定师）。'],chips:['所有人位置唯一','D 提供了假线索','D 就是盗窃者']}
];
for(let i=1;i<=4;i++){const pre=`td.l2.page.${i}.`,p=R(pre.slice(0,-1)),v=pages[i-1];clearPrefix(pre+'body.');txt(R(pre+'heading'),v.heading);font(R(pre+'heading'),24,0xFFF8F1E4);place(R(pre+'heading'),-351,101,660,44);v.lines.forEach((t,j)=>line(p,pre+'rewrite617.'+j,t,-352,66-j*26,660,16));if(v.chips)v.chips.forEach((t,j)=>{const r=R(pre+'chipt.'+j);txt(r,t);font(r,12,0xFFF8F1E4,1);});txt(R(pre+'title'),'复习与谎言');}
// Keep existing diagrams; remove submit artwork from the closing page.
for(const r of g.recs.filter(r=>r.name?.startsWith('td.l2.page.4.ico.submit'))){if(text(r)!==undefined)txt(r,'');else art(r,100001,0);}
for(const r of g.recs){const t=text(r);if(!t)continue;if(r.name?.startsWith('td.l2.')&&t.includes('四步'))txt(r,t.replaceAll('四步','四个要点'));}
for(const [n,t] of [['clueface','D'],['cluename','D（鉴定师）提供的线索'],['cluesay.0','随行记者在夜班门卫的上方（同一列）。'],['cluesay.1',''],['cluesay.2','']]){const r=R('td.l2.page.4.'+n);txt(r,t);if(n==='cluesay.0'){place(r,-313,-186,630,32);font(r,16);}}
for(const [n,t] of [['cluesay.0','D 的线索要求两人同列，与每列一人的规则矛盾。'],['cluesay.1',''],['cluesay.2','']]){const r=R('td.l2.page.3.'+n);txt(r,t);if(n==='cluesay.0'){place(r,-313,-225,630,30);font(r,15);}}
const p7=R('td.l1.page.7');
for(const [j,y] of [[0,-180],[1,-203],[2,-226]])place(R('td.l1.page.7.cluesay.'+j),-313,y,633,25);
line(p7,'td.l1.page.7.rule617.0','（注：若没有人有多个位置可选，则说谎者是盗窃者；',-352,-253,660,13);
line(p7,'td.l1.page.7.rule617.1','该规则的具体内容将在下一关详述。）',-352,-274,660,13);
// Per-level furniture note, within the existing first-page annotation zone.
for(const tag of ['l1','l2']){const p=R(`td.${tag}.page.1`);line(p,`td.${tag}.page.1.furniture617.0`,'椅子、地毯等可站人；桌子、植物等不可站人。',-352,-244,660,14);line(p,`td.${tag}.page.1.furniture617.1`,'每关线索栏右上角的「?」注释中会标明相关内容。',-352,-268,660,14);}
// Fixed question-mark glyph: font-rendered icon, no unknown image ID.
const help=clone(R('td.home.page.1.rule.1.num'),R('clues'),'clues.help617',158,252,32,32);txt(help,'?');font(help,24,0xFFF2C94C,1);
const panel=clone(R('td.l2'),R('root'),'help617',0,0,1600,900);
const bg=clone(R('td.home.page.1.ico.submit.bg'),panel,'help617.bg',0,0,760,420);art(bg,100001,0xFF111B29);
line(panel,'help617.title','本关注释',0,155,680,24);
const body=line(panel,'help617.body','本关家具说明',0,15,680,18);place(body,0,15,680,240);
const close=line(panel,'help617.close','关闭',0,-165,150,18);font(close,18,0xFFF2C94C,1);
const script=fs.readFileSync('dist/client_script.lua');const sl=findScriptLeaf(g).field;sl.payload=script;sl.len=script.length;
for(const r of g.recs){const t=text(r);if(r.name?.startsWith('td.')&&t&&t.includes('口供'))throw Error('old terminology');}
const report=writeGil(g,output,{label:'617 tutorial rewrite and per-level help',expectRecs:g.recs.length+added.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';if(new Set(t.recs.map(r=>r.id)).size!==t.recs.length)return 'duplicate ids';for(const r of t.recs){if(copy[r.name]!==undefined&&text(r)!==copy[r.name])return 'copy '+r.name;for(const s of (changed.has(r.id)?stateBlocks(r.field.sub,[]):[])){for(const k of [504,505]){const p=pairOf(s,k);if(p&&(!Number.isFinite(pairValue(p,0))||!Number.isFinite(pairValue(p,1))))return 'nonfinite '+r.name;}}}return true;}});
console.log(JSON.stringify({records:report.g2.recs.length,added:added.length,copy:copy}));
