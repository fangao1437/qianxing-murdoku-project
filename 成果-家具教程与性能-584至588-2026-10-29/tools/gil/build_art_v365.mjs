// v366: reuse formal home furniture; outlined pot, original leaf shape, restore chair shading.
// Usage: node tools/gil/build_art_v365.mjs <587.gil> <out.gil>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,stateBlocks,pairOf,pairValue,setPair,findChildListTop,setChildList,asIdList,cloneField} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('usage: <587.gil> <out.gil>');
const art=JSON.parse(fs.readFileSync(path.join(here,'art_v365.json'),'utf8'));
const g=readGil(input), original=readGil(path.join(here,'../../584-加载与操作延迟优化-v362.gil'));
const kids=(a,r)=>a.recs.filter(c=>c.parentId===r.id).sort((a,b)=>a.index-b.index);
const layers=(a,t)=>kids(a,kids(a,t)[0]);
const nodes=(f,ns)=>ns.reduce((a,no)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===no)),[f]);
const leaf=(n,no)=>n.sub.find(f=>f.field===no&&f.wt===0);
const put=(n,no,v)=>{let f=leaf(n,no);if(!f)n.sub.push(f={field:no,wt:0,num:0n});f.num=BigInt(v>>>0);};
function apply(r,[id,color,w,h,x,y,rot=0]){
 for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);let f=s.sub.find(f=>f.field===508);if(!f)s.sub.push(f={field:508,wt:2,sub:[],payload:null});f.sub=rot?[{field:3,wt:5,f:rot}]:[];f.payload=null;f.len=rot?5:0;}
 const im=nodes(r.field,[505,503,84])[0];put(im,503,id);put(im,502,color);put(im,504,1);
}
function data(r){const im=nodes(r.field,[505,503,84])[0],s=stateBlocks(r.field.sub,[])[0];return [Number(leaf(im,503).num),Number(leaf(im,502).num),pairValue(pairOf(s,505),0),pairValue(pairOf(s,505),1),pairValue(pairOf(s,504),0),pairValue(pairOf(s,504),1),s.sub.find(f=>f.field===508)?.sub?.find(f=>f.field===3)?.f||0];}
const del=new Set(),targetIds=new Set(),before=g.recs.length;
for(const id of [1073747134,1073747150]){
 const top=g.recs.find(r=>r.id===id),old=original.recs.find(r=>r.id===id),L=layers(g,top),O=layers(original,old);
 if(L.length!==132||O.length!==132)throw Error('chair baseline mismatch');
 L.forEach((r,i)=>{targetIds.add(r.id);if(art.chairRemove.includes(i))del.add(r.id);else apply(r,data(O[i]));});
}
const plantTops=g.recs.filter(r=>r.name==='furn.plant.2'&&(r.parentId==null||r.parentId===1073741844));
if(plantTops.length!==2)throw Error('plant source/master missing');
for(const top of plantTops){const L=layers(g,top);if(L.length!==29)throw Error('plant baseline mismatch');L.forEach((r,i)=>{targetIds.add(r.id);if(i<art.plant2.length)apply(r,art.plant2[i]);else del.add(r.id);});}
for(const r of g.recs)if(/^td\.home\.board\.svg\.(3[3-9]|4[0-4])$/.test(r.name||''))del.add(r.id);
for(const r of g.recs){const cl=findChildListTop(r.field.sub);if(cl){const ids=asIdList(cl.payload,true)||[];if(ids.some(id=>del.has(id)))setChildList(cl,ids.filter(id=>!del.has(id)));}}
const holders=new Map();for(const r of g.recs.filter(r=>del.has(r.id))){if(!holders.has(r.holder))holders.set(r.holder,[]);holders.get(r.holder).push(r);}for(const [holder,rs] of holders)for(const r of rs.sort((a,b)=>b.index-a.index))holder.splice(r.index,1);
writeGil(g,output,{expectRecs:before-del.size,label:'v366 home furniture and clean art',assert(g2){
 const ids=new Set();for(const r of g2.recs){if(ids.has(r.id))return 'duplicate id';ids.add(r.id);if(del.has(r.id))return 'deleted layer remains';}
 for(const r of g2.recs){if(r.parentId!=null&&!ids.has(r.parentId)&&g.recs.some(old=>old.id===r.parentId))return 'new missing parent '+r.id;const cl=findChildListTop(r.field.sub);if(cl&&(asIdList(cl.payload,true)||[]).some(id=>del.has(id)))return 'dangling removed child';}
 for(const [a,b,n]of [[1073747134,1073747150,123],[plantTops[0].id,plantTops[1].id,25]]){const A=layers(g2,g2.recs.find(r=>r.id===a)),B=layers(g2,g2.recs.find(r=>r.id===b));if(A.length!==n||B.length!==n)return 'layer count';if(JSON.stringify(A.map(data))!==JSON.stringify(B.map(data)))return 'source/master mismatch';for(const r of A){const d=data(r);if(!d[0]||!(d[1]>>>24)||d[2]<=0||d[3]<=0)return 'empty layer';}}
 if(!findScriptLeaf(g2).buf.equals(findScriptLeaf(readGil(input)).buf))return 'script changed in art pass';return true;
}});
console.log(JSON.stringify({removed:del.size,chairLayers:123,plantLayers:25,homeStaticRemoved:12}));
