import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||fs.existsSync(output))throw Error('missing arguments or output exists');
const g=readGil(input), original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])), script=Buffer.from(findScriptLeaf(g).buf);
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const image=r=>nodes(r.field,[505,503,84])[0];
const layers=(t,id)=>{const c=t.recs.find(r=>r.parentId===id);return t.recs.filter(r=>r.parentId===c.id).sort((a,b)=>a.index-b.index);};
const tops=g.recs.filter(r=>r.name==='furn.plant.2'&&(r.parentId==null||r.parentId===1073741844));
if(tops.length!==2)throw Error('template pair missing');
const changed=new Set();
for(const top of tops){const a=layers(g,top.id),r=a[0],im=image(r);if(a.length!==26||Number(im.sub.find(f=>f.field===502).num)!==0x18514c43)throw Error('593 baseline mismatch');
// Local y points upward. Ellipse long axis follows lower-left to upper-right.
for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),18,-30.5);setPair(pairOf(s,505),69,14);let rot=s.sub.find(f=>f.field===508);if(!rot){rot={field:508,wt:2,sub:[],payload:null};s.sub.push(rot);}rot.sub=[{field:3,wt:5,f:30}];rot.payload=null;rot.len=5;}changed.add(r.id);}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const rep=writeGil(g,output,{label:'594 plant upper-right elongated cast shadow',expectRecs:g.recs.length,assert(t){const seen=new Set();for(const r of t.recs){if(seen.has(r.id))return 'duplicate id';seen.add(r.id);if(!(expected.get(r.id)||original.get(r.id))?.equals(encodeMsg([r.field])))return 'unexpected record '+r.id;}if(!findScriptLeaf(t).buf.equals(script))return 'script changed';for(const top of tops){const a=layers(t,top.id);if(a.length!==26)return 'layer count';for(const s of stateBlocks(a[0].field.sub,[])){if(pairValue(pairOf(s,504),0)!==18||pairValue(pairOf(s,504),1)!==-30.5||pairValue(pairOf(s,505),0)!==69||pairValue(pairOf(s,505),1)!==14||s.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f!==30)return 'geometry mismatch';}}return true;}});
console.log(JSON.stringify({records:rep.g2.recs.length,changedRecords:changed.size,shadow:{x:18,y:-30.5,w:69,h:14,rotation:30,alpha:24/255},contactAndPlantBodyUnchanged:true,scriptUnchanged:true}));
