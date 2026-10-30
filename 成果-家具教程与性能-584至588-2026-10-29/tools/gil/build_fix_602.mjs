import fs from 'node:fs';
import {readGil,cloneField,bigIds,textsOf,findChildListTop,asIdList,setChildList,stateBlocks,pairOf,setPair} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,scriptPath]=process.argv.slice(2);
if(!input||!output||!scriptPath||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.id,r]));let max=BigInt(g.maxId);
const stage=g.recs.find(r=>r.name==='stage');if(!stage)throw Error('stage');
function holder(id){const stack=[g.tree];while(stack.length){const a=stack.pop();for(let i=0;i<a.length;i++){const f=a[i];if(!f.sub)continue;if(bigIds(f.sub,[])[0]?.num===BigInt(id))return {a,i};stack.push(f.sub);}}throw Error('holder');}
function parent(r,p){let f=r.field.sub.find(f=>f.field===504&&f.wt===0);if(!f)r.field.sub.push(f={field:504,wt:0});f.num=BigInt(p.id);}
function clone(proto,p,name){const f=cloneField(proto.field),id=Number(++max);function walk(a,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(proto.id))q.num=BigInt(id);if(q.sub)walk(q.sub,d+1);}}walk(f.sub);const t=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);if(!t)throw Error('name');t.payload=Buffer.from(name);t.len=t.payload.length;const r={id,name,field:f};parent(r,p);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const h=holder(proto.id);h.a.splice(h.i+1,0,f);by.set(id,r);return r;}
function geo(r,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),0,0);setPair(pairOf(s,505),w,h);}}
const contents=[1073741888,1073741886].map(id=>by.get(id));
const faces=contents.map(p=>{const cl=findChildListTop(p.field.sub),ids=asIdList(cl.payload,true);const face=by.get(ids.find(id=>by.get(id).name==='face'));if(!face)throw Error('face');setChildList(cl,ids.filter(id=>id!==face.id));return face;});
const floors=clone(contents[0],stage,'board.floors'),rugs=clone(contents[0],stage,'board.rugs');geo(floors,584,584);geo(rugs,584,584);
const slots=[];
for(let r=1;r<=6;r++)for(let c=1;c<=6;c++){const slot=clone(contents[0],floors,`floor.cell.${r}.${c}`);geo(slot,0,0);const ix=slots.length;const f=ix<2?faces[ix]:clone(faces[0],slot,'face');parent(f,slot);geo(f,0,0);setChildList(findChildListTop(slot.field.sub),[f.id]);slots.push(slot.id);}
setChildList(findChildListTop(floors.field.sub),slots);
const cl=findChildListTop(stage.field.sub),ids=asIdList(cl.payload,true);setChildList(cl,[...ids,floors.id,rugs.id]);
const script=fs.readFileSync(scriptPath);if(!script.includes(Buffer.from('_spawn_whole_rug')))throw Error('missing implementation');const leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'602 fixed board layers and intact rugs',expectRecs:g.recs.length+72,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script';const m=new Map(t.recs.map(r=>[r.id,r]));if(m.size!==t.recs.length)return 'duplicate ID';for(const p of contents){const ch=asIdList(findChildListTop(m.get(p.id).field.sub).payload,true);if(ch.some(id=>m.get(id).name==='face'))return 'duplicate floor';}for(const id of slots){const ch=asIdList(findChildListTop(m.get(id).field.sub).payload,true);if(ch.length!==1||m.get(ch[0]).name!=='face')return 'slot';}return true;}});console.log('602 records='+rep.g2.recs.length);
