package.path='lua/?.lua;lua/?/init.lua;'..package.path
local Core=require('murdoku_core');local UI=require('ui_controller');local L=require('levels.case_001')
local function setup()
 local k=Core.new(L);local c=UI.new(k,{skip_intro=true});c.screen=nil;c.now=0
 for _,p in ipairs(k.pieces)do local s=k.solution[p.id];if s then k.pos[p.id]={r=s.r,c=s.c}end end
 c._last_adapter={set_verdict_ring=function()end,clear_verdict_rings=function()end};c._settle_by_roles=function()end
 c:_start_verdict();c.now=10;c:_verdict_step();return c,k
end
for _,name in ipairs({'done','animation','submit'})do
 local c,k=setup();local f
 if name=='done'then f=function()c:_verdict_step()end
 elseif name=='animation'then c:_start_verdict();local i=0;f=function()i=i+1;c.now=c._verdict.t0+(i%20)/20;c:_verdict_step()end
 else f=function()c:_start_verdict()end end
 for i=1,2000 do f()end;collectgarbage('collect');local t=os.clock();for i=1,100000 do f()end;local us=(os.clock()-t)*10
 collectgarbage('collect');collectgarbage('stop');local mem=collectgarbage('count');for i=1,10000 do f()end;local bytes=(collectgarbage('count')-mem)*1024/10000;collectgarbage('restart')
 print(string.format('%s|%.6f|%.6f',name,us,bytes))
end
