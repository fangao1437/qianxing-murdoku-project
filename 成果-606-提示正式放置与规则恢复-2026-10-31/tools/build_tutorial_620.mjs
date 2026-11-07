import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,findChildListTop,asIdList,setChildList,bigIds,textsOf,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,reportPath]=process.argv.slice(2);if(!input||!output||input===output||fs.existsSync(output))throw Error('invalid/existing output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),ids=new Map(g.recs.map(r=>[r.id,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),added=[];
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n);};
const ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('not text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id);}
function num(p,k,v){let f=p.sub.find(x=>x.field===k&&x.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v);}
function font(r,size,color=0xFFD3CCBD,align=0){for(const [k,v]of [[502,0],[512,size],[513,size],[504,color],[508,align],[509,1]])num(prop(r),k,v);changed.add(r.id);}
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)]);};
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h);}changed.add(r.id);}
function remap(a,from,to,d=0){for(const q of a){if(!(d===0&&q.field===504)&&q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to,d+1);}}
let max=BigInt(g.maxId);
function clone(proto,parent,name,x,y,w,h){const f=cloneField(proto.field),id=Number(++max);remap(f.sub,proto.id,id);const nf=textsOf(f.sub,[]).find(q=>q.payload?.toString('utf8')===proto.name);nf.payload=Buffer.from(name);nf.len=nf.payload.length;f.sub.find(q=>q.field===504&&q.wt===0).num=BigInt(parent.id);const cl=findChildListTop(f.sub);if(cl)setChildList(cl,[]);const stack=[g.tree];let found=false;while(stack.length&&!found){const a=stack.pop();for(let i=0;i<a.length;i++){const q=a[i];if(!q.sub)continue;if(bigIds(q.sub,[])[0]?.num===BigInt(proto.id)){a.splice(i+1,0,f);found=true;break;}stack.push(q.sub);}}if(!found)throw Error('holder');const r={id,name,parentId:parent.id,field:f};const pc=ensureChildListTop(parent);setChildList(pc,[...asIdList(pc.payload,true),id]);changed.add(parent.id);place(r,x,y,w,h);added.push(r);by.set(name,r);ids.set(id,r);return r;}
function image(r){const seed=R('clues.help617');const parts=seed.field.sub.filter(q=>q.field===505&&q.sub?.some(x=>[83,84].includes(x.field))).map(cloneField);for(const q of parts)remap(q.sub,seed.id,r.id);r.field.sub=r.field.sub.filter(q=>!(q.field===505&&q.sub?.some(x=>[74,83,84].includes(x.field))));r.field.sub.push(...parts);changed.add(r.id);}
function button(r){const proto=R('td.l1.page.1.stephit.1');const p=cloneField(proto.field.sub.find(q=>q.field===505&&q.sub?.some(x=>x.field===80)));remap(p.sub,proto.id,r.id);r.field.sub.push(p);changed.add(r.id);}
// Inline help pictures, not text question marks. Retain line direction and generous line heights.
for(const [parent,prefix,x,y,w,size]of [['td.home.page.1','td.home.page.1.furniture617',-497,-64,286,14],['td.l1.page.1','td.l1.page.1.furniture617',-352,-268,660,14],['td.l2.page.1','td.l2.page.1.furniture617',-352,-268,660,14]]){
 const home=parent==='td.home.page.1',r=R(prefix+'.'+(home?2:1));
 const left=x-w/2;txt(r,'每关线索栏右上角的');font(r,size);place(r,left+70,y,140,32);
 const ico=clone(R('clues.help617'),R(parent),parent+'.help619.icon',left+140,y,20,20);image(ico);
 const tail=clone(R(prefix+'.0'),R(parent),parent+'.help619.tail',home?left+212:left+372,y,home?116:420,32);txt(tail,home?'注释中，':'注释中会标明本关相关内容。');font(tail,size);
}
// Restore all coordinate labels with a full two-em line box, including the missed first two columns.
let coordinateCount=0;
for(const r of g.recs){if(!/^td\.(home|l1|l2)\.page\.\d+\.svg\.\d+$/.test(r.name||'')||!/^\d$/.test(text(r)||''))continue;
 const size=Number(prop(r)?.sub.find(q=>q.field===512&&q.wt===0)?.num);if(size!==14)continue;
 const [x,y,w,h]=geo(r);if(w<28||h<32){place(r,x,y,Math.max(w,28),Math.max(h,32));coordinateCount++;}}
const note=R('td.l1.page.7.rule617.0');txt(note,'（注：若无人有多个可选位置，则说谎者是盗窃者；具体规则将在下一关详述。）');font(note,13);place(note,-352,-263,660,32);txt(R('td.l1.page.7.rule617.1'),'');place(R('td.l1.page.7.rule617.1'),-352,-263,1,1);
// The four rewritten pages use 16px type in 36px boxes, 36px baseline spacing.
for(let i=1;i<=4;i++)for(let j=0;j<4;j++){const r=R(`td.l2.page.${i}.rewrite617.${j}`);font(r,16);place(r,-352,65-j*36,660,36);}
// Old diagram annotation no longer describes the rewritten argument; keep a relevant concise note.
txt(R('td.l2.page.3.notet'),'三种方法可以交叉验证；通用线索始终为真。');txt(R('td.l2.page.3.cluename'),'D（鉴定师）提供的线索');
// Preserve X in canvas coordinates; move the icon to the timer row and reparent outside the clipped clue list.
const help=R('clues.help617'),clues=R('clues'),top=R('topbar'),timer=R('hud.timer'),[hx,hy,hw,hh]=geo(help),[cx,cy]=geo(clues),[tx,ty]=geo(top),[,timerY]=geo(timer);
place(help,hx,ty+timerY-cy,hw,hh);button(help);button(R('help617.close'));
for(const [name,size,h] of [['help617.title',24,52],['help617.close',18,44]]){const r=R(name),[x,y,w]=geo(r);place(r,x,y,w,h);font(r,size,name.endsWith('close')?0xFFF2C94C:0xFFD3CCBD,name.endsWith('close')?1:0);}
// Fixed stored layer order: all normal screen content before tutorial overlays, independent help last.
const root=R('root'),rootList=ensureChildListTop(root),all=asIdList(rootList.payload,true),overlay=['td.home','td.l1','td.l2','help617'].map(n=>R(n).id);setChildList(rootList,[...all.filter(id=>!overlay.includes(id)),...overlay]);changed.add(root.id);
const script=Buffer.from(findScriptLeaf(g).buf);
const rep=writeGil(g,output,{label:'620 tutorial annotation and text repair, preserve 618 script',expectRecs:g.recs.length+added.length,assert(t){
 if(!findScriptLeaf(t).buf.equals(script))return 'script changed';
 const map=new Map(t.recs.map(r=>[r.name,r]));
 for(const r of t.recs){if(!changed.has(r.id)&&before.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name;
 if(changed.has(r.id))for(const s of stateBlocks(r.field.sub,[]))for(const q of s.sub||[])if(q.sub)for(const f of q.sub)if(f.wt===5&&!Number.isFinite(f.f))return 'nonfinite '+r.name;
 if(r.name?.includes('rewrite617')){if(!text(r)||geo(r)[3]<36)return 'body '+r.name;}
 if(r.name?.startsWith('td.')&&text(r)?.includes('「?」'))return 'old help glyph '+r.name;
 }
 const h=map.get('clues.help617');if(h.parentId!==clues.id||Math.abs(geo(h)[0]-hx)>.01||Math.abs(geo(h)[1]+cy-(ty+timerY))>.01)return 'help position';
 for(const n of ['clues.help617','help617.close'])if(!map.get(n).field.sub.some(q=>q.field===505&&q.sub?.some(x=>x.field===80)))return 'button missing';
 for(const r of added.filter(r=>r.name.endsWith('.icon'))){const im=ns(map.get(r.name).field,[505,503,84])[0];if(im?.sub.find(q=>q.field===503)?.num!==100113n)return 'icon';}
 return true;
}});
const summary={records:rep.g2.recs.length,added:added.length,coordinateCount,changed:[...changed].map(id=>ids.get(id)?.name),text:rep.g2.recs.filter(r=>r.name?.startsWith('td.')&&text(r)).map(r=>({name:r.name,text:text(r),rect:geo(r)}))};
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(summary,null,2));console.log(JSON.stringify({records:summary.records,added:summary.added,coordinateCount,helpCanvasX:hx+cx,helpCanvasY:ty+timerY,scriptPreserved:true}));
