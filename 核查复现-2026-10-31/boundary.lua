-- Run from an extracted source tree: lua boundary.lua
package.path='lua/?.lua;lua/?/init.lua;'..package.path
local Core=require('murdoku_core'); local UI=require('ui_controller');local level=require('levels.case_001')
local function setup()
 local core=Core.new(level); local c=UI.new(core,{skip_intro=true});c.screen=nil;c.now=0
 local log={};local ad={}
 function ad:clear_verdict_rings() log[#log+1]='clear' end
 function ad:set_verdict_ring(cell,good,a) log[#log+1]=cell..':'..tostring(good)..':'..string.format('%.6f',a) end
 c._last_adapter=ad
 function c:_settle_by_roles() log[#log+1]='settle' end
 for _,p in ipairs(core.pieces) do local s=core.solution[p.id];if s then core.pos[p.id]={r=s.r,c=s.c} end end
 return c,core,log
end
local changes={
 {'stable',function()end},
 {'inplace_move',function(c,k)k.pos[k.pieces[1].id].r=99 end},
 {'replace_same',function(c,k)local id=k.pieces[1].id;local p=k.pos[id];k.pos[id]={r=p.r,c=p.c}end},
 {'unplace',function(c,k)k.pos[k.pieces[1].id]=nil end},
 {'reorder',function(c,k)k.pieces[1],k.pieces[2]=k.pieces[2],k.pieces[1]end},
 {'remove_piece',function(c,k)table.remove(k.pieces)end},
 {'screen',function(c)c.screen='home'end},
 {'level',function(c,k)k.level={id='other'}end},
 {'core_nil',function(c)c.core=nil end},
 {'pos_nil',function(c,k)k.pos=nil end},
 {'adapter_replace',function(c)c._last_adapter={set_verdict_ring=function()end}end},
 {'row_string',function(c,k)local p=k.pos[k.pieces[1].id];p.r=tostring(p.r)end},
 {'row_float',function(c,k)local p=k.pos[k.pieces[1].id];p.r=p.r+0.0 end},
 {'time_reverse',function(c)c.now=0.1 end},
}
for _,done in ipairs({false,true})do for _,case in ipairs(changes)do
 local c,k,log=setup();c:_start_verdict();c.now=done and 10 or 0.2;c:_verdict_step();case[2](c,k);c:_verdict_step()
 print('CASE|'..case[1]..'|'..tostring(done)..'|'..tostring(c._verdict~=nil)..'|'..table.concat(log,','))
end end
-- Normal monotonic animation / repeated submit / fixed-seed position edits.
for seed=1,100 do
 local c,k,log=setup(); c:_start_verdict()
 for step=1,40 do
  c.now=c.now+((seed*step)%9)/20
  if step%11==0 then local p=k.pos[k.pieces[1].id];p.c=(seed+step)%5+1 end
  if step%13==0 then c:_start_verdict()end
  c:_verdict_step()
 end
 print('SEQ|'..seed..'|'..table.concat(log,','))
end
-- Actual source methods, extracted verbatim; only engine dependencies are stubs.
local f=assert(io.open('lua/engine_adapter_qianxing.lua','rb'));local s=f:read('*a');f:close()
local start=assert(s:find('function Adapter:_sync_floor',1,true));local stop=assert(s:find('function Adapter:_spawn_furn_tpl',start,true))
local methods=assert(load('local Adapter={};local function _num(v,d)return tonumber(v) or d end; '..s:sub(start,stop-1)..';return Adapter'))()
local trace={};local function record(n,...)local a={...};for i=1,#a do a[i]=tostring(a[i])end;trace[#trace+1]=n..':'..table.concat(a,',')end
local function obj(name)local o={};for _,m in ipairs({'SetAnchorMin','SetAnchorMax','SetPivot','SetSizeDelta','SetAnchoredPosition','SetVisible','SetActive'})do o[m]=function(self,...)record(name..'.'..m,...)end end;return o end
local slot,face=obj('slot'),obj('face');local x,y,w,h=1,2,100,100
local ctrl={GetAnchoredPosition=function()record('readpos');return x,y end,GetSizeDelta=function()record('readsize');return w,h end}
local a=setmetatable({cfg={}},{__index=methods});function a:_floor_slot()return slot end;function a:_fixed_floor_face()return face end;function a:_fit_child_sized(_,ww,hh)record('fit',ww,hh)end;function a:find()return {}end;function a:_furn_scale_layers(_,sx,sy)record('scale',sx,sy)end
game={InstantiateClientUIControl=function()record('instantiate');return obj('rug')end}
for i=1,60 do
 if i%3==0 then x=x+1 end;if i%7==0 then w=w+1 end;if i%11==0 then face=obj('face')end
 if i%13==0 then a._floor_layout=nil end
 if i%17==0 then a._furn_inst={}end
 a._furn_level=i%5~=0
 a:_sync_floor('cell.1.1',ctrl,i%4~=0)
 a:_spawn_whole_rug('cell.1.1',ctrl,'rug_2',{},w,h,{r=1,c=2},{dx=0,dy=0})
 print('ADAPTER|'..i..'|'..table.concat(trace,','));trace={}
end
