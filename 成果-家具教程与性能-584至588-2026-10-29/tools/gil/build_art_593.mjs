import fs from 'node:fs';
import path from 'node:path';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg,cloneField,findChildListTop,setChildList,asIdList} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,preview]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('missing arguments or output exists');
const g=readGil(input), original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])), script=Buffer.from(findScriptLeaf(g).buf);
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const image=r=>nodes(r.field,[505,503,84])[0];
const layers=(t,id)=>{const c=t.recs.find(r=>r.parentId===id);return t.recs.filter(r=>r.parentId===c.id).sort((a,b)=>a.index-b.index);};
function data(r){const s=stateBlocks(r.field.sub,[])[0],im=image(r);return {img:Number(im.sub.find(f=>f.field===503).num),c:Number(im.sub.find(f=>f.field===502).num),x:pairValue(pairOf(s,504),0),y:pairValue(pairOf(s,504),1),w:pairValue(pairOf(s,505),0),h:pairValue(pairOf(s,505),1),rot:s.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f||0};}
function apply(r,x,y,w,h,c){const im=image(r);im.sub.find(f=>f.field===502).num=BigInt(c);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);const rot=s.sub.find(f=>f.field===508);if(rot){rot.sub=[];rot.payload=null;rot.len=0;}}}
const tops=g.recs.filter(r=>r.name==='furn.plant.2'&&(r.parentId==null||r.parentId===1073741844));
if(tops.length!==2)throw Error('template pair missing');
const before=layers(g,tops[0].id).map(data), changed=new Set(), added=[];let next=g.maxId+1;
for(const top of tops){const a=layers(g,top.id),container=g.recs.find(r=>r.parentId===top.id),base=a[0];if(a.length!==25||data(base).img!==100002)throw Error('unexpected plant');
 const f=cloneField(base.field),id=next++;
 function remap(fields){for(const q of fields){if(q.wt===0&&q.num===BigInt(base.id))q.num=BigInt(id);if(q.sub)remap(q.sub);}}remap(f.sub);
 const contact={id,field:f};apply(contact,1,-40.5,30,6,0x1b514c43);
 // Broad soft-light footprint: rightward bias; small opaque-area budget, no leaf replicas.
 apply(base,7,-40.5,53,14,0x18514c43);
 const cl=findChildListTop(container.field.sub),ids=asIdList(cl.payload,true);if(ids[0]!==base.id)throw Error('unexpected draw order');
 setChildList(cl,[base.id,id,...ids.slice(1)]);
 base.holder.splice(base.holder.indexOf(base.field)+1,0,f);
 changed.add(base.id);changed.add(container.id);added.push(id);
}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const report=writeGil(g,output,{label:'593 simple plant cast and contact shadows',expectRecs:g.recs.length+2,assert(t){const seen=new Set();for(const r of t.recs){if(seen.has(r.id))return 'duplicate';seen.add(r.id);if(added.includes(r.id))continue;if(!(expected.get(r.id)||original.get(r.id))?.equals(encodeMsg([r.field])))return 'unexpected change '+r.id;}if(!findScriptLeaf(t).buf.equals(script))return 'script changed';const A=layers(t,tops[0].id).map(data),B=layers(t,tops[1].id).map(data);if(A.length!==26||JSON.stringify(A)!==JSON.stringify(B))return 'pair mismatch';if(A[0].c!==0x18514c43||A[1].c!==0x1b514c43)return 'draw order mismatch';if(JSON.stringify(A.slice(2))!==JSON.stringify(before.slice(1)))return 'plant body changed';return true;}});
if(preview){const svg=rows=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-54 -54 108 108">${rows.map(d=>{const attrs=`fill="#${(d.c&0xffffff).toString(16).padStart(6,'0')}" fill-opacity="${(d.c>>>24)/255}" transform="rotate(${-d.rot} ${d.x} ${-d.y})"`;return d.img===100002?`<ellipse cx="${d.x}" cy="${-d.y}" rx="${d.w/2}" ry="${d.h/2}" ${attrs}/>`:`<rect x="${d.x-d.w/2}" y="${-d.y-d.h/2}" width="${d.w}" height="${d.h}" ${attrs}/>`;}).join('')}</svg>`;const after=layers(report.g2,tops[0].id).map(data);fs.mkdirSync(path.dirname(preview),{recursive:true});fs.writeFileSync(preview,`<!doctype html><meta charset="utf-8"><title>593 植物浅投影对照</title><style>body{font:16px sans-serif;background:#f9f2e9}main{display:flex;gap:24px}.big{width:324px;height:324px}.small{width:108px;height:108px}svg{width:100%;height:100%}.row{display:flex;gap:12px}</style><h1>植物简洁阴影 · 592 / 593</h1><p>左上柔光，右下浅投影；图元近似预览，非游戏实拍。</p><main>${[[before,'592'],[after,'593']].map(([a,n])=>`<section><h2>${n}</h2><div class="big" style="background:#d4c8bc">${svg(a)}</div><div class="row">${['#d4c8bc','#f9de9d','#b8cbd2'].map(c=>`<div class="small" style="background:${c}">${svg(a)}</div>`).join('')}</div></section>`).join('')}</main>`);}
console.log(JSON.stringify({records:report.g2.recs.length,changedExisting:changed.size,added:added.length,bodyUnchanged:true,scriptUnchanged:true,maxShadowAlpha:1-(1-24/255)*(1-27/255)}));
