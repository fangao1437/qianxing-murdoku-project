// 584 -> v363: preserve template geometry/counts, connect table legs, unify palettes,
// add plant appearance 2 as a real source/master pair and things reference.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,cloneField,findChildListTop,setChildList,asIdList,writeVarint,textsOf,stateBlocks,pairOf,pairValue} from './gilread.mjs';
import {setPair} from './gilread.mjs';
import {writeGil} from './gilwrite.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const input=path.join(ROOT,'584-加载与操作延迟优化-v362.gil');
const output=process.argv[2];if(!output)throw Error('output required');
const g=readGil(input), byId=new Map(g.recs.map(r=>[r.id,r]));
const children=r=>g.recs.filter(c=>c.parentId===r.id).sort((a,b)=>a.index-b.index);
const layers=id=>children(children(byId.get(id))[0]);
const nodes=(f,ns)=>ns.reduce((a,no)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===no)),[f]);
const image=r=>nodes(r.field,[505,503,84])[0];
const leaf=(n,no)=>n.sub.find(f=>f.field===no&&f.wt===0);
const put=(n,no,v)=>{let f=leaf(n,no);if(!f)n.sub.push(f={field:no,wt:0,num:0n});f.num=BigInt(v>>>0);};
const geometry=r=>{let s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(no=>[pairValue(pairOf(s,no),0),pairValue(pairOf(s,no),1)]);};
const edited=new Set();
function apply(r,L){const [id,color,w,h,x,y,rot=0]=L;for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);let f=s.sub.find(f=>f.field===508);if(!f)s.sub.push(f={field:508,wt:2,sub:[],payload:null});f.sub=rot?[{field:3,wt:5,f:rot}]:[];f.payload=null;f.len=rot?5:0;}let im=image(r);put(im,503,id);put(im,502,color);put(im,504,1);edited.add(r.id);}
// Legs are behind the tabletop: extend upwards with > 3px overlap while retaining bottom ends.
for(const [src,mst]of [[1073747137,1073747153],[1073747138,1073747154],[1073747139,1073747155]])for(const id of [src,mst]){
 const a=layers(id);if(a.length!==11)throw Error('unexpected table layer count');
 const [,rimY,,rimH]=geometry(a[10]);const bottom=rimY-rimH/2;
 for(const i of [1,2,3,4]){let r=a[i];let [x,y,w,h]=geometry(r);let low=y-h/2;let top=bottom+(i%2===1?5:3);apply(r,[Number(leaf(image(r),503).num),Number(leaf(image(r),502).num),w,top-low,x,(top+low)/2]);}
}
// Preserve shadows/alpha and outlines; close RGB variants collapse to a common material tone.
const palettes={chair:[0xFEF7E4,0xF4E9CF,0xE9D9B2,0xD9C08A,0xFBD592,0xBC9D69,0x705D3C,0x30291F],statue:[0xF3F3F5,0xE2E2E8,0xC9C9D2,0xB0B0BC,0x8E8E9A,0x727280,0x555560,0x3E3E48,0x24242A],shelf:[0xD0B0D9,0xE4CBE9,0xB49CC0,0xB2DBEB,0x9CCFE6,0xC7E7F2,0x1F1A14]};
for(const [kind,src,mst] of [['chair',1073747134,1073747150],['statue',1073747136,1073747152],['shelf',1073747140,1073747156]])for(const id of [src,mst])for(const r of layers(id)){
 let im=image(r),c=Number(leaf(im,502).num)>>>0, rgb=c&0xffffff;if(rgb<0x101010||Number(leaf(im,503).num)===106056)continue;
 let best=rgb,d0=Infinity;for(const p of palettes[kind]){let d=0;for(const s of [0,8,16])d+=(((rgb>>>s)&255)-((p>>>s)&255))**2;if(d<d0){d0=d;best=p;}}
 if(d0<=45**2){put(im,502,((c&0xff000000)|best)>>>0);edited.add(r.id);}
}
// 29 layers: terracotta pot + seven broad leaves, each with a stable opaque contour and midrib.
const P=[];const add=(id,c,w,h,x,y,rot=0)=>P.push([id,c,w,h,x,y,rot]);
add(106056,0x55000000,65,40,0,-31);add(100001,0xff643f2e,36,29,0,-25);add(100001,0xffdc8c57,30,25,0,-24);add(100001,0xffefab74,7,24,-9,-24);add(100002,0xff704632,46,18,0,-11);add(100002,0xfff2b17b,41,13,0,-10);add(100002,0xff47382b,32,8,0,-8);add(100001,0xff356747,5,30,0,5);
for(const [x,y,w,h,rot,c]of [[-20,13,17,43,-48,0xff62ae7c],[20,13,17,43,48,0xff72bc8e],[-13,30,17,43,-22,0xff79c89a],[13,30,17,43,22,0xff66b686],[0,39,17,44,0,0xff8bd2a5],[-21,-1,15,34,-68,0xff5ea779],[21,-1,15,34,68,0xff77bf94]]){add(100002,0xff284c38,w+3,h+3,x,y,rot);add(100002,c,w,h,x,y,rot);add(100001,0xffa1d8b2,1.3,h*.62,x,y,rot);}
let next=g.maxId+1;const alloc=()=>next++;
const source=byId.get(1073747135),master=byId.get(1073747151),ref=byId.get(1073747323);
const cs=children(source)[0],cm=children(master)[0];
const originals=[source,master,cs,cm,ref,...layers(source.id).slice(0,P.length),...layers(master.id).slice(0,P.length)];
const ids=new Map(originals.map(r=>[r.id,alloc()]));
function remap(fs){for(const f of fs){if(f.wt===0&&ids.has(Number(f.num)))f.num=BigInt(ids.get(Number(f.num)));if(f.sub)remap(f.sub);else if(f.wt===2&&!f.isText&&f.payload){let a=asIdList(f.payload,false);if(a?.some(id=>ids.has(id))){f.payload=Buffer.concat(a.map(id=>writeVarint(ids.get(id)||id)));f.len=f.payload.length;}}}}
const copies=new Map();let family=0;for(const r of g.recs)for(const f of nodes(r.field,[502,12])){let n=leaf(f,501);if(n)family=Math.max(family,Number(n.num));}family++;
for(const r of originals){let f=cloneField(r.field);remap(f.sub);for(const t of textsOf(f.sub,[]))if(t.payload?.toString('utf8')==='furn.plant'){t.payload=Buffer.from('furn.plant.2');t.len=t.payload.length;}
 for(const n of nodes(f,[502,12])){let l=leaf(n,501);if(l)l.num=BigInt(family);}
 const v={id:ids.get(r.id),field:f};copies.set(r.id,v);g.recHolder.push(f);
}
for(const c of [cs,cm])setChildList(findChildListTop(copies.get(c.id).field.sub),layers(c===cs?source.id:master.id).slice(0,P.length).map(r=>ids.get(r.id)));
for(const t of [source,master])layers(t.id).slice(0,P.length).forEach((r,i)=>apply(copies.get(r.id),P[i]));
for(const r of [master,ref]){let parent=byId.get(r.parentId);if(!parent)continue;let cl=findChildListTop(parent.field.sub);if(cl)setChildList(cl,[...asIdList(cl.payload,true),ids.get(r.id)]);}
// Remove the four static home plant layers; runtime uses plant_2 at exactly that cell.
const removed=g.recs.filter(r=>/^td.home.board.svg.(29|30|31|32)$/.test(r.name||''));
const del=new Set(removed.map(r=>r.id));for(const r of g.recs){let cl=findChildListTop(r.field.sub);if(cl){let a=asIdList(cl.payload,true)||[];if(a.some(id=>del.has(id)))setChildList(cl,a.filter(id=>!del.has(id)));}}
const holders=new Map();for(const r of removed){if(!holders.has(r.holder))holders.set(r.holder,[]);holders.get(r.holder).push(r);}for(const [h,rs]of holders)for(const r of rs.sort((a,b)=>b.index-a.index))h.splice(r.index,1);
const expected=g.recs.length+originals.length-removed.length;
const rep=writeGil(g,output,{label:'v363 furniture and plant 2',expectRecs:expected,assert(g2){
 const seen=new Set();for(const r of g2.recs){if(seen.has(r.id))return 'duplicate GUID '+r.id;seen.add(r.id);}
 const count=id=>{const c=g2.recs.find(r=>r.parentId===id);return g2.recs.filter(r=>r.parentId===c?.id).length;};
 if(count(ids.get(source.id))!==P.length||count(ids.get(master.id))!==P.length)return 'plant pair mismatch';
 for(const id of [1073747137,1073747138,1073747139])if(count(id)!==11)return 'table count changed';
 return true;
}});
console.log(JSON.stringify({plant2:ids.get(source.id),master:ids.get(master.id),layers:P.length,records:expected,edited:edited.size,bytes:rep.bytes}));
