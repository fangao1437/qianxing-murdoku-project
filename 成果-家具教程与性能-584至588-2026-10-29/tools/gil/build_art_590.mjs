// 589 -> 590: soften overlapping chair shadows; preserve script and unrelated records.
import fs from 'node:fs';
import path from 'node:path';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,preview]=process.argv.slice(2);
if(!input||!output)throw Error('usage: input output [preview.html]');
if(fs.existsSync(output))throw Error('output already exists');
const g=readGil(input),original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const image=r=>nodes(r.field,[505,503,84])[0];
const val=(im,n)=>Number(im.sub.find(f=>f.field===n&&f.wt===0)?.num??0);
const layers=(tree,id)=>{const c=tree.recs.find(r=>r.parentId===id);return tree.recs.filter(r=>r.parentId===c.id).sort((a,b)=>a.index-b.index);};
function data(r){const s=stateBlocks(r.field.sub,[])[0],im=image(r);return {color:val(im,502),img:val(im,503),x:pairValue(pairOf(s,504),0),y:pairValue(pairOf(s,504),1),w:pairValue(pairOf(s,505),0),h:pairValue(pairOf(s,505),1),rot:s.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f||0};}
const a=layers(g,1073747134),b=layers(g,1073747150);
if(a.length!==123||JSON.stringify(a.map(data))!==JSON.stringify(b.map(data)))throw Error('chair baseline mismatch');
const before=a.map(data);
// index -> [ARGB, width multiplier, height multiplier]. Broad shade becomes translucent;
// narrow structural outlines remain untouched except the overlapping lower-left junction.
const edits=new Map([
 [3,[0x80bba37d,.90,1]], [4,[0x58b39a76,.82,.97]], [9,[0x72ad936c,.85,.94]],
 [26,[0x94ae9671,1,1]], [39,[0x78b19a76,.92,1]],
 [37,[0x68ad9775,1,.87]], [52,[0x62b09a76,.88,.92]], [93,[0x72ad9672,1,.88]],
 [75,[0x82a88f69,1,1]], [87,[0x589e845f,1,1]],
 [6,[0x99ac936d,1,1]], [25,[0x78b19a76,1,1]], [65,[0x66ad9570,1,1]],
 [49,[0x9aab936e,1,1]], [66,[0x7eae9773,1,1]],
 [21,[0x4eb39c77,1,1]], [120,[0x58b39b75,1,1]]
]);
const changed=new Set();
for(const list of [a,b])for(const [i,[color,fw,fh]] of edits){const r=list[i],d=data(r),im=image(r);if(d.img!==100002)throw Error('expected ellipse');im.sub.find(f=>f.field===502&&f.wt===0).num=BigInt(color>>>0);for(const s of stateBlocks(r.field.sub,[])){const p=pairOf(s,505);setPair(p,pairValue(p,0)*fw,pairValue(p,1)*fh);}changed.add(r.id);}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const script=Buffer.from(findScriptLeaf(g).buf);
const report=writeGil(g,output,{label:'590 chair shadow refinement',expectRecs:g.recs.length,assert(g2){
 const ids=new Set();for(const r of g2.recs){if(ids.has(r.id))return 'duplicate id';ids.add(r.id);const want=expected.get(r.id)||original.get(r.id);if(!want||!want.equals(encodeMsg([r.field])))return 'unexpected record '+r.id;}
 if(!findScriptLeaf(g2).buf.equals(script))return 'embedded script changed';
 if(JSON.stringify(layers(g2,1073747134).map(data))!==JSON.stringify(layers(g2,1073747150).map(data)))return 'source/master mismatch';
 return true;
}});
if(preview){
 const after=layers(report.g2,1073747134).map(data);
 const svg=rows=>`<svg viewBox="-54 -54 108 108" xmlns="http://www.w3.org/2000/svg">${rows.map(d=>`<ellipse cx="${d.x}" cy="${-d.y}" rx="${d.w/2}" ry="${d.h/2}" transform="rotate(${-d.rot} ${d.x} ${-d.y})" fill="#${(d.color&0xffffff).toString(16).padStart(6,'0')}" fill-opacity="${(d.color>>>24)/255}"/>`).join('')}</svg>`;
 fs.mkdirSync(path.dirname(preview),{recursive:true});
 fs.writeFileSync(preview,`<!doctype html><meta charset="utf-8"><title>椅子阴影修整对照</title><style>body{font:18px sans-serif;background:#f5f1eb;padding:28px}main{display:flex;gap:36px}.art{background:#d4c8bc;width:324px;height:324px}.small{background:#d4c8bc;width:108px;height:108px}svg{width:100%;height:100%}</style><h1>椅子阴影修整对照</h1><p>图元近似预览：按存档椭圆、颜色、透明度和旋转重建，非游戏引擎实拍。</p><main>${[[before,'589 原版'],[after,'590 修整']].map(([rows,title])=>`<section><h2>${title}</h2><div class="art">${svg(rows)}</div><p>原尺寸</p><div class="small">${svg(rows)}</div></section>`).join('')}</main>`);
}
console.log(JSON.stringify({records:report.g2.recs.length,changedRecords:changed.size,layersPerChair:a.length,scriptUnchanged:true,sourceMasterEqual:true}));
