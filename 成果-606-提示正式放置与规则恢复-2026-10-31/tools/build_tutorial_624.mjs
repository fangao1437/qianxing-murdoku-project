import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,cloneField,ensureChildListTop,asIdList,setChildList,encodeMsg} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilread.mjs';
import {writeGil,findScriptLeaf} from '../../成果-家具教程与性能-584至588-2026-10-29/tools/gil/gilwrite.mjs';
const [input,output,report]=process.argv.slice(2);if(!input||!output||fs.existsSync(output))throw Error('input/output invalid');
const g=readGil(input),by=new Map(g.recs.map(r=>[r.name,r])),before=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])])),changed=new Set(),checks=[];
const R=n=>{if(!by.has(n))throw Error(n);return by.get(n)}, ns=(f,ks)=>ks.reduce((a,k)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===k)),[f]);
const prop=r=>ns(r.field,[505,503,75])[0],text=r=>ns(r.field,[505,503,75,510,501])[0]?.payload?.toString('utf8');
const geo=r=>{const s=stateBlocks(r.field.sub,[])[0];return [504,505].flatMap(k=>[pairValue(pairOf(s,k),0),pairValue(pairOf(s,k),1)])};
function num(p,k,v){let f=p.sub.find(q=>q.field===k&&q.wt===0);if(!f)p.sub.push(f={field:k,wt:0});f.num=BigInt(v)}
function txt(r,t){const f=ns(r.field,[505,503,75,510,501])[0];if(!f)throw Error('text '+r.name);f.payload=Buffer.from(t);f.len=f.payload.length;changed.add(r.id)}
function place(r,x,y,w,h){for(const s of stateBlocks(r.field.sub,[])){setPair(pairOf(s,504),x,y);setPair(pairOf(s,505),w,h)}changed.add(r.id)}
const BODY=0xFFD3CCBD,GOLD=0xFFFFCB7A,GREEN=0xFF8FD18A,RED=0xFFFF8A7A;
function font(r,color=BODY,size=16){for(const [k,v]of [[502,0],[512,size],[513,size],[508,0],[509,1],[504,color]])num(prop(r),k,v);changed.add(r.id)}
const measure=t=>[...t].reduce((s,c)=>s+(/[\x00-\x7F]/.test(c)?8:16),0);
function line(r,t,left,y,w=660,color=BODY,size=16){txt(r,t);font(r,color,size);place(r,left+w/2,y,w,30);return r}
// Advance by glyph width only. Extra box allowance must never accumulate between coloured runs.
function row(items,left,y){let x=left;for(const [r,t,c]of items){const advance=measure(t);line(r,t,x,y,advance+6,c);checks.push({name:r.name,text:t,x,y,advance,color:c});x+=advance;}if(x-left>660)throw Error('sentence overflow '+items[0][0].name);}
const first={
1:[['左边是线索卡，中间是棋盘，右边是工具。棋盘 5×5，'],['三间屋：大屋、内室、外间；','粗线是墙，橙色是门','。'],['行号 1–5 从上往下，列号 1–5 从左往右。']],
2:[['卡上写的是他提供的线索 —— 说的可能是别人。'],['选中后，话里提到的位置会在棋盘上','亮起来','。'],['再点一次取消选中。']],
3:[['轻点：留下铅笔笔记，不占位。'],['双击预放置：','保留','该人物在其他候选格的','笔记','。'],['长按：黄圈走满后松手正式放置，','擦除','该人物','笔记','。'],['预放置和正式放置，都会给同行、同列的其他空格打叉。']],
4:[['卡 3 是清洁工提供的线索：「只有值班保安站在地毯上」。'],['地毯一共 4 格，所以保安只可能在这 4 格之一，'],['别人踩上地毯就破了这句话。']],
5:[['卡 5：「前台姑娘在桌子旁边」→ (2,2) 和 (3,1)。'],['但 (3,1) 是地毯，站上去就和卡 3「只有值班保安在地毯上」冲突，'],['所以','B = (2,2)。'],['第 2 行、第 2 列被占 ⇒ A 的 (2,4)(2,5)(3,2) 出局 ⇒','A = (3,1)。']],
6:[['卡 4 是古董商提供的线索：「夜班清洁工站在椅子上」。'],['椅子只有 (4,2) 和 (5,4)；'],['(4,2) 和前台姑娘同列，站不了 ⇒','清洁工 = (5,4)','。']],
7:[['A、B、C 已定，只剩第1、4行和第3、5列。'],['V 在第5列：(1,5)或(4,5)；D 在另一行的第3列。'],['若 D 在外间：大屋有2名无辜者，外间只有 C，故排除。'],['所以 V=(4,5)、D=(1,3)，D 在人多的大屋。']],
8:[['摆满5个人后，点击右侧'],['点击后会先进行确认。'],['确认后，摆对的格子标','绿圈','。'],['摆错的格子标','红圈','，可据此继续调整。']]
};
const emphasis=new Set(['粗线是墙，橙色是门','亮起来','保留','擦除','笔记','B = (2,2)。','A = (3,1)。','清洁工 = (5,4)']);
for(let page=1;page<=8;page++){const pre=`td.l1.page.${page}.`,pool=g.recs.filter(r=>r.name?.startsWith(pre+'body.')&&text(r)?.trim()),used=new Set();first[page].forEach((parts,i)=>row(parts.map(t=>{const r=pool.find(r=>!used.has(r.id)&&text(r).trim()===t.trim());if(!r)throw Error('missing semantic run '+pre+t);used.add(r.id);return[r,t,t==='绿圈'?GREEN:t==='红圈'?RED:emphasis.has(t)?GOLD:BODY]}),-682,76-i*32));if(used.size!==pool.length)throw Error('unplaced body '+pre);}
line(R('td.l1.page.3.note.rule'),'笔记说明：落子格与打叉格的笔记都会清除。',-682,-58);
const second={
1:[[['① 每行、每列',BODY],['恰好一人',GOLD],['。',BODY]],[['② 只能站可站格',GOLD],['；椅子、地毯等家具也可站人。',BODY]],[['③ 用线索逐步缩小每个人的',BODY],['候选位置',GOLD],['。',BODY]],[['④ 只有门直接连通',GOLD],['的两间屋才算相邻。',BODY]]],
2:[[['不会提前告知',GOLD],['是否存在假话。',BODY]],[['除通用线索外，任何人提供的线索',BODY],['都可能是假话',GOLD],['。',BODY]],[['受害者提供的线索也不例外；',BODY],['通用线索始终为真',GOLD],['。',BODY]]],
3:[[['① 看线索是否与规则或其他线索',BODY],['直接矛盾',GOLD],['。',BODY]],[['② 假设所有线索为真',GOLD],['，检查是否存在可行摆位。',BODY]],[['③ 看是否有人有',BODY],['多个可选位置',GOLD],['；若没有，',BODY]],[['根据规则，一定有人说谎，且',BODY],['说谎者就是盗窃者',GOLD],['。',BODY]]],
4:[[['经过推导，所有人的位置都已',BODY],['唯一确定',GOLD],['。',BODY]],[['D 提供的线索要求 E 与 A 在',BODY],['同一列',GOLD],['，',BODY]],[['这与「每列恰好一人」直接矛盾，因此',BODY],['D 说了谎',GOLD],['。',BODY]],[['没有人有多个可选位置，所以',BODY],['盗窃者是 D',GOLD],['（鉴定师）。',BODY]]]
};
for(const lines of Object.values(second))for(const parts of lines){for(let i=parts.length-1;i>0;i--)if(/^[。，]$/.test(parts[i][0])){parts[i-1][0]+=parts[i][0];parts.splice(i,1);}}
for(let page=1;page<=4;page++){const pre=`td.l2.page.${page}.`,pool=g.recs.filter(r=>r.name?.startsWith(pre)&&/\.(body\.|rewrite617\.)/.test(r.name)&&text(r)!==undefined);pool.forEach(r=>txt(r,''));let i=0;second[page].forEach((parts,j)=>row(parts.map(([t,c])=>{if(!pool[i])throw Error('not enough runs '+pre);return[pool[i++],t,c]}),-682,76-j*32));}
// Give the second section full line height, then pack lower cards with a 12px gap.
for(const tag of ['l1','l2'])for(let page=1;page<=(tag==='l1'?8:4);page++){
 const pre=`td.${tag}.page.${page}.`;for(const suffix of ['main','main.border']){const r=R(pre+suffix),[x,,w]=geo(r);place(r,x,44,w,272);}
 for(const suffix of ['tag','tagbg']){const r=R(pre+suffix),[x,,w]=geo(r);place(r,x,160,w,30);}
 {const r=R(pre+'heading'),[x,,w]=geo(r);place(r,x,120,w,34);}
 const cards=['chips','note','clue'].filter(k=>by.has(pre+k)).sort((a,b)=>geo(R(pre+b))[1]-geo(R(pre+a))[1]);let top=-108;
 for(const kind of cards){const height=kind==='chips'?60:kind==='clue'?92:52,center=top-height/2;
  for(const suffix of [kind,kind+'.border'])if(by.has(pre+suffix)){const r=R(pre+suffix),[x,,w]=geo(r);place(r,x,center,w,height);}
  if(kind==='chips'){
   const k=by.get(pre+'chipsk');if(k)line(k,text(k),-682,top-14,660,0xFF80956D,13);
   let left=-682;for(let j=0;by.has(pre+'chipt.'+j);j++){const r=R(pre+'chipt.'+j),t=text(r)||'',w=measure(t)+20;line(r,t,left+8,top-40,w-16,BODY);const bg=by.get(pre+'chip.'+j);if(bg)place(bg,left+w/2,top-40,w,30);left+=w+10;}
  } else if(kind==='note'){
   for(const suffix of ['notei','notei.bg']){const r=by.get(pre+suffix);if(r){const[x,,w,h]=geo(r);place(r,x,center,w,h)}}
   const r=R(pre+'notet');line(r,text(r),-647,center,640,0xFFBDB6A7);
  } else {
   const k=by.get(pre+'cluek');if(k)txt(k,'');
   for(const suffix of ['clueface','clueface.bg']){const r=by.get(pre+suffix);if(r){const[x,,w,h]=geo(r);place(r,x,top-32,w,h)}}
   const title=by.get(pre+'cluename');if(title)line(title,text(title),-629,top-20,630,0xFF80956D);
   const rs=[0,1,2].map(i=>by.get(pre+'cluesay.'+i)).filter(r=>r&&text(r)?.trim());if(rs.length)row(rs.map(r=>[r,text(r),Number(prop(r)?.sub.find(f=>f.field===504)?.num||BODY)]),-629,top-52);
   const note=by.get(pre+'rule617.0');if(note&&text(note)?.trim()){line(note,'（注：无人有多个可选位置时，说谎者即盗窃者；详见下一关。）',-682,top-77,680,BODY,13);place(note,-342,top-77,680,24);}
  }
  checks.push({section:pre+kind,top,bottom:top-height});top-=height+12;
 }
 if(top+12 < -280)throw Error('lower sections too tall '+pre);
}
// The action name precedes its picture, consistently across home, operation and submission pages.
function icon(pre,key,x,y){for(const s of ['', '.bg']){const r=R(pre+'ico.'+key+s);place(r,x,y,s?30:22,s?30:22)}}
function action(pre,key,label,left,y){line(R(pre+'ico.'+key+'.t'),label,left,y,measure(label)+6,GOLD);icon(pre,key,left+measure(label)+20,y);return left+measure(label)+42;}
let p='td.l1.page.8.';action(p,'submit','提交箭头',-682+measure(text(R(p+'body.0.0')))+6,76);
for(const [pre,lead,keys]of [['td.l1.page.3.','放错了？右侧可',[['undo','撤销'],['redo','重做']]],['td.l1.page.8.','推不出来？点击右下角的',[['hint','提示按钮']]]]){const y=geo(R(pre+'notet'))[1];line(R(pre+'notet'),lead,-647,y,measure(lead)+6);let x=-647+measure(lead)+6;for(const [key,label]of keys)x=action(pre,key,label,x,y);}
const hp='td.home.page.1.';line(R(hp+'rule.1.body.1.0'),'摆满后点击',-640,121,86);action(hp,'submit','提交',-550,121);
line(R(hp+'rule.5.body.2.0'),'放错了，点右侧',-640,-228,118);let ax=action(hp,'undo','撤销',-518,-228);action(hp,'redo','重做',ax,-228);
line(R(hp+'furniture617.1'),'线索栏右上方的注释',-640,-48,150);place(R(hp+'help619.icon'),-472,-48,22,22);
// Remove the text-graphic/button mixture introduced by 622; keep a single image renderer and click component.
const help=R('clues.help617'),proto=R('hit.hint'),root=R('root'),topbar=R('topbar');
const geom=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>q.field===502&&q.num===12n));
const names=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>q.field===12));
const pictures=help.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>[83,84].includes(q.field))).map(cloneField);
const button=proto.field.sub.filter(f=>f.field===505&&f.sub?.some(q=>q.field===80)).map(cloneField);
function remap(a,from,to){for(const q of a){if(q.num===BigInt(from))q.num=BigInt(to);if(q.sub)remap(q.sub,from,to)}}button.forEach(c=>remap(c.sub,proto.id,help.id));
help.field.sub=help.field.sub.filter(f=>f.field!==505);help.field.sub.push(...names,...geom,...pictures,...button);
const [hx,hy]=geo(help),[tx,ty]=geo(topbar);place(help,hx+tx,hy+ty,40,40);
help.field.sub.find(f=>f.field===504&&f.wt===0).num=BigInt(root.id);
const old=ensureChildListTop(topbar);setChildList(old,asIdList(old.payload,true).filter(id=>id!==help.id));changed.add(topbar.id);
const cl=ensureChildListTop(root),ids=asIdList(cl.payload,true).filter(id=>id!==help.id),overlays=['td.home','td.l1','td.l2','help617'].map(n=>R(n).id);const idx=ids.findIndex(id=>overlays.includes(id));ids.splice(idx<0?ids.length:idx,0,help.id);setChildList(cl,ids);changed.add(root.id);
const script=fs.readFileSync('dist/client_script.lua'),leaf=findScriptLeaf(g).field;leaf.payload=script;leaf.len=script.length;
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const result=writeGil(g,output,{label:'624 semantic text layout and help input',expectRecs:g.recs.length,assert(t){if(!findScriptLeaf(t).buf.equals(script))return 'script mismatch';for(const r of t.recs){const want=expected.get(r.id)||before.get(r.id);if(!want.equals(encodeMsg([r.field])))return 'record mismatch '+r.name;}return true;}});
// Independently reopen the file, rather than trusting the writer return value.
const disk=readGil(output);for(const r of disk.recs){const want=expected.get(r.id)||before.get(r.id);if(!want.equals(encodeMsg([r.field])))throw Error('disk mismatch '+r.name);}if(!findScriptLeaf(disk).buf.equals(script))throw Error('disk script mismatch');
if(report)fs.writeFileSync(report,JSON.stringify({records:disk.recs.length,changed:[...changed].map(id=>g.recs.find(r=>r.id===id).name),checks,helpParent:'root',scriptMatches:true},null,2));
console.log(JSON.stringify({records:result.g2.recs.length,changed:changed.size,diskVerified:true}));
