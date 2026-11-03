import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,ensureChildListTop,asIdList,setChildList,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('output exists/missing');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set();
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n)},ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v)}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
function font(r,size=16){for(const [k,v]of [[502,0],[512,size],[513,size],[509,1]])num(prop(r),k,v);changed.add(r.id)}
function line(n,t,x,y,w=286){const r=R(n);txt(r,t);font(r);num(prop(r),508,0);place(r,x,y,w,32)}
function hide(r){if(text(r)!==undefined)txt(r,'');else for(const p of ns(r.field,[505,503,84]))num(p,502,0);changed.add(r.id)}
const hp='td.home.page.1.';
for(const r of g.recs)if(r.name?.startsWith(hp)&&(/\.body\.|furniture617|help619.tail/.test(r.name)))hide(r);
line(hp+'rule.1.body.0.0','每人各占一格，含一名受害者。',-497,145);
line(hp+'rule.1.body.1.0','摆满后点击',-592,121,96);
line(hp+'ico.submit.t','提交',-484,121,40);
for(const suffix of ['','bg']){const r=R(hp+'ico.submit'+(suffix?'.'+suffix:''));const [,,w,h]=geo(r);place(r,-528,121,w,h)}
line(hp+'rule.1.body.2.0','摆对盗窃者就能取得胜利；',-497,97);
line(hp+'rule.1.body.3.0','全部摆对就能完美通关。',-497,73);
line(hp+'rule.2.body.0.0','放人后，同一行、同一列',-131,145);
line(hp+'rule.2.body.1.0','的其他空格会自动打叉。',-131,121);
line(hp+'rule.2.body.2.0','每行、每列都不能站两个人。',-131,97);
txt(R(hp+'rule.3.title'),'部分家具上不能站人');
line(hp+'furniture617.0','桌子、植物等不能站人。',-497,-16);
line(hp+'furniture617.1','注释会说明本关相关内容。',-481,-48,254);
place(R(hp+'help619.icon'),-630,-48,20,20);
line(hp+'rule.4.body.0.0','旁边只算上下左右相邻格；',-131,-16);
line(hp+'rule.4.body.1.0','同屋直接算，跨屋须有门。',-131,-40);
line(hp+'rule.4.body.2.0','隔墙不算；盗窃者所在屋',-131,-64);
line(hp+'rule.4.body.3.0','必须与受害者所在屋相邻。',-131,-88);
line(hp+'rule.5.body.0.0','点线索卡选人；轻点记笔记，双击预放置。',-314,-176,652);
line(hp+'rule.5.body.1.1','长按至黄圈走满，松手正式放置。',-314,-202,652);
line(hp+'rule.5.body.2.0','放错了，点右侧',-584,-228,112);
for(const [key,x]of [['undo',-510],['redo',-416]]){for(const end of ['', '.bg']){const r=R(hp+'ico.'+key+end),[,,w,h]=geo(r);place(r,x,-228,w,h)}line(hp+'ico.'+key+'.t',key==='undo'?'撤销':'重做',x+40,-228,48)}
// Remove repeated help introductions; the home explanation remains the single introduction.
for(const tag of ['l1','l2'])for(const r of g.recs)if(r.name?.startsWith(`td.${tag}.page.1.`)&&/furniture617|help619/.test(r.name))hide(r);
// Main cards move upward, with four lines at 32px spacing and independent lower sections.
for(const r of g.recs){const m=r.name?.match(/^td\.(l1|l2)\.page\.(\d+)\.(.*)$/);if(!m)continue;const suffix=m[3],[x,y,w,h]=geo(r);
 if(/^(step\.|stepn\.|stept\.|stephit\.)/.test(suffix))place(r,x,y+34,w,h);
 if(/^(main|main.border)$/.test(suffix))place(r,x,61,w,248);
 if(/^tag(bg)?$/.test(suffix))place(r,x,165,w,Math.max(h,32));
 if(suffix==='heading')place(r,x,125,w,44);
 if(/^(body\.|rewrite617\.)/.test(suffix)&&text(r)?.trim()){font(r);place(r,x,y+28,w,32)}
 if(/^(notet|cluename|cluesay\.|rule617\.|note.rule)/.test(suffix)&&text(r)?.trim()){font(r);place(r,x,y,w,Math.max(h,32))}
 if(suffix==='rule617.0'){txt(r,'（注：无人有多个可选位置时，说谎者即盗窃者；详见下一关。）');place(r,-352,-263,660,32)}
}
// Reflow rich text runs within each original body line, preserving emphasis colours.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`,groups=new Map();
 for(const r of g.recs){if(!r.name?.startsWith(pre+'body.')||!text(r)?.trim())continue;const key=r.name.slice(pre.length).split('.')[1];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 for(const rows of groups.values()){rows.sort((a,b)=>Number(a.name.split('.').at(-1))-Number(b.name.split('.').at(-1)));let x=-682;for(const r of rows){const t=text(r);const width=[...t].reduce((s,c)=>s+(/[\x00-\x7F]/.test(c)?8.5:16),0)+8;const [,y]=geo(r);place(r,x+width/2,y,width,32);x+=width-8}}
 if(tag==='l2')for(let j=0;j<4;j++){const r=R(pre+'rewrite617.'+j);place(r,-352,89-j*34,660,32)}
}
// Separate clue headings and prose after raising the font size.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`,name=by.get(pre+'cluename');
 if(name&&text(name)?.trim()){
  const [x,y,w]=geo(name);place(name,x,y+4,w,32);
  const rows=g.recs.filter(r=>r.name?.startsWith(pre+'cluesay.')&&text(r)?.trim()).sort((a,b)=>a.name.localeCompare(b.name));
  rows.forEach((r,i)=>{const [rx,,rw]=geo(r);place(r,rx,y-30-i*32,rw,32)});
 }
}
// Larger legend; coordinates occupy their own line under the board.
for(const r of g.recs){const m=r.name?.match(/^(td\.(?:home|l1|l2)\.page\.\d+)\.(.*)$/);if(!m)continue;const suffix=m[2],[x,y,w,h]=geo(r);
 if(/^lgt\.\d+$/.test(suffix)){font(r);place(r,590,126-Number(suffix.split('.')[1])*27,120,32)}
 const lg=suffix.match(/^lg\.(\d+)(?:\.bg)?$/);if(lg){place(r,x,126-Number(lg[1])*27,text(r)!==undefined?30:w,text(r)!==undefined?32:h);if(text(r)!==undefined)font(r)}
 if(suffix==='legendtitle'){font(r,18);place(r,x,159,w,36)}
 if(suffix==='coord'){txt(r,'坐标（行，列） · 行号向下，列号向右');font(r);num(prop(r),508,1);place(r,302,m[1].includes('.home.')?-273:-273,500,32)}
 if(suffix==='caption'){font(r);place(r,275,-240,466,32)}
}
// Move help out of the clue-list parent's hit rectangle, without changing canvas coordinates.
const help=R('clues.help617'),clues=R('clues'),top=R('topbar');const [hx,hy,w,h]=geo(help),[cx,cy]=geo(clues),[tx,ty]=geo(top);
const old=ensureChildListTop(clues);setChildList(old,asIdList(old.payload,true).filter(id=>id!==help.id));const tl=ensureChildListTop(top);setChildList(tl,[...asIdList(tl.payload,true).filter(id=>id!==help.id),help.id]);help.field.sub.find(f=>f.field===504&&f.wt===0).num=BigInt(top.id);place(help,hx+cx-tx,hy+cy-ty,w,h);changed.add(clues.id);changed.add(top.id);
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const result=writeGil(g,output,{label:'621 readable tutorials and help hit parent',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script';for(const r of t.recs){if(!changed.has(r.id)&&!before.get(r.id).equals(encodeMsg([r.field])))return 'unexpected '+r.name;if(changed.has(r.id))for(const s of stateBlocks(r.field.sub,[]))for(const q of s.sub||[])for(const f of q.sub||[])if(f.wt===5&&!Number.isFinite(f.f))return 'nan '+r.name;}return true;}});
if(report)fs.writeFileSync(report,JSON.stringify(result.g2.recs.filter(r=>r.name?.startsWith('td.')&&text(r)?.trim()).map(r=>({name:r.name,text:text(r),rect:geo(r),size:Number(prop(r).sub.find(q=>q.field===512)?.num||16)})),null,2));console.log(JSON.stringify({records:result.g2.recs.length,changed:changed.size,helpParent:top.name}));
