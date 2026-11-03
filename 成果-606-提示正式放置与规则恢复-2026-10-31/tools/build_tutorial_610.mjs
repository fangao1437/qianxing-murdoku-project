// 607 -> 608: home rule-1 copy, three result popups (perfect / success / fail) text controls, "play again" label.
// Usage: node tools/build_settlement_608.mjs <607.gil> <608.gil>
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('missing arguments or existing output');
const g=readGil(input),script=fs.readFileSync('dist/client_script.lua');
const original=new Map(g.recs.map(r=>[r.id,Buffer.from(encodeMsg([r.field]))]));
const by=new Map(g.recs.map(r=>[r.name,r]));
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0];
const textNode=r=>nodes(r.field,[505,503,75,510,501])[0];
const text=r=>textNode(r)?.payload?.toString('utf8');
function txt(r,v){const f=textNode(r);if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(v);f.len=f.payload.length;}
function number(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v>>>0);}
function font(r,size,color,align){number(prop(r),512,size);number(prop(r),504,color);if(align!=null)number(prop(r),508,align);}
function geo(r){const s=stateBlocks(r.field.sub,[])[0];return [pairValue(pairOf(s,504),0),pairValue(pairOf(s,504),1),pairValue(pairOf(s,505),0),pairValue(pairOf(s,505),1)];}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}}
let max=BigInt(g.maxId);const added=[];
function holder(id){const stack=[g.tree];while(stack.length){const a=stack.pop();for(let i=0;i<a.length;i++){const f=a[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {a,i};stack.push(f.sub);}}throw Error('holder');}
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);function walk(a,depth=0){for(const q of a){if(!(depth===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,depth+1);}}walk(f.sub);const namef=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);namef.payload=Buffer.from(name);namef.len=namef.payload.length;let pf=f.sub.find(q=>q.field===504&&q.wt===0);if(!pf)f.sub.push(pf={field:504,wt:0});pf.num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const r={id,name,field:f};place(r,x,y,w,h);const hld=holder(proto.id);hld.a.splice(hld.i+1,0,f);const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);added.push(r);by.set(name,r);return r;}

// 610: split prose into adjacent single-color controls; only key words are gold.
const BODY=0xFFD3CCBD,GOLD=0xFFFFCB7A, parent=R('td.l1.page.3');
const specs=[
 ['body.0.1',37,['双击预放置：','保留','该人物在其他候选格的','笔记','。']],
 ['body.1.0',12,['长按：黄圈走满后松手正式放置，','擦除','该人物','笔记','。']]
];
for(const [suffix,y,parts] of specs){
 const proto=R('td.l1.page.3.'+suffix);let x=-682;
 for(let i=0;i<parts.length;i++){
  const text=parts[i],advance=[...text].length*15,w=advance+10;
  const r=i===0?proto:clone(proto,parent,'td.l1.page.3.'+suffix+'.key610.'+i,x+w/2,y,w,27);
  txt(r,text);font(r,15,(i===1||i===3)?GOLD:BODY,0);place(r,x+w/2,y,w,27);x+=advance;
 }
 if(x> -22)throw Error('tutorial overflow');
}
const wr=clone(R('win.1'),R('win'),'win.result',0,63,583,37);
txt(wr,'');font(wr,20,BODY,1);

const sl=findScriptLeaf(g).field;sl.payload=script;sl.len=script.length;
const rep=writeGil(g,output,{label:'610 tutorial keyword colors and win result',expectRecs:g.recs.length+added.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 if(new Set(t.recs.map(r=>r.id)).size!==t.recs.length)return 'duplicate id';
 const m=new Map(t.recs.map(r=>[r.name,r]));
 if(m.get('win.result').parentId!==R('win').id)return 'win parent';
 for(const [suffix,y,parts] of specs){for(let i=0;i<parts.length;i++){
  const r=m.get('td.l1.page.3.'+suffix+(i?'.key610.'+i:''));
  if(text(r)!==parts[i])return 'text mismatch';
  const color=Number(prop(r).sub.find(f=>f.field===504&&f.wt===0).num);
  if(color!==((i===1||i===3)?GOLD:BODY))return 'color mismatch';
 }}return true;
}});
const changed=rep.g2.recs.filter(r=>original.has(r.id)&&!original.get(r.id).equals(encodeMsg([r.field]))).map(r=>r.name);
console.log(JSON.stringify({records:rep.g2.recs.length,added:added.map(r=>r.name),changed}));
