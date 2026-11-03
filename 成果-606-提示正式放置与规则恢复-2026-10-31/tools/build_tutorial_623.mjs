import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),runs=[];
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n)},ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v)}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
const BODY=0xFFD3CCBD,GOLD=0xFFFFCB7A;
function font(r,color){for(const[k,v]of [[502,0],[512,16],[513,16],[508,0],[509,1]])num(prop(r),k,v);if(color!==undefined)num(prop(r),504,color);changed.add(r.id)}
const measure=t=>[...t].reduce((s,c)=>s+(/[\x00-\x7F]/.test(c)?9:16),0);
function line(n,t,left,y,w=660,color){const r=R(n);txt(r,t);font(r,color);place(r,left+w/2,y,w,34);return r}
function row(items,left,y){let x=left;const group=[];for(const [n,t,c]of items){const w=measure(t)+24;const r=line(n,t,x,y,w,c);group.push({name:n,text:t,left:x,width:w});x+=w+2;}runs.push({y,items:group});if(x-left>666)throw Error('row too wide '+items[0][0]);return x;}
function icon(pre,key,x,y){for(const suffix of ['', '.bg']){const r=R(pre+'ico.'+key+suffix);place(r,x,y,suffix?30:22,suffix?30:22)}}
// Reflow existing rich-text rows in their current reading order, with explicit inner padding.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 if(tag==='l1'&&[3,8].includes(page))continue;
 const pre=`td.${tag}.page.${page}.`,groups=new Map();
 for(const r of g.recs)if(r.name?.startsWith(pre+'body.')&&text(r)?.trim()){const y=Math.round(geo(r)[1]);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(r)}
 for(const [y,rs]of groups){rs.sort((a,b)=>geo(a)[0]-geo(b)[0]);row(rs.map(r=>[r.name,text(r)]),-682,y)}
}
const p='td.l1.page.3.';
line(p+'body.0.0','轻点：留下铅笔笔记，不占位。',-682,90,660,BODY);
for(const [base,parts,y]of [['body.0.1',['双击预放置：','保留','该人物在其他候选格的','笔记','。'],56],['body.1.0',['长按：黄圈走满后松手正式放置，','擦除','该人物','笔记','。'],22]])row(parts.map((t,i)=>[p+base+(i?'.key610.'+i:''),t,[1,3].includes(i)?GOLD:BODY]),-682,y);
line(p+'body.2.0','预放置和正式放置，都会给同行、同列的其他空格打叉。',-682,-12,660,BODY);
line(p+'note.rule','笔记说明：落子格与打叉格的笔记都会清除。',-682,-48,660,BODY);
// The clue quotation is a single sentence, not three stacked paragraphs.
for(const page of [2,4,5,6]){const pre=`td.l1.page.${page}.`,rs=[0,1,2].map(i=>R(pre+'cluesay.'+i));row(rs.map(r=>[r.name,text(r)]),-629,page===2?-237:-197);}
// Restore semantic order on the submit page, including the icon and its label.
const q='td.l1.page.8.';
line(q+'body.0.0','摆满5个人后，点击右侧',-682,90,222,BODY);icon(q,'submit',-436,90);line(q+'ico.submit.t','提交箭头',-413,90,100,GOLD);
line(q+'body.1.0','点击后会先进行确认。',-682,56,660,BODY);
row([[q+'body.1.1','确认后，摆对的格子标',BODY],[q+'body.1.2','绿圈',0xFF8FD18A],[q+'body.2.0','。',BODY]],-682,22);
row([[q+'body.x5','摆错的格子标',BODY],[q+'body.x6','红圈',0xFFFF8A7A],[q+'body.x7','，可据此继续调整。',BODY]],-682,-12);
line(q+'notet','推不出来？点击右下角的',-647,-211,250,BODY);icon(q,'hint',-370,-211);line(q+'ico.hint.t','提示按钮',-345,-211,112,GOLD);
line(p+'notet','放错了？右侧可',-647,-211,154,BODY);icon(p,'undo',-464,-211);line(p+'ico.undo.t','撤销',-438,-211,64,GOLD);icon(p,'redo',-342,-211);line(p+'ico.redo.t','重做',-316,-211,64,GOLD);
// Home groups: leave enough width for every complete word and use shared baselines.
const h='td.home.page.1.';
line(h+'rule.1.body.1.0','摆满后点击',-640,121,108,BODY);icon(h,'submit',-509,121);line(h+'ico.submit.t','提交',-486,121,64,GOLD);
line(h+'rule.5.body.2.0','放错了，点右侧',-640,-228,140,BODY);icon(h,'undo',-476,-228);line(h+'ico.undo.t','撤销',-452,-228,64,GOLD);icon(h,'redo',-356,-228);line(h+'ico.redo.t','重做',-332,-228,64,GOLD);
place(R(h+'help619.icon'),-628,-48,22,22);line(h+'furniture617.1','线索栏右上方的注释',-608,-48,254,BODY);line(h+'furniture617.2','会说明本关相关内容。',-640,-78,286,BODY);
// Second lesson, page two: restore emphasis using existing empty text controls.
const s='td.l2.page.2.';
row([[s+'rewrite617.0','不会提前告知',GOLD],[s+'body.0.0','是否存在假话。',BODY]],-682,89);
row([[s+'rewrite617.1','除通用线索外，',BODY],[s+'body.0.1','任何人提供的线索',BODY],[s+'body.0.2','都可能是假话。',GOLD]],-682,55);
row([[s+'rewrite617.2','受害者提供的线索也不例外；',BODY],[s+'body.1.0','通用线索始终为真。',GOLD]],-682,21);
// Legends: use common centres and generous boxes for short symbol labels.
for(const r of g.recs){const m=r.name?.match(/^(td\.(?:home|l1|l2)\.page\.\d+)\.lg\.(\d+)(\.bg)?$/);if(!m)continue;const [,y,w,hh]=geo(r);place(r,510,y,text(r)!==undefined?44:w,text(r)!==undefined?36:hh);if(text(r)!==undefined){num(prop(r),508,1);num(prop(r),502,0);}}
// Increase small text boxes without reducing the requested font sizes.
for(const r of g.recs){if(!r.name?.startsWith('td.')||!text(r)?.trim()||!prop(r))continue;const [x,y,w,hh]=geo(r),size=Number(prop(r).sub.find(f=>f.field===512)?.num||16);if(/\.(chipt|stept|stepn)\./.test(r.name)){const needed=measure(text(r))+24;if(needed>w)place(r,x,y,needed,Math.max(hh,34));}}
const script=Buffer.from(findScriptLeaf(g).buf);
const result=writeGil(g,output,{label:'623 explicit sentence layout, icon alignment and emphasis',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script changed';for(const r of t.recs){if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name;if(changed.has(r.id)){if(!r.name?.startsWith('td.'))return 'non tutorial';for(const st of stateBlocks(r.field.sub,[]))for(const k of [504,505])for(const v of [0,1])if(!Number.isFinite(pairValue(pairOf(st,k),v)))return 'geometry '+r.name;}}return true;}});
const rows=result.g2.recs.filter(r=>r.name?.startsWith('td.')).map(r=>({name:r.name,text:text(r),rect:geo(r),size:Number(prop(r)?.sub.find(f=>f.field===512)?.num||0),color:Number(prop(r)?.sub.find(f=>f.field===504)?.num||0)}));
if(report)fs.writeFileSync(report,JSON.stringify({records:result.g2.recs.length,changed:[...changed].map(id=>g.recs.find(r=>r.id===id).name),runs,rows},null,2));
console.log(JSON.stringify({records:result.g2.recs.length,changed:changed.size,scriptUnchanged:true}));
