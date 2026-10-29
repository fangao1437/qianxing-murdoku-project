// 588 -> 589: transparent valid plant container images; internal opaque tile seam overlap.
import fs from 'node:fs';
import {readGil,stateBlocks,pairOf,pairValue,setPair,encodeMsg} from './gilread.mjs';
import {writeGil,findScriptLeaf} from './gilwrite.mjs';
const [input,output,script]=process.argv.slice(2);if(!input||!output)throw Error('usage: input output [bundle]');
const g=readGil(input), nodes=(f,ns)=>ns.reduce((a,n)=>a.flatMap(x=>(x.sub||[]).filter(y=>y.field===n)),[f]);
const val=(im,n)=>Number(im.sub.find(f=>f.field===n&&f.wt===0)?.num??0);
const put=(im,n,v)=>{let f=im.sub.find(f=>f.field===n&&f.wt===0);if(!f)im.sub.push(f={field:n,wt:0,num:0n});f.num=BigInt(v>>>0);};
const changed=new Set(), gaps=[], containers=[];const original=new Map(g.recs.map(r=>[r.id,encodeMsg([r.field])]));
for(const id of [1073753954,1073753952]){const r=g.recs.find(r=>r.id===id);const im=nodes(r.field,[505,503,84])[0];if(!im||val(im,503)!==0)throw Error('empty image precondition '+id);put(im,503,100001);put(im,502,0);put(im,504,1);containers.push(id);changed.add(id);}
for(const top of g.recs.filter(r=>['furn.plant','furn.statue'].includes(r.name))){
 const content=g.recs.find(r=>r.parentId===top.id);if(!content)continue;
 const rects=g.recs.filter(r=>r.parentId===content.id).map(r=>{const im=nodes(r.field,[505,503,84])[0],s=stateBlocks(r.field.sub,[])[0];if(!im||!s||val(im,503)!==100001||(val(im,502)>>>24)!==255)return null;const rot=s.sub.find(f=>f.field===508);if(rot?.sub?.some(f=>f.wt===5&&f.f!==0))return null;const w=pairValue(pairOf(s,505),0),h=pairValue(pairOf(s,505),1),x=pairValue(pairOf(s,504),0),y=pairValue(pairOf(s,504),1);return {r,w,h,x,y,l:x-w/2,rr:x+w/2,b:y-h/2,t:y+h/2,p:[0,0,0,0]};}).filter(Boolean);
 // Extend only edges fully covered by an adjoining rectangle. No silhouette growth.
 const eps=.025,pad=.35;
 for(const a of rects)for(const b of rects){if(a===b)continue;if(b.b<=a.b+eps&&b.t>=a.t-eps){if(Math.abs(a.l-b.rr)<eps)a.p[0]=pad;if(Math.abs(a.rr-b.l)<eps)a.p[1]=pad;}if(b.l<=a.l+eps&&b.rr>=a.rr-eps){if(Math.abs(a.b-b.t)<eps)a.p[2]=pad;if(Math.abs(a.t-b.b)<eps)a.p[3]=pad;}}
 for(const a of rects){if(!a.p.some(Boolean))continue;const [l,r,b,t]=a.p;for(const s of stateBlocks(a.r.field.sub,[])){setPair(pairOf(s,505),a.w+l+r,a.h+b+t);setPair(pairOf(s,504),a.x+(r-l)/2,a.y+(t-b)/2);}changed.add(a.r.id);gaps.push({id:a.r.id,template:top.name,pad:a.p});}
}
// Original plant is translucent ellipse art, not tiled geometry. Strengthen colored coverage only.
let plantColors=0;
for(const top of g.recs.filter(r=>r.name==='furn.plant')){const content=g.recs.find(r=>r.parentId===top.id);if(!content)continue;for(const r of g.recs.filter(r=>r.parentId===content.id)){const im=nodes(r.field,[505,503,84])[0];if(!im)continue;const c=val(im,502)>>>0,a=c>>>24,rgb=c&0xffffff;if(val(im,503)===100002&&rgb!==0&&a>0&&a<255){const na=Math.min(255,Math.round(a+(255-a)*.4));put(im,502,((na<<24)|rgb)>>>0);changed.add(r.id);plantColors++;}}}
console.log('plant colored ellipse alpha strengthened',plantColors);
if(script){const f=findScriptLeaf(g).field;f.payload=fs.readFileSync(script);f.len=f.payload.length;}
const expected=new Map(g.recs.filter(r=>changed.has(r.id)).map(r=>[r.id,encodeMsg([r.field])]));
const rep=writeGil(g,output,{label:'v367 transparent plant roots and internal seam overlap',expectRecs:g.recs.length,assert(g2){for(const r of g2.recs){const want=expected.get(r.id)||original.get(r.id);if(!want.equals(encodeMsg([r.field])))return 'unexpected record '+r.id;}for(const id of containers){const im=nodes(g2.recs.find(r=>r.id===id).field,[505,503,84])[0];if(val(im,503)!==100001||val(im,502)!==0)return 'container';}if(script&&!findScriptLeaf(g2).buf.equals(fs.readFileSync(script)))return 'script mismatch';return true;}});
console.log(JSON.stringify({containers,seamRectangles:gaps.length,byTemplate:gaps.reduce((a,r)=>(a[r.template]=(a[r.template]||0)+1,a),{}),records:rep.g2.recs.length}));
