// 597 -> 598: button icons on home / tutorial prose, stale wording (指认/判题) cleanup, embed new client script (submit red/green rings).
// Usage: node tools/gil/build_tutorial_598.mjs <597.gil> <598.gil> <report.json> <client_script.lua>

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg,cloneField,findChildListTop,asIdList,setChildList,bigIds,textsOf} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,reportOut,scriptPath]=process.argv.slice(2);
if(!input||!output||input===output)throw Error('missing arguments or same input/output');
const here=path.dirname(fileURLToPath(import.meta.url));
const ADV=eval('('+/const ADV=(\{.*?\});\r?\n/s.exec(fs.readFileSync(path.join(here,'build_tutorial_596.mjs'),'utf8'))[1]+')');
const adv=(t,size)=>Math.max(...t.split('\n').map(l=>[...l].reduce((n,c)=>n+(ADV[c]??1)*size,0)));
const g=readGil(input);if(!scriptPath)throw Error("missing script path");const script=fs.readFileSync(scriptPath);{const f=findScriptLeaf(g).field;f.payload=script;f.len=script.length;}
const originalCount=g.recs.length;
const byName=new Map(g.recs.filter(r=>r.name).map(r=>[r.name,r]));
const R=n=>{const r=byName.get(n);if(!r)throw Error('missing control '+n);return r;};
const nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const prop=r=>nodes(r.field,[505,503,75])[0];
const num=(r,k)=>Number(prop(r).sub.find(f=>f.field===k&&f.wt===0)?.num||0);
const setNum=(r,k,v)=>{const p=prop(r);let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0,num:0n});f.num=BigInt(v>>>0);};
const getText=r=>nodes(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8')??'';
const setText=(r,v)=>{const l=nodes(r.field,[505,503,75,510,501])[0];l.payload=Buffer.from(v,'utf8');l.len=l.payload.length;l.isText=true;};
const geom=r=>{const s=stateBlocks(r.field.sub,[])[0];return {x:pairValue(pairOf(s,504),0),y:pairValue(pairOf(s,504),1),w:pairValue(pairOf(s,505),0),h:pairValue(pairOf(s,505),1)};};
const place=(r,x,y,w,h)=>{const o=geom(r);for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w??o.w,h??o.h);}};
const artNodes=r=>nodes(r.field,[505,503,84]);
function art(r,image,color){for(const n of artNodes(r)){for(const [k,v] of [[502,color>>>0],[503,image],[504,1]]){let f=n.sub.find(x=>x.field===k&&x.wt===0);if(!f)n.sub.push(f={field:k,wt:0,num:0n});f.num=BigInt(v);}}}
function artColor(r,color){for(const n of artNodes(r)){let f=n.sub.find(x=>x.field===502&&x.wt===0);if(!f)n.sub.push(f={field:502,wt:0,num:0n});f.num=BigInt(color>>>0);}}
const artColorOf=r=>Number(artNodes(r)[0].sub.find(x=>x.field===502).num);
const hide=r=>{if(artNodes(r).length)artColor(r,0x00000000);else{setText(r,' ');}};
// ---- cloning (same mechanism as replica_tutorial.mjs) ----
let maxId=BigInt(g.maxId);const added=[];const holderCache=new Map();
function holderOf(id){const stack=[g.tree];while(stack.length){const arr=stack.pop();for(let i=0;arr&&i<arr.length;i++){const f=arr[i];if(!f.sub)continue;if((bigIds(f.sub,[])[0]||{}).num===BigInt(id))return {arr,index:i};stack.push(f.sub);}}throw Error('holder '+id);}
function clone(protoName,parentName,newName,x,y,w,h){
 const proto=R(protoName),parent=R(parentName);if(byName.has(newName))throw Error('dup '+newName);
 const cf=cloneField(proto.field);maxId+=1n;bigIds(cf.sub,[])[0].num=maxId;
 const t=textsOf(cf.sub,[]).find(q=>q.payload&&q.payload.toString('utf8')===proto.name);if(!t)throw Error('name leaf '+protoName);
 t.payload=Buffer.from(newName,'utf8');t.len=t.payload.length;
 const pl=cf.sub.find(f=>f.field===504&&f.wt===0);if(pl)pl.num=BigInt(parent.id);
 const inh=findChildListTop(cf.sub);if(inh)setChildList(inh,[]);
 const blocks=stateBlocks(cf.sub,[]);for(const b of blocks){setPair(pairOf(b,504),x,y);setPair(pairOf(b,505),w,h);}
 const hk=protoName;let holder=holderCache.get(hk);if(!holder){holder=holderOf(proto.id);holderCache.set(hk,holder);}
 holder.arr.splice(holder.index+1,0,cf);holderCache.clear();
 let cl=findChildListTop(parent.field.sub);const ids=(asIdList(cl.payload,true)||[]).map(Number);ids.push(Number(maxId));setChildList(cl,ids);
 const rec={name:newName,id:Number(maxId),field:cf,parentId:parent.id};byName.set(newName,rec);added.push(newName);return rec;}
function stripRotation(r){for(const b of stateBlocks(r.field.sub,[])){const i=b.sub.findIndex(x=>x.field===508);if(i>=0)b.sub.splice(i,1);}}
function raise(parentName,names){const cl=findChildListTop(R(parentName).field.sub);let ids=(asIdList(cl.payload,true)||[]).map(Number);for(const n of names){const id=R(n).id;ids=ids.filter(x=>x!==id);ids.push(id);}setChildList(cl,ids);}
// ---- colours ----
const GOLD=0xFFFFCB7A,BLUE=0xFF9ED8FF,BODY=0xFFD3CCBD,GREEN=0xFF8FC08A,RED=0xFFFF8A7A,COL={g:GOLD,b:BLUE,t:BODY,n:GREEN,r:RED};
const T=s=>[s,'t'],G=s=>[s,'g'],B=s=>[s,'b'],N=s=>[s,'n'],Rr=s=>[s,'r'];
const report=[];
// ---- rich text layout into the existing body pool (clones extra controls when needed) ----
function layoutBody(page,key,lines,{icons={},step=26}={}){
 const pfx=`td.${page}.${key}.`;
 const pool=g.recs.filter(r=>r.name&&r.name.startsWith(pfx)&&/^\d+(\.\d+)?$/.test(r.name.slice(pfx.length))).sort((a,b)=>{const [ai,aj=0]=a.name.slice(pfx.length).split('.').map(Number),[bi,bj=0]=b.name.slice(pfx.length).split('.').map(Number);return ai-bi||aj-bj;});
 if(!pool.length)throw Error('empty pool '+pfx);
 const first=geom(pool[0]),size=num(pool[0],512),left=first.x-first.w/2;
 const ys=[...new Set(pool.map(r=>geom(r).y))].sort((a,b)=>b-a);while(ys.length<lines.length)ys.push(ys[ys.length-1]-step);
 const maxW=page.startsWith('home')?292:648;let used=0;const lineEnds=[];
 lines.forEach((segs,li)=>{let x=left,total=0;for(const [text,c] of segs){let r;if(used<pool.length)r=pool[used++];else{r=clone(pool[0].name,`td.${page}`,`${pfx}x${used++}`,0,0,10,10);}
   const a=adv(text,size),w=Math.ceil(a*1.12+size*1.6);setText(r,text);setNum(r,504,COL[c]);setNum(r,508,0);place(r,x+w/2,ys[li],w,Math.max(first.h,Math.ceil(size*2)));x+=a+1;total+=a;}
  if(total>maxW)throw Error(`line too wide ${page}.${key} #${li}: ${Math.round(total)}>${maxW}`);lineEnds.push({x,y:ys[li]});});
 for(const r of pool.slice(used)){setText(r,' ');}
 report.push({page,key,lines:lines.map(s=>s.map(x=>x[0]).join(''))});return {lineEnds,size};
}
// ---- icon button (dark disc + official glyph) + gold label ----
const ICON={undo:100127,redo:100126,submit:100110,hint:100120};
function iconWithLabel(page,proto,textProto,id,kind,x,y,label,{disc=34,glyph=22}={}){
 const d=clone(proto,`td.${page}`,`td.${page}.ico.${id}.bg`,x+disc/2,y,disc,disc);stripRotation(d);art(d,100002,0xFF2A3142);
 const gl=clone(proto,`td.${page}`,`td.${page}.ico.${id}`,x+disc/2,y,glyph,glyph);stripRotation(gl);art(gl,ICON[kind],0xFFFFFFFF);
 let end=x+disc;
 if(label){const size=num(R(textProto),512),a=adv(label,size),w=Math.ceil(a*1.12+size*1.6);const t=clone(textProto,`td.${page}`,`td.${page}.ico.${id}.t`,end+4+w/2,y,w,Math.ceil(size*2));setText(t,label);setNum(t,504,GOLD);setNum(t,508,0);end+=4+a+2;}
 return end;
}
function textAt(page,name,textProto,text,color,x,y){const size=num(R(textProto),512),a=adv(text,size),w=Math.ceil(a*1.12+size*1.6);const t=clone(textProto,`td.${page}`,name,x+w/2,y,w,Math.ceil(size*2));setText(t,text);setNum(t,504,color);setNum(t,508,0);return x+a+1;}
// ---- note card text: set text left-aligned inside the card, return end x ----
function noteText(page,text){const r=R(`td.${page}.notet`),o=geom(r),size=num(r,512),left=o.x-o.w/2,a=adv(text,size),w=Math.ceil(a*1.12+size*1.6);setText(r,text);place(r,left+w/2,o.y,w,Math.max(o.h,Math.ceil(size*2)));return {left,end:left+a+8,y:o.y,size};}
// ---- chips ----
function layChips(page,items,left,gap=10){let x=left;items.forEach(([text,pill,fg],i)=>{
 const nm=`td.${page}.chip.${i}`,tn=`td.${page}.chipt.${i}`;
 if(!byName.has(nm)){const p0=R(`td.${page}.chip.1`),t0=R(`td.${page}.chipt.1`);const gp0=geom(p0),gt0=geom(t0);clone(p0.name,`td.${page}`,nm,gp0.x,gp0.y,gp0.w,gp0.h);clone(t0.name,`td.${page}`,tn,gt0.x,gt0.y,gt0.w,gt0.h);}
 const p=R(nm),t=R(tn),size=num(t,512),w=Math.ceil(adv(text,size)+30),pg=geom(p);
 setText(t,text);if(fg!=null)setNum(t,504,fg);if(pill!=null)artColor(p,pill);
 place(p,x+w/2,pg.y,w,pg.h);place(t,x+w/2,geom(t).y,w+24,geom(t).h);x+=w+gap;});}
const HOME='home.page.1';
const small={disc:26,glyph:17};
// ============ home page ============
setText(R('td.home.page.1.title'),'先摆人，再提交');
setText(R('td.home.page.1.rule.1.title'),'目标：摆满当事人，再提交');
{
 const h1=layoutBody(HOME,'rule.1.body',[
  [T('每名当事人（含 1 名受害者）各占一格。')],
  [T('全部摆好后，点击')],
  [T('全部摆对，就能锁定'),G('盗窃者'),T('。')],
 ],{step:24});
 iconWithLabel(HOME,'td.home.page.1.rule.1.num.bg','td.home.page.1.rule.1.body.0.0','submit','submit',h1.lineEnds[1].x+6,h1.lineEnds[1].y,'提交',small);
}
{
 const r=R('td.home.page.1.rule.5.body.2.0'),txt='放错了，点右边的',o=geom(r),size=num(r,512),left=o.x-o.w/2,a=adv(txt,size),w=Math.ceil(a*1.12+size*1.6);
 setText(r,txt);place(r,left+w/2,o.y,w,o.h);
 let x=left+a+6;
 x=iconWithLabel(HOME,'td.home.page.1.rule.1.num.bg','td.home.page.1.rule.5.body.0.0','undo','undo',x,o.y,'撤销',small)+10;
 iconWithLabel(HOME,'td.home.page.1.rule.1.num.bg','td.home.page.1.rule.5.body.0.0','redo','redo',x,o.y,'重做',small);
}
// ============ level 2 page 4 ============
{
 const P='l2.page.4';
 const l=layoutBody(P,'body',[
  [T('摆满后，点击')],
  [T('摆对的格子标'),N('绿圈'),T('，摆错的标'),Rr('红圈'),T('，但不会告诉你是哪一句假，')],
  [T('也不会说有几条线索不成立。')],
  [T('找到那句假话后，说这句话的人就是盗窃者。')],
 ]);
 iconWithLabel(P,'td.l2.page.4.tagbg','td.l2.page.4.body.0.0','submit','submit',l.lineEnds[0].x+6,l.lineEnds[0].y,'提交',small);
 setText(R('td.l2.page.4.chipt.2'),'锁定盗窃者');
}
// ---- write + verify ----
const rep=writeGil(g,output,{label:'598 tutorial button icons',expectRecs:originalCount+added.length,assert(t){const seen=new Set();for(const r of t.recs){if(seen.has(r.id))return 'duplicate id';seen.add(r.id);}return findScriptLeaf(t).buf.equals(script)?true:'script not embedded';}});
if(reportOut){fs.mkdirSync(path.dirname(reportOut),{recursive:true});fs.writeFileSync(reportOut,JSON.stringify({report,added},null,1));}
console.log(JSON.stringify({records:rep.g2.recs.length,added:added.length,scriptEmbedded:true}));
