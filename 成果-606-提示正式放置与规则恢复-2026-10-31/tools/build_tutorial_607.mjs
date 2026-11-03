import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,preview]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('missing arguments or existing output');
const g=readGil(input),originalScript=fs.readFileSync('dist/client_script.lua'),original=new Map(g.recs.map(r=>[r.id,Buffer.from(encodeMsg([r.field]))]));
const by=new Map(g.recs.map(r=>[r.name,r])),ids=new Map(g.recs.map(r=>[r.id,r]));
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0];
const text=r=>nodes(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,v){const f=nodes(r.field,[505,503,75,510,501])[0];if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(v);f.len=f.payload.length;}
function number(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0);}
function font(r,size,color,align=1){number(prop(r),512,size);number(prop(r),504,color);number(prop(r),508,align);}
function art(r,image,color){for(const p of nodes(r.field,[505,503,84])){number(p,503,image);number(p,502,color);number(p,504,1);}}
function geo(r){const s=stateBlocks(r.field.sub,[])[0];return [pairValue(pairOf(s,504),0),pairValue(pairOf(s,504),1),pairValue(pairOf(s,505),0),pairValue(pairOf(s,505),1)];}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}}
function rotation(r,deg){for(const s of stateBlocks(r.field.sub,[])){s.sub=s.sub.filter(f=>f.field!==508);s.sub.push({field:508,wt:2,sub:[{field:3,wt:5,f:deg}],len:5,payload:null,isText:false});}}
let max=BigInt(g.maxId);const added=[];
function holder(id){const stack=[g.tree];while(stack.length){const a=stack.pop();for(let i=0;i<a.length;i++){const f=a[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {a,i};stack.push(f.sub);}}throw Error('holder');}
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);function walk(a,depth=0){for(const q of a){if(!(depth===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,depth+1);}}walk(f.sub);const namef=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);namef.payload=Buffer.from(name);namef.len=namef.payload.length;let pf=f.sub.find(q=>q.field===504&&q.wt===0);if(!pf)f.sub.push(pf={field:504,wt:0});pf.num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const r={id,name,field:f};place(r,x,y,w,h);const hld=holder(proto.id);hld.a.splice(hld.i+1,0,f);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);added.push(r);by.set(name,r);ids.set(id,r);return r;}
const P=R('td.l1.page.3'),pre='td.l1.page.3.',DARK=0xFF45494D,YELLOW=0xFFF2C94C,BODY=0xFFD3CCBD;
// Center the two pencil notes in their cells, 20 -> 14 px.
for(const [n,x] of [['svg.63',331.4991149902344],['svg.64',404.5855407714844]]){const r=R(pre+n);txt(r,'d');font(r,14,0xFF555B60);place(r,x,-119.95943450927734,28,30);}
for(let i=28;i<=35;i++)art(R(pre+'svg.'+i),100001,DARK);
// Replace each runtime X glyph with the exact same two rotated rectangular strokes.
const roots=g.recs.filter(r=>r.name==='x');if(roots.length!==2)throw Error('expected two x templates');
for(const root of roots){art(root,100001,0x00000000);const [,,w,h]=geo(root);for(const [i,angle] of [45,-45].entries()){const r=clone(R(pre+'svg.28'),root,'x.stroke.'+i,0,0,w*39.86735534667969/70.47618865966797,h*4.241622447967529/70.47618865966797);art(r,100001,DARK);rotation(r,angle);}}
// Matching legend, lighter backing keeps the dark cross legible on the dark tutorial panel.
font(R(pre+'lg.7'),13,DARK);art(R(pre+'lg.7.bg'),100002,0xFFD4C8BC);
// 75% static long-press example: 54 of 72 tangent segments, top clockwise to left.
const cx=258.4126892089844,cy=-119.95943450927734,rad=27,count=72;
for(let i=0;i<54;i++){const a=(i+0.5)*Math.PI*2/count;const r=clone(R(pre+'svg.28'),P,pre+'hold75.'+i,cx+rad*Math.sin(a),cy+rad*Math.cos(a),2*Math.PI*rad/count*1.08,3.2);art(r,100001,YELLOW);rotation(r,-(i+0.5)*360/count);}
const letter=clone(R(pre+'svg.63'),P,pre+'hold75.letter',cx,cy,40,46);txt(letter,'D');font(letter,27,0xFF353A3E);
const label=clone(R(pre+'caption'),P,pre+'hold75.label',cx,cy-28,65,18);txt(label,'长按 75%');font(label,10,0xFF555B60);
// Remove home parenthetical without adding another annotation.
txt(R('td.home.page.1.rule.5.body.1.0'),'；');
// Four explicit rows plus a short exception line; keep related phrases intact.
const lines=[
 ['body.0.0','轻点：留下铅笔笔记，不占位。',BODY,62],
 ['body.0.1','双击预放置：保留该人物在其他候选格的笔记。',0xFFFFCB7A,37],
 ['body.1.0','长按：黄圈走满后松手正式放置，擦除该人物笔记。',BODY,12],
 ['body.2.0','预放置和正式放置，都会给同行、同列的其他空格打叉。',BODY,-13]
];
for(const [n,t,c,y] of lines){const r=R(pre+n);txt(r,t);font(r,15,c,0);place(r,-352,y,660,27);}
const foot=clone(R(pre+'body.0.0'),P,pre+'note.rule',-352,-39,660,24);txt(foot,'笔记说明：落子格与打叉格的笔记都会清除。');font(foot,13,0xFFAEB7C2,0);
txt(R(pre+'caption'),'• 黄色环为长按进度示例（75%）；灰黑叉表示排除');
font(R(pre+'caption'),12,0xFFAEB7C2);place(R(pre+'caption'),258.4126892089844,-277.2257385253906,440,28);
const scriptLeaf=findScriptLeaf(g).field;scriptLeaf.payload=originalScript;scriptLeaf.len=originalScript.length;
const rep=writeGil(g,output,{label:'607 tutorial notes, static hold example and shared dark X',expectRecs:g.recs.length+added.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(originalScript))return 'script changed';
 if(new Set(t.recs.map(r=>r.id)).size!==t.recs.length)return 'duplicate IDs';
 const m=new Map(t.recs.map(r=>[r.name,r]));
 for(const r of t.recs){if(r.name?.startsWith(pre)||r.name?.startsWith('td.home.')){if(text(r)?.includes('反悔'))return 'old copy';}}
 for(const old of roots){const r=t.recs.find(q=>q.id===old.id);const children=asIdList(findChildListTop(r.field.sub).payload,true);if(children.length!==2)return 'x strokes';for(const id of children){const child=t.recs.find(q=>q.id===id);if(child.field.sub.find(f=>f.field===504&&f.wt===0)?.num!==BigInt(r.id))return 'parent';}}
 if(t.recs.filter(r=>/^td\.l1\.page\.3\.hold75\.\d+$/.test(r.name||'')).length!==54)return 'ring amount';
 for(const [n,tv] of lines){if(text(m.get(pre+n))!==tv)return 'copy mismatch';}
 return true;
}});
const changed=rep.g2.recs.filter(r=>original.has(r.id)&&!original.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name);
if(changed.filter(n=>n!==undefined&&n!==null).some(n=>n!=='x'&&n!=='td.l1.page.3'&&!n?.startsWith(pre)&&n!=='td.home.page.1.rule.5.body.1.0'))throw Error('unexpected changes '+JSON.stringify(changed));
console.log(JSON.stringify({records:rep.g2.recs.length,added:added.length,changed,scriptMatchesDist:true}));
if(preview){
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 let svg='<rect x="0" y="0" width="1600" height="900" fill="#0D1520"/>';
 // Geometry preview: asset rectangles are placeholders; prose, notes, strokes and ring use actual archive fields.
 for(const r of rep.g2.recs.filter(r=>r.name?.startsWith(pre))){const sb=stateBlocks(r.field.sub,[])[0];if(!sb)continue;const [x,y,w,h]=geo(r);const t=text(r);const ap=nodes(r.field,[505,503,84])[0];let col=Number((t!==undefined?prop(r):ap)?.sub?.find(f=>f.field===(t!==undefined?504:502)&&f.wt===0)?.num??0);const color='#'+(col&0xFFFFFF).toString(16).padStart(6,'0'),alpha=(col>>>24)/255;
 if(t!==undefined){const size=Number(prop(r).sub.find(f=>f.field===512)?.num||15),center=Number(prop(r).sub.find(f=>f.field===508)?.num||0)===1;svg+=`<text x="${800+x+(center?0:-w/2)}" y="${450-y}" dominant-baseline="central" text-anchor="${center?'middle':'start'}" font-size="${size}" fill="${color}" opacity="${alpha}">${escape(t)}</text>`;}
 else if(ap){const angle=sb.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f||0;svg+=`<rect x="${800+x-w/2}" y="${450-y-h/2}" width="${w}" height="${h}" transform="rotate(${-angle} ${800+x} ${450-y})" fill="${color}" opacity="${alpha}"/>`;}}
 fs.writeFileSync(preview,`<!doctype html><meta charset="utf-8"><title>607教程排版检查</title><style>body{margin:0;background:#0D1520}svg{width:100%;font-family:'Microsoft YaHei'}</style><svg viewBox="0 0 1600 900">${svg}</svg>`);
}
