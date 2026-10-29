import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,cloneField,textsOf,stateBlocks,pairOf,pairValue,setPair,findChildListTop,setChildList,asIdList} from './gilread.mjs';
import {writeGil} from './gilwrite.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const g=readGil(path.join(root,'585.gil')), out=process.argv[2];
if(!out)throw Error('output required');
const src=g.recs.find(r=>r.name==='furn.plant.2'&&r.parentId==null);
const things=g.recs.find(r=>r.name==='things');
const ref=g.recs.find(r=>r.name==='furn.plant.2'&&r.parentId===things.id);
if(!src||!ref)throw Error('plant source/reference missing');
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const refs=nodes(ref.field,[505,503,77]).flatMap(n=>n.sub.filter(f=>f.field===501&&f.wt===0));
if(refs.length!==1)throw Error('reference ambiguous');refs[0].num=BigInt(src.id);
const proto=g.recs.find(r=>r.name==='td.l1.btn.next');
let next=g.maxId+1;const added=[];
// Populate the editor-created, registered empty source/master using the previous 29-layer art.
const art=readGil(path.join(root,'585-家具外观与教程交互-v363.gil'));
const oldsrc=art.recs.find(r=>r.name==='furn.plant.2'&&r.parentId==null);
const oldcontainer=art.recs.find(r=>r.parentId===oldsrc.id);
const layers=art.recs.filter(r=>r.parentId===oldcontainer.id).sort((a,b)=>a.index-b.index);
if(layers.length!==29)throw Error('expected 29 plant art layers');
let artAdded=0;
for(const top of g.recs.filter(r=>r.name==='furn.plant.2'&&(r.parentId==null||r.parentId===1073741844))){
 const container=g.recs.find(r=>r.parentId===top.id);if(!container||g.recs.some(r=>r.parentId===container.id))throw Error('plant container not empty');
 const ids=[];
 for(const old of layers){const id=next++, f=cloneField(old.field);ids.push(id);
  function map(fs){for(const v of fs){if(v.wt===0){if(v.num===BigInt(old.id))v.num=BigInt(id);else if(v.num===BigInt(oldcontainer.id))v.num=BigInt(container.id);}if(v.sub)map(v.sub);}}map(f.sub);g.recHolder.push(f);artAdded++;
 }
 let cl=findChildListTop(container.field.sub);if(!cl){cl={field:503,wt:2,sub:null,payload:Buffer.alloc(0),len:0};container.field.sub.push(cl);}setChildList(cl,ids);
 for(const s of stateBlocks(container.field.sub,[])){setPair(pairOf(s,504),0,0);setPair(pairOf(s,505),108,108);}
}

for(const card of g.recs.filter(r=>/^td\.l[12]\.page\.\d+\.step\.\d+$/.test(r.name||''))){
 const id=next++, f=cloneField(proto.field), name=card.name.replace('.step.','.stephit.');
 function remap(fs){for(const v of fs){if(v.wt===0&&v.num===BigInt(proto.id))v.num=BigInt(id);if(v.sub)remap(v.sub);}}remap(f.sub);
 const p=f.sub.find(v=>v.field===504&&v.wt===0);p.num=BigInt(card.parentId);
 for(const t of textsOf(f.sub,[]))if(t.payload?.toString()===proto.name){t.payload=Buffer.from(name);t.len=t.payload.length;}
 const st=stateBlocks(card.field.sub,[])[0];for(const s of stateBlocks(f.sub,[]))for(const n of [502,503,504,505,506]){const a=pairOf(st,n),b=pairOf(s,n);if(a&&b)setPair(b,pairValue(a,0),pairValue(a,1));}
 const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);
 g.recHolder.push(f);const parent=g.recs.find(r=>r.id===card.parentId);const pcl=findChildListTop(parent.field.sub);setChildList(pcl,[...asIdList(pcl.payload,true),id]);
 added.push({id,name,parent:card.parentId});
}
if(added.length!==80)throw Error('expected 80 step hits, got '+added.length);
writeGil(g,out,{expectRecs:g.recs.length+added.length+artAdded,label:'v364 plant reference and real step buttons',assert(g2){
 const rr=g2.recs.find(r=>r.id===ref.id);if(Number(nodes(rr.field,[505,503,77,501])[0]?.num)!==src.id)return 'plant reference wrong';
 for(const a of added){const r=g2.recs.find(r=>r.id===a.id);if(!r||r.name!==a.name||r.parentId!==a.parent||nodes(r.field,[505,503,81]).length!==1)return 'button invalid '+a.name;}
 return true;
}});
console.log(JSON.stringify({plantSource:src.id,reference:ref.id,buttons:added.length}));
