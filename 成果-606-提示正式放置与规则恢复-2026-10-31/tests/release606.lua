package.path='lua/?.lua;lua/?/init.lua;'..package.path
local Core=require('murdoku_core');local UI=require('ui_controller');local L=require('levels.case_001')
local n=0;local function check(x,m)n=n+1;assert(x,m)end
local k=Core.new(L)
check(k:hint(),'hint succeeds');check(k.placed.A==true,'hint formal');check(k.selected==nil,'hint deselect');local a=k.solution.A
check(k.grid[a.r][a.c]=='A','hint grid')
k:select_suspect('A');local rr,cc
for r=1,k.rows do for c=1,k.cols do if not k:is_blocked(r,c) and (r~=a.r or c~=a.c) then rr,cc=r,c end end end
check(k:hold_cell(rr,cc),'move hinted piece');check(k:hint(),'hint relocates');check(k.grid[rr][cc]~='A','old cell cleared');check(k.placed.A,'relocated formal')
local count=0;for r=1,k.rows do for c=1,k.cols do if k.grid[r][c]=='A' then count=count+1 end end end;check(count==1,'one A')
check(k:undo(),'undo hint');check(k.pos.A.r==rr and k.pos.A.c==cc,'undo old position');check(k.placed.A,'undo formal restored');check(k:redo(),'redo hint');check(k.pos.A.r==a.r and k.pos.A.c==a.c,'redo position');check(k.grid[rr][cc]~='A','redo no duplicate');check(k.placed.A,'redo formal')
local k2=Core.new(L);k2:select_suspect('A');check(k2:pre_place(a.r,a.c),'preplace');check(not k2.placed.A,'pre not formal');check(k2:hint(),'promote correct preplace');check(k2.placed.A,'promotion formal');check(k2:undo(),'undo promote');check(k2.grid[a.r][a.c]=='A' and not k2.placed.A,'promotion undo preplace')
local c=UI.new(Core.new(L),{skip_intro=true});c.screen=nil;c.core.selected='A'
local draws={};local clears=0;c._last_adapter={set_hold_ring=function(_,id,v)draws[#draws+1]=v end,clear_hold_ring=function()clears=clears+1 end}
c:on_cell_down(a.r,a.c,0,0);check(#draws==0,'down does not draw');c._press.dt=.19;c:_hold_progress(c._press);check(#draws==0,'short hold no draw');c._press.dt=.24;c:_hold_progress(c._press);check(#draws==1 and math.abs(draws[1]-.5)<1e-6,'progress after delay');c._press.dt=.28;c:_hold_progress(c._press);check(draws[2]==1,'full at original threshold');c:on_cell_drag(a.r,a.c,100,100);check(c._press==nil and clears>0,'drag clears');c:on_cell_down(a.r,a.c,0,0);c._press.dt=.1;check(not c:on_cell_up(a.r,a.c,0,0),'short release no place');check(not c.core.pos.A,'short release unchanged')
local AD=require('engine_adapter_qianxing');local ad=AD.new({});local hidden={};ad._portrait_want={['cell.1.1']={id=1},['cell.6.6']={id=2}};ad._paint_portrait=function(_,id,ctrl,want)hidden[id]=want==false;return true end
ad:clear_board_portraits();check(hidden['cell.1.1'] and hidden['cell.6.6'],'all cached portraits cleared');check(ad._portrait_want['cell.1.1']==false and ad._portrait_want['cell.6.6']==false,'replay cannot revive')
local f=assert(io.open('lua/main.lua','rb'));local src=f:read('*a');f:close()
src=src:gsub('\r\n','\n')
local block=assert(src:match('on_pick_level = function%(id%)(.-)\n    end,\n    %-%- 返回列表'))
local controller=UI.new(Core.new(L),{skip_intro=true});controller.screen=nil;controller.core:hint()
local env=setmetatable({controller=controller,level=L,Murdoku={remember_level=function()end,flush_effects=function()end},start_other=function()error('unexpected switch')end},{__index=_G})
local callback=assert(load('return function(id) '..block..' end','actual pick callback','t',env))()
callback(L.id);check(next(controller.core.pos)==nil,'same-level selection resets board')
controller.core:hint();controller._continue_requested=true;callback(L.id);check(controller.core.pos.A~=nil,'continue preserves board')
print('606 focused: '..n..' assertions passed')
