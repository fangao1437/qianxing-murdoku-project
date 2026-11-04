import fs from 'node:fs';
import crypto from 'node:crypto';
import {readGil,encodeMsg,findChildListTop,asIdList,setChildList,textsOf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const apply=process.argv.includes('--apply');
const g=readGil('正式版633.gil');
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const original=Buffer.from(findScriptLeaf(g).buf);
const candidates=g.recs.filter(r=>/^td\.(home|l1|l2)\.page\./.test(r.name||'')&&text(r)===''&&!findChildListTop(r.field.sub)&&!original.includes(Buffer.from(r.name)));
console.log(JSON.stringify({scriptEqualsDist:original.equals(fs.readFileSync('dist/client_script.lua')),emptyText:candidates.map(r=>r.name),rows:g.recs.filter(r=>/^(what|who|letter)\.[12]\./.test(r.name||'')).map(r=>({name:r.name,text:text(r),strings:textsOf(r.field.sub,[]).map(t=>t.payload?.toString('utf8')).filter(Boolean)}))}));
if(apply){
 if(fs.existsSync('正式版634.gil'))throw Error('output exists');
 const ids=new Set(candidates.map(r=>r.id)),fields=new Set(candidates.map(r=>r.field)),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),parents=[];
 for(const r of g.recs){const cl=findChildListTop(r.field.sub);if(!cl)continue;const list=asIdList(cl.payload,true),keep=list.filter(id=>!ids.has(id));if(keep.length!==list.length){setChildList(cl,keep);parents.push(r.id);}}
 function prune(a){for(let i=a.length-1;i>=0;i--){if(fields.has(a[i]))a.splice(i,1);else if(a[i].sub)prune(a[i].sub);}}prune(g.tree);
 const script=fs.readFileSync('dist/client_script.lua');const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
 const expected=new Map(g.recs.filter(r=>!ids.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
 writeGil(g,'正式版634.gil',{label:'634 tutorial cleanup',expectRecs:expected.size,assert(t){return findScriptLeaf(t).buf.equals(script)||'script mismatch';}});
 const disk=readGil('正式版634.gil');for(const r of disk.recs){if(!expected.get(r.id)?.equals(encodeMsg([r.field])))throw Error('record mismatch '+r.name);const cl=findChildListTop(r.field.sub);if(cl&&asIdList(cl.payload,true).some(id=>ids.has(id)))throw Error('dangling child');}
 const report={removed:candidates.map(r=>({id:r.id,name:r.name})),parents,records:disk.recs.length,unchanged:disk.recs.filter(r=>before.get(r.id)?.equals(encodeMsg([r.field]))).length,scriptMatches:true,diskVerified:true,sha256:crypto.createHash('sha256').update(fs.readFileSync('正式版634.gil')).digest('hex')};fs.writeFileSync(process.env.FEIBO_TMP+'/cleanup634.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
