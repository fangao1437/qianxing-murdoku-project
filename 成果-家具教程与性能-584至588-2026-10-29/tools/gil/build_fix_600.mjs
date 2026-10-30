import fs from 'node:fs';
import {readGil,findChildListTop,asIdList} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,scriptPath]=process.argv.slice(2);
if(!input||!output||!scriptPath||input===output||fs.existsSync(output))throw Error('invalid or existing output');
const g=readGil(input), script=fs.readFileSync(scriptPath), repairs=[];
const by=new Map(g.recs.map(r=>[r.id,r]));
for(const pid of [1073741888,1073741886]){
 const parent=by.get(pid), children=asIdList(findChildListTop(parent.field.sub).payload,true).map(id=>by.get(id));
 const portrait=children.find(r=>r.name==='portrait');
 for(const name of ['face','rug_layer','furn']){
  const r=children.find(r=>r.name===name);if(!r)throw Error('missing '+name);
  const old=BigInt(name==='face'?portrait.id:pid);let changed=0;
  function repair(arr,depth=0){for(const f of arr){
   // Direct field 504 is the real parent ID; nested self references must point to the clone.
   if(!(depth===0&&f.field===504)&&f.num===old){f.num=BigInt(r.id);changed++;}
   if(f.sub)repair(f.sub,depth+1);
  }}repair(r.field.sub);
  if(changed!==(name==='face'?7:6))throw Error('unexpected self reference count '+name+':'+changed);
  repairs.push({id:r.id,name,parent:pid,old:Number(old),changed});
 }
}
const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const result=writeGil(g,output,{label:'600 corrected clone identities and event-driven furniture visibility',expectRecs:g.recs.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 for(const x of repairs){const r=t.recs.find(r=>r.id===x.id);let bad=false,n=0;
 function check(arr,depth=0){for(const f of arr){if(!(depth===0&&f.field===504)&&f.num===BigInt(x.old))bad=true;if(f.num===BigInt(x.id))n++;if(f.sub)check(f.sub,depth+1);}}check(r.field.sub);
 if(bad||n!==x.changed+1)return 'invalid clone identity '+x.name;
 const p=r.field.sub.find(f=>f.field===504&&f.wt===0);if(p?.num!==BigInt(x.parent))return 'parent mismatch';
 }return true;
}});
console.log(JSON.stringify({records:result.g2.recs.length,repairs,scriptEmbedded:true}));
