// 615 -> 616: fill row.1.* / row.2.* clue text only (letter / who / what) plus the level-2 general clue.
// Layout, font, template and script are intentionally untouched: runtime only copies row text into the clue list.
import fs from 'node:fs';
import {readGil,cloneField,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output||input===output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),expected=new Map();
const R=n=>{const a=g.recs.filter(r=>r.name===n);if(a.length!==1)throw Error('ambiguous '+n);return a[0];};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const textNode=r=>nodes(r.field,[505,503,75,510,501])[0];
const text=r=>textNode(r)?.payload?.toString('utf8');
const seed=nodes(R('result.msg.1').field,[505,503,75,510])[0];
function txt(r,t){
 if(!textNode(r)){const p=nodes(r.field,[505,503,75])[0];if(!p||!seed)throw Error('not text '+r.name);p.sub=p.sub.filter(x=>x.field!==510);p.sub.push(cloneField(seed));}
 const f=textNode(r);f.payload=Buffer.from(t);f.len=f.payload.length;expected.set(r.id,t);
}
// letter = speaker letter, who = speaker, what = clue sentence ("A 值班保安 说 收藏家在第五列").
const rows=[
 [1,1,'A','值班保安','收藏家在第五列'],
 [1,2,'B','前台姑娘','旧识古董商在植物旁边'],
 [1,3,'C','夜班清洁工','只有值班保安站在地毯上'],
 [1,4,'D','旧识古董商','夜班清洁工站在椅子上'],
 [1,5,'V','收藏家','前台姑娘在桌子旁边'],
 [2,1,'A','夜班门卫','画廊助理在桌子旁边'],
 [2,2,'B','画廊助理','有两人坐在椅子上'],
 [2,3,'C','临时搬运工','夜班门卫在书架旁边'],
 [2,4,'D','鉴定师','随行记者在夜班门卫的上方（同一列）'],
 [2,5,'E','随行记者','只有随行记者在植物旁边'],
 [2,6,'V','馆长','我独自一人，且临时搬运工在我下方的不同区域中']
];
for(const [lv,i,letter,who,what] of rows){
 const suffix=`${lv}.${i}`,root=R('row.'+suffix);
 for(const [slot,t] of [['letter',letter],['who',who],['what',what]]){const r=R(slot+'.'+suffix);if(r.parentId!==root.id)throw Error('row mapping '+r.name);txt(r,t);}
}
const general=R('clue.2.1');if(general.parentId!==R('row.2.clue').id)throw Error('general mapping');txt(general,'地毯上没有人');
const script=Buffer.from(findScriptLeaf(g).buf);
const report=writeGil(g,output,{label:'616 first two levels row clue text only',expectRecs:g.recs.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script changed';
 for(const r of t.recs){
  if(expected.has(r.id)){if(text(r)!==expected.get(r.id))return 'text mismatch '+r.name;}
  else if(!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name;
 }
 return true;}});
console.log(JSON.stringify({records:report.g2.recs.length,textFields:expected.size,changedRecords:expected.size,layoutChanged:false,scriptUnchanged:true}));
