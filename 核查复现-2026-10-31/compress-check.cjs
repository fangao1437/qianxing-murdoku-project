const fs=require('fs'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
const src=fs.readFileSync(process.argv[2],'utf8').replace(/^import .*$/mg,'').replace(/\bexport /g,'');const needle='for (let w2 = w - 1; w2 >= 1; w2--) {';assert.equal(src.split(needle).length,2);
function load(s){const c={};vm.createContext(c);vm.runInContext(s+'\nthis.pack=packRectangles;this.validate=validateBlocks;',c);return c;}
const a=load(src),b=load(src.replace(needle,needle+'\nif (w2 * Math.min(maxDim, height - j) <= bestArea) break;'));
let seed=412;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;}
const median=x=>x.sort((a,b)=>a-b)[Math.floor(x.length/2)];let rows=[];
for(const [w,h]of [[1,1],[1,33],[33,1],[16,17],[56,91],[128,128],[257,3],[3,257]])for(const kind of ['flat','stripes','noise','gradient','magenta'])for(const std of [0,2,10])for(const maxDim of [1,7,255]){
 const rgb=new Uint8Array(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)rgb[(y*w+x)*3+c]=kind==='flat'?80:kind==='stripes'?(Math.floor(x/7)%2?180:40):kind==='noise'?rnd():kind==='magenta'?(c===1?0:255):(x+y+c)%256;
 const run=f=>f.pack(rgb,w,h,{std,maxDim});const old=run(a),now=run(b);assert.equal(JSON.stringify(old),JSON.stringify(now));const valid=a.validate(now,w,h);assert.equal(valid.holes+valid.overlaps+valid.outOfBounds,0);assert(now.every(q=>q.w<=maxDim&&q.h<=maxDim));
 let row={w,h,kind,std,maxDim,blocks:now.length};if(w===128&&maxDim===255){const ta=[],tb=[];for(let j=0;j<3;j++){run(a);run(b)}for(let j=0;j<10;j++){for(const [f,times]of(j%2?[[b,tb],[a,ta]]:[[a,ta],[b,tb]])){let t=performance.now();run(f);times.push(performance.now()-t)}}row.old_ms=median(ta);row.new_ms=median(tb);row.old_samples=ta;row.new_samples=tb;}rows.push(row);
}
fs.writeFileSync(process.argv[3],JSON.stringify({node:process.version,seed:412,cases:rows.length,all_equal:true,geometry_errors:0,rows},null,2));console.log('Compression cases passed:',rows.length);
