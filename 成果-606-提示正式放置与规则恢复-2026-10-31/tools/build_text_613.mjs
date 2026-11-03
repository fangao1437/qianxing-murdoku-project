// 612 -> 613: repair non-finite result transforms and give countdown labels safe line boxes.
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('invalid or existing output');
const g=readGil(input), script=fs.readFileSync('dist/client_script.lua');
const by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
const R=n=>{const r=by.get(n);if(!r)throw Error(n);return r;};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]);};
const touched=new Set(), labels=[];let repaired=0;
function place(r,x,y,w,h){touched.add(r.id);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}}
function num(p,k,n){let f=p.sub.find(f=>f.field===k&&f.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(n);}
function configure(r,size){const p=nodes(r.field,[505,503,75])[0];for(const [k,v] of [[502,0],[512,size],[513,size],[508,1],[509,1],[504,0xFFF9F2E9]])num(p,k,v);touched.add(r.id);labels.push(r);}
for(let i=1;i<=4;i++){
 const r=R(`select.card.${i}.result`),[x,y,w,h]=geo(R(`select.card.${i}`));
 for(const s of stateBlocks(r.field.sub,[])){
  for(const f of s.sub||[])if([501,502,503,506].includes(f.field))for(const q of f.sub||[])if(q.wt===5){if(!Number.isFinite(q.f))repaired++;q.f=f.field===501?1:0.5;}
 }
 place(r,x,y-h/2-46,Math.max(w,220),72);configure(r,16);
}
// Preserve the four-button menu layout, but reserve a full text line between settle and cancel.
{const r=R('modal.cancel'),[x,y,w,h]=geo(r);place(r,x,y-30,w,h);}
for(const id of ['settle.btn','result.settle','modal.settle']){
 const r=R(id+'.countdown'),[x,y,w,h]=geo(R(id));
 place(r,x,y-h/2-25,Math.max(w,220),40);configure(r,14);
}
const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'613 finite result transforms and safe countdown line boxes',expectRecs:g.recs.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 const m=new Map(t.recs.map(r=>[r.id,r]));
 for(const q of labels){const r=m.get(q.id);let bad=false;function walk(f){if(f.wt===5&&!Number.isFinite(f.f))bad=true;for(const z of f.sub||[])walk(z);}walk(r.field);if(bad)return 'nonfinite '+r.name;
 const p=nodes(r.field,[505,503,75])[0],v=k=>Number(p.sub.find(f=>f.field===k&&f.wt===0)?.num);if(v(512)!==v(513))return 'font bounds';
 for(const s of stateBlocks(r.field.sub,[]))if(pairValue(pairOf(s,505),1)<(r.name.endsWith('result')?72:40))return 'height';
 }
 for(const r of t.recs)if(!touched.has(r.id)&&!before.get(r.id)?.equals(encodeMsg([r.field])))return 'unexpected change '+r.name;
 const cm=new Map(t.recs.map(r=>[r.name,r]));
 for(const id of ['settle.btn','result.settle','modal.settle']){const [x,y,w,h]=geo(cm.get(id)),[lx,ly,lw,lh]=geo(cm.get(id+'.countdown'));if(Math.abs(lx-x)>.01||ly+lh/2>y-h/2-4)return 'countdown position';}
 const [cx,cy,cw,ch]=geo(cm.get('modal.cancel')),[lx,ly,lw,lh]=geo(cm.get('modal.settle.countdown'));if(cy+ch/2>ly-lh/2)return 'cancel overlap';
 return true;
}});
console.log(JSON.stringify({records:rep.g2.recs.length,repairedNonfinite:repaired,changed:rep.g2.recs.filter(r=>touched.has(r.id)).map(r=>r.name)}));
