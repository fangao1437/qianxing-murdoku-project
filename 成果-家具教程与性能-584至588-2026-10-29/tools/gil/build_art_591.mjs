import fs from 'node:fs';
import path from 'node:path';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,preview]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('input/output missing or output exists');
const g=readGil(input), original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf);
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const image=r=>nodes(r.field,[505,503,84])[0];
const layers=(t,id)=>{const c=t.recs.find(r=>r.parentId===id);return t.recs.filter(r=>r.parentId===c.id).sort((a,b)=>a.index-b.index);};
function data(r){const s=stateBlocks(r.field.sub,[])[0],im=image(r);return {c:Number(im.sub.find(f=>f.field===502)?.num||0),x:pairValue(pairOf(s,504),0),y:pairValue(pairOf(s,504),1),w:pairValue(pairOf(s,505),0),h:pairValue(pairOf(s,505),1),rot:s.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f||0};}
const A=layers(g,1073747134),B=layers(g,1073747150),before=A.map(data);
if(A.length!==123||JSON.stringify(before)!==JSON.stringify(B.map(data)))throw Error('baseline mismatch');
// Local boundary corrections, not a global opacity pass. Coordinates are chair-local.
const edits={
3:{x:-34.3,y:-26,w:6.2,h:29,c:0x82b7a07b},4:{x:-34.4,y:-29,w:4.5,h:26,c:0x40b7a07b},9:{x:-32.6,y:-33,w:4.4,h:16,c:0x56b49d77},
26:{x:-33.7,y:-17,w:18,h:3.2,c:0x82b29a73},39:{x:-33.2,w:3.1,h:14},51:{x:-32.1,w:23,h:2.3,c:0x80b09972},
44:{x:28.1,y:16.1,w:27,h:2.4,c:0x78ae9671},46:{x:-24.5,w:22.8,h:2.5,c:0x86af9770},58:{w:16,h:2.8,c:0x78b39b74},59:{x:26,w:2.7,h:15,c:0x78ad9570},62:{w:2.4,h:17,c:0x80b09873},
73:{x:-29.3,y:4.4,w:3.2,h:10,c:0x78bca780},118:{x:-31.9,y:-2.8,w:1.3,h:10,c:0x70b09872},122:{x:-28.1,y:8.4,w:1.3,h:5.4,c:0x80b29b75},
5:{w:29,h:11.6,c:0xd8e6e2d5},24:{w:11.5,h:10.2,c:0xe0e6dfce},28:{w:10.6,h:13,c:0xd0e6e0ce},57:{w:8,h:6.6},63:{w:6.1,h:7.1},
8:{w:10.3,h:19,c:0xe4e6e2d2},13:{w:21.7,h:10,c:0xc0e6e2d5},31:{w:10,h:12.3,c:0xd4e6dfcf},43:{w:9.8,h:12.5,c:0xb8e6e0d0},
55:{x:1.4,y:1.7,w:1.9,h:36,c:0x88b09871},91:{w:11.7,h:1.5,c:0x98b09872},110:{w:7.2,h:2,c:0x86b09974},87:{x:-20.5,y:-23.4,w:5.4,h:3.8,c:0x50b49c76},
84:{x:21.2,y:-19.2,w:17.6,h:1.8,c:0x80af9771},89:{x:21.1,y:-20,w:1.4,h:16.8,c:0x80af9771},96:{x:24,y:-23.5,w:6.8,h:1.6,c:0x8cb29a73},54:{x:22.4,y:-26.3,w:20.8,h:2.2,c:0x88b19973},
16:{x:33.4,y:-23.6,w:3.8,h:18,c:0x98b39b75},60:{x:33.4,y:-11.7,w:16.4,h:2.3,c:0x84b09873},86:{x:33.4,y:-12,w:2.9,h:3.5,c:0x90b39b76},
6:{x:32.8,y:-28,w:20.8,h:5.8,c:0x80b29b76},25:{x:30.7,y:-35,w:4.6,h:16.8,c:0x78b39c77},65:{x:30.5,y:-35.5,w:4.4,h:6.4,c:0x50b39c77},49:{x:26,y:-38,w:3.2,h:11.8,c:0x86b29b76},66:{x:20.5,y:-39.5,w:2.8,h:10.6,c:0x72b39c77},
19:{w:14.8,h:9.6,c:0xd8e6e2d5},20:{y:-34.8,w:8.5,h:20.4,c:0xc8e6e2d0},30:{w:8,h:11.5},47:{w:15,h:6.8,c:0xc4e6dece},61:{w:9.8,h:6.8,c:0xc8e6e2d2},
2:{y:-35.2,w:54,h:8.4,c:0xd0e6e4d8},37:{x:-18.9,y:-39.5,w:25,h:2.6,c:0x72b49d78},52:{x:-22,y:-39.1,w:4.4,h:8,c:0x48b49d78},93:{x:-25.3,y:-36.8,w:11.4,h:1.5,c:0x74b49d78},21:{x:2.3,y:-39.6,w:35,h:3.8,c:0x68b7a17e},120:{c:0x00b39b75}
};
const changed=new Set();
for(const list of[A,B])for(const [i,e]of Object.entries(edits)){const r=list[+i],d={...data(r),...e};if(Number(image(r).sub.find(f=>f.field===503)?.num)!==100002)throw Error('not ellipse');image(r).sub.find(f=>f.field===502).num=BigInt(d.c>>>0);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),d.x,d.y);setPair(pairOf(s,505),d.w,d.h);}changed.add(r.id);}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const rep=writeGil(g,output,{label:'591 local chair boundary and color repairs',expectRecs:g.recs.length,assert(t){const ids=new Set();for(const r of t.recs){if(ids.has(r.id))return 'duplicate';ids.add(r.id);if(!(expected.get(r.id)||original.get(r.id))?.equals(encodeMsg([r.field])))return 'unexpected record '+r.id;}if(!findScriptLeaf(t).buf.equals(script))return 'script changed';if(JSON.stringify(layers(t,1073747134).map(data))!==JSON.stringify(layers(t,1073747150).map(data)))return 'template mismatch';return true;}});
if(preview){const svg=rows=>`<svg viewBox="-54 -54 108 108" xmlns="http://www.w3.org/2000/svg">${rows.map(d=>`<ellipse cx="${d.x}" cy="${-d.y}" rx="${d.w/2}" ry="${d.h/2}" transform="rotate(${-d.rot} ${d.x} ${-d.y})" fill="#${(d.c&0xffffff).toString(16).padStart(6,'0')}" fill-opacity="${(d.c>>>24)/255}"/>`).join('')}</svg>`;fs.mkdirSync(path.dirname(preview),{recursive:true});fs.writeFileSync(preview,`<!doctype html><meta charset="utf-8"><title>591 椅子局部边界修整</title><style>body{font:18px sans-serif;background:#f5f2eb;padding:20px}main{display:flex;gap:24px}.art{width:432px;height:432px;background:#d4c8bc}.small{width:108px;height:108px;background:#d4c8bc}svg{width:100%;height:100%}</style><h1>椅子边界与染色对照</h1><p>图元近似预览，非游戏引擎实拍</p><main>${[[before,'590'],[layers(rep.g2,1073747134).map(data),'591']].map(([d,t])=>`<section><h2>${t}</h2><div class="art">${svg(d)}</div><h3>原尺寸</h3><div class="small">${svg(d)}</div></section>`).join('')}</main>`);}
console.log(JSON.stringify({records:rep.g2.recs.length,changedRecords:changed.size,editedLayers:Object.keys(edits).length,scriptUnchanged:true,sourceMasterEqual:true}));
