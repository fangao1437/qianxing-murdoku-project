import fs from 'node:fs';
import {readGil,cloneField,bigIds,textsOf,findChildListTop,asIdList,setChildList,stateBlocks,pairOf,pairValue,setPair} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,scriptPath]=process.argv.slice(2);
if(!input||!output||!scriptPath||input===output||fs.existsSync(output))throw Error('invalid arguments/output already exists');
const g=readGil(input), count=g.recs.length, script=fs.readFileSync(scriptPath);
const records=new Map(g.recs.map(r=>[r.id,r]));let max=BigInt(g.maxId);
function holder(id){const stack=[g.tree];while(stack.length){const arr=stack.pop();for(let i=0;i<arr.length;i++){const f=arr[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {arr,i};stack.push(f.sub);}}throw Error('holder '+id);}
function clone(proto,parent,name){const cf=cloneField(proto.field),id=Number(++max);bigIds(cf.sub,[])[0].num=BigInt(id);const t=textsOf(cf.sub,[]).find(f=>f.payload?.toString('utf8')===proto.name);if(!t)throw Error('name');t.payload=Buffer.from(name);t.len=t.payload.length;
let p=cf.sub.find(f=>f.field===504&&f.wt===0);if(!p){p={field:504,wt:0,num:0n};cf.sub.push(p);}p.num=BigInt(parent.id);
const cl=findChildListTop(cf.sub);if(cl)setChildList(cl,[]);
const h=holder(proto.id);h.arr.splice(h.i+1,0,cf);const r={id,name,field:cf};records.set(id,r);return r;}
const changes=[];
for(const id of [1073741888,1073741886]){
 const parent=records.get(id),cl=findChildListTop(parent.field.sub),ids=asIdList(cl.payload,true);
 const portrait=records.get(ids.find(x=>records.get(x).name==='portrait'));
 const face=clone(portrait,parent,'face');
 // Use a configured plain image for the room tint; runtime owns its tint/visibility.
 const walk=fs2=>{for(const f of fs2){if(f.field===84&&f.sub){for(const [k,v] of [[502,0xFFFFFFFF],[503,100001],[504,1]]){let q=f.sub.find(x=>x.field===k&&x.wt===0);if(!q)f.sub.push(q={field:k,wt:0,num:0n});q.num=BigInt(v);}}if(f.sub)walk(f.sub);}};walk(face.field.sub);
 const rug=clone(parent,parent,'rug_layer'),furn=clone(parent,parent,'furn');
 // Match the content origin and dimensions; clones retain the original anchor/pivot.
 for(const r of [rug,furn])for(const b of stateBlocks(r.field.sub,[]))setPair(pairOf(b,504),0,0);
 const names=['hint','portrait','wall.up','wall.down','wall.left','wall.right','door.up','door.down','door.left','door.right','x','note'];
 const ordered=[face.id];
 for(const n of names){if(n==='portrait')ordered.push(rug.id,furn.id);ordered.push(...ids.filter(x=>records.get(x).name===n));}
 ordered.push(...ids.filter(x=>!ordered.includes(x)));
 setChildList(cl,ordered);changes.push({parent:id,order:ordered.map(x=>records.get(x).name)});
}
const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'599 archive-owned furniture layers and verdict cleanup',expectRecs:count+6,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';for(const ch of changes){const r=t.recs.find(r=>r.id===ch.parent);const kids=asIdList(findChildListTop(r.field.sub).payload,true);const ns=kids.map(id=>t.recs.find(r=>r.id===id)?.name);if(JSON.stringify(ns)!==JSON.stringify(ch.order))return 'order mismatch';}return true;}});
console.log(JSON.stringify({records:rep.g2.recs.length,added:6,changes,scriptEmbedded:true}));
