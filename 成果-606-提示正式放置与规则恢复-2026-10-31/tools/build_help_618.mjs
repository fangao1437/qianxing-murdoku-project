import fs from 'node:fs';
import {readGil,cloneField,encodeMsg,stateBlocks} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),script=Buffer.from(findScriptLeaf(g).buf);
const target=g.recs.find(r=>r.name==='clues.help617'),proto=g.recs.find(r=>r.name==='td.home.page.1.ico.submit.bg');
if(!target||!proto)throw Error('missing controls');
const geometry=stateBlocks(target.field.sub,[]).map(s=>encodeMsg([s]));
const parts=proto.field.sub.filter(q=>q.field===505&&q.sub?.some(x=>[83,84].includes(x.field))).map(cloneField);
if(parts.length!==2)throw Error('image components');
function remap(a){for(const q of a){if(q.num===BigInt(proto.id))q.num=BigInt(target.id);if(q.sub)remap(q.sub);}}
for(const p of parts)remap(p.sub);
const image=parts.flatMap(p=>p.sub.filter(x=>x.field===503)).flatMap(p=>p.sub.filter(x=>x.field===84))[0];
function num(p,k,v){let q=p.sub.find(x=>x.field===k&&x.wt===0);if(!q)p.sub.push(q={field:k,wt:0});q.num=BigInt(v);}
num(image,502,0xFFFFFFFF);num(image,503,100113);num(image,504,1);
const index=target.field.sub.findIndex(q=>q.field===505&&q.sub?.some(x=>x.field===74));
if(index<0)throw Error('text component');
target.field.sub.splice(index,1,...parts);
const report=writeGil(g,output,{label:'618 help image 100113',expectRecs:g.recs.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';
 const changes=t.recs.filter(r=>!before.get(r.id)?.equals(encodeMsg([r.field])));
 if(changes.length!==1||changes[0].id!==target.id)return 'unexpected changes';
 const r=changes[0];if(r.name!=='clues.help617'||r.parentId!==target.parentId)return 'identity mismatch';
 const states=stateBlocks(r.field.sub,[]);if(states.length!==geometry.length||states.some((s,i)=>!encodeMsg([s]).equals(geometry[i])))return 'geometry mismatch';
 const props=r.field.sub.filter(q=>q.field===505).flatMap(q=>q.sub.filter(x=>x.field===503)).flatMap(q=>q.sub);
 if(props.some(q=>q.field===75))return 'text remains';
 if(!props.some(q=>q.field===84&&q.sub.some(x=>x.field===503&&x.num===100113n)))return 'image mismatch';
 if(!script.toString().includes('clues.help617'))return 'binding absent';
 return true;
}});
console.log(JSON.stringify({records:report.g2.recs.length,changed:['clues.help617'],image:100113,geometryUnchanged:true,scriptUnchanged:true}));
