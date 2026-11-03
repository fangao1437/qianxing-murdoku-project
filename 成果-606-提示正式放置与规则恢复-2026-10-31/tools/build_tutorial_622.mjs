import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('invalid output');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set();
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n)},ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v)}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
function font(r,size=16){for(const[k,v]of [[502,0],[512,size],[513,size],[509,1]])num(prop(r),k,v);changed.add(r.id)}
function line(n,t,x,y,w=660){const r=R(n);txt(r,t);font(r);num(prop(r),508,0);place(r,x,y,w,32)}
const width=t=>[...t].reduce((s,c)=>s+(/[\x00-\x7F]/.test(c)?8.5:16),0);
// Group by actual baseline, never by the obsolete body line number.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`,groups=new Map();
 for(const r of g.recs){if(!r.name?.startsWith(pre+'body.')||!text(r)?.trim())continue;const y=Math.round(geo(r)[1]);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(r)}
 let row=0;for(const [y,rs]of [...groups].sort((a,b)=>b[0]-a[0])){rs.sort((a,b)=>{const aa=a.name.match(/key610\.(\d+)$/),bb=b.name.match(/key610\.(\d+)$/);if(aa||bb)return Number(aa?.[1]||0)-Number(bb?.[1]||0);return geo(a)[0]-geo(b)[0]});let x=-682;for(const r of rs){font(r);const w=width(text(r))+6;place(r,x+w/2,90-row*34,w,32);x+=w-6}row++}
}
// Replace the overlapping three-run conclusion with complete logical lines.
const p='td.l1.page.7.';for(const r of g.recs)if(r.name?.startsWith(p+'body.')&&text(r)!==undefined)txt(r,'');
[['body.0.0','A、B、C 已定，只剩第1、4行和第3、5列。'],['body.1.0','V 在第5列：(1,5)或(4,5)；D 在另一行的第3列。'],['body.2.0','若 D 在外间：大屋有2名无辜者，外间只有 C，故排除。'],['body.3.0','所以 V=(4,5)、D=(1,3)，D 在人多的大屋。']].forEach(([n,t],i)=>line(p+n,t,-352,90-i*34));
line(p+'cluename','V 是受害者，不参与判断；A、B、C 已由线索逐一锁定。',-313,-165,633);
line(p+'cluesay.0','只有 D 保留选择余地，因此盗窃者是 D（旧识古董商）。',-313,-203,633);
txt(R(p+'cluesay.1'),'');txt(R(p+'cluesay.2'),'');
// Third-page instructions: reserve separate space for the two action pictograms.
line('td.l1.page.3.notet','放错了？右侧可',-577,-211,160);
for(const [k,x]of [['undo',-450],['redo',-340]]){for(const end of ['', '.bg']){const r=R('td.l1.page.3.ico.'+k+end);const [,,w,h]=geo(r);place(r,x,-211,w,h)}line('td.l1.page.3.ico.'+k+'.t',k==='undo'?'撤销':'重做',x+40,-211,48)}
line('td.l1.page.3.note.rule','笔记说明：落子格与打叉格的笔记都会清除。',-352,-50);
for(const r of g.recs)if(/^td\.(l1|l2)\.page\.\d+\.(stept\.|stepn\.|chipt\.|tag$|chiptitle$)/.test(r.name||'')&&text(r)?.trim()){font(r);const[x,y,w,h]=geo(r);place(r,x,y,w,Math.max(32,h))}
line('td.home.page.1.furniture617.1','线索栏右上方的注释',-470,-48,232);
line('td.home.page.1.furniture617.2','会说明本关相关内容。',-497,-76,286);
txt(R('td.l2.page.2.rewrite617.3'),'');
// Rebuild the control components from the proven hint button. Preserve identity, geometry and parent.
const help=R('clues.help617'),proto=R('hit.hint');
const pictures=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>[83,84].includes(q.field))).map(cloneField);
function refs(a){for(const q of a){if(q.field===504&&q.sub?.some(z=>z.field===3&&z.num===8n)){const v=q.sub.find(z=>z.field===4);if(v)v.num=BigInt(help.id)}if(q.sub)refs(q.sub)}}for(const pic of pictures)refs(pic.sub);
const geometry=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>q.field===502&&q.num===12n));
const name=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>q.field===12));
const comps=proto.field.sub.filter(f=>f.field===505&&!f.sub?.some(q=>q.field===12)&&!f.sub?.some(q=>q.field===502&&q.num===12n)).map(cloneField);
function fix(a){for(const q of a){if(q.num===BigInt(proto.id))q.num=BigInt(help.id);if(q.sub)fix(q.sub)}}for(const c of comps)fix(c.sub);
help.field.sub=help.field.sub.filter(f=>f.field!==505);help.field.sub.push(...name,...geometry,...pictures,...comps);
const image=ns(help.field,[505,503,84])[0];if(!image)throw Error('hint missing image');num(image,503,100113);num(image,502,0xFFFFFFFF);changed.add(help.id);
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const rep=writeGil(g,output,{label:'622 tutorial paragraph layout and complete help button',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script';for(const r of t.recs){if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name;if(changed.has(r.id))for(const s of stateBlocks(r.field.sub,[]))for(const k of [504,505])for(const v of [0,1])if(!Number.isFinite(pairValue(pairOf(s,k),v)))return 'invalid geometry '+r.name;}return true;}});
console.log(JSON.stringify({records:rep.g2.recs.length,changed:changed.size,helpImage:100113}));
