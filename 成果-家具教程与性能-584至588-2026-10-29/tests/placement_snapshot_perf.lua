-- Run from archive root: lua tests/placement_snapshot_perf.lua <baseline-controller.lua>
-- Baseline: ui_controller.lua from commit 9229c9f5b918 (or 5e53156).
-- No engine/FPS claims: isolated real controller methods, Lua runtime printed below.
local baseline = assert(arg[1], 'provide baseline controller source path')
local function load_methods(path)
  local f=assert(io.open(path,'rb')); local s=f:read('*a'); f:close()
  local a=assert(s:find('function Controller:_placement_snapshot()',1,true))
  local b=assert(s:find('function Controller:_settle_by_roles()',a,true))
  local C={}; local env=setmetatable({Controller=C,M={VERDICT_RING_SECONDS=.4,VERDICT_RING_GAP=.15}},{__index=_G})
  assert(load(s:sub(a,b-1),'@'..path,'t',env))()
  return C
end
local old,new=load_methods(baseline),load_methods('lua/ui_controller.lua')
local function encode(v)
  if type(v)~='table' then return type(v)..':'..tostring(v) end
  local keys={}; for k in pairs(v) do keys[#keys+1]=k end
  table.sort(keys,function(a,b) return tostring(a)<tostring(b) end)
  local out={}; for _,k in ipairs(keys) do out[#out+1]=encode(k)..'='..encode(v[k]) end
  return '{'..table.concat(out,',')..'}'
end
local function make(C,n,wrong,trace)
  local c=setmetatable({core={pieces={},pos={},solution={},level={id=1}},now=0},{__index=C})
  for i=1,n do c.core.pieces[i]={id=i}; c.core.pos[i]={r=i,c=1}; c.core.solution[i]={r=i,c=wrong and 2 or 1} end
  function c:cell_id(r,col) return r..':'..col end
  function c:_clear_hold_progress() end
  function c:_settle_by_roles() self.settles=(self.settles or 0)+1 end
  c._last_adapter={clear_verdict_rings=function() if trace then trace[#trace+1]='clear' end end,
    set_verdict_ring=function(_,cell,ok,a) if trace then trace[#trace+1]={cell,ok,a} end end}
  return c
end
local mutations={
 function(c) end,
 function(c) c.core.pos[1].r=9 end,
 function(c) c.core.pos[1].c=9 end,
 function(c) c.core.pos[1]=nil end,
 function(c) c.core.pos[1]={r=1,c=1} end,
 function(c) c.core.pos={} end,
 function(c) c.core.pieces[1].id=9 end,
 function(c) c.core.pieces[1],c.core.pieces[2]=c.core.pieces[2],c.core.pieces[1] end,
 function(c) table.remove(c.core.pieces) end,
 function(c) c.core.pieces[#c.core.pieces+1]={id=20} end,
 function(c) c.core.pos=nil end,
 function(c) c.core.pieces=nil end,
 function(c) c.core=nil end,
 function(c) c.screen='home' end,
 function(c) c.core.level.id=2 end,
 function(c) c.core.pos[1].r=nil end,
 function(c) c.core.pos[1]=false end,
 function(c) c.core.pos[1]={} end,
}
local count=0
for _,wrong in ipairs({false,true}) do
 for _,t in ipairs({0,.4,.55,3.15,3.1500000000000004,4,20}) do
  for _,mutate in ipairs(mutations) do
   local function scenario(C)
    local trace={}; local c=make(C,6,wrong,trace)
    local result=c:_start_verdict(); c.now=t; c:_verdict_step(); mutate(c)
    for _,dt in ipairs({0,.01,1,10}) do c.now=t+dt; c:_verdict_step() end
    local v=c._verdict
    return encode({trace=trace,result=result,settles=c.settles,dirty=c.dirty,verdict=v and {done=v.done,last=v.last,animation_complete=v.animation_complete,wrong=v.wrong}})
   end
   assert(scenario(old)==scenario(new),'behavior mismatch '..count); count=count+1
  end
 end
end
-- Snapshot edge cases, including nil holes, false positions and independent snapshots.
for _,C in ipairs({old,new}) do
 for _,mode in ipairs({'empty','nilcore','nilpieces','nilid','nilcoords','falsepos'}) do
  local c=make(C,2,true)
  if mode=='empty' then c.core.pieces={} elseif mode=='nilcore' then c.core=nil
  elseif mode=='nilpieces' then c.core.pieces=nil elseif mode=='nilid' then c.core.pieces[1].id=nil
  elseif mode=='nilcoords' then c.core.pos[1]={} elseif mode=='falsepos' then c.core.pos[1]=false end
  local snap=c:_placement_snapshot(); assert(c:_placement_matches(snap),mode)
 end
 local c=make(C,6,true); local first=c:_placement_snapshot()
 c.core.pos[1].r=9; local second=c:_placement_snapshot()
 assert(not c:_placement_matches(first)); assert(c:_placement_matches(second))
end
print('behavior scenarios',count,'snapshot edge checks passed',_VERSION)
local function setup(C,kind)
 local c=make(C,6,true); c:_start_verdict()
 if kind=='done' then c.now=20; c:_verdict_step() end
 if kind=='submit' then return function() c:_start_verdict() end end
 if kind=='change' then return function() c:_start_verdict(); c.core.pos[1].r=10-c.core.pos[1].r; c:_verdict_step() end end
 if kind=='animation' then local i=0; return function() i=i+1; c.now=(i%300)/100; c:_verdict_step() end end
 return function() c:_verdict_step() end
end
local function measure(C,kind,n,allocation)
 local run=setup(C,kind); for i=1,1000 do run() end
 collectgarbage('collect'); if allocation then collectgarbage('stop') end
 local mem=collectgarbage('count'); local start=os.clock()
 for i=1,n do run() end
 local elapsed=(os.clock()-start)*1e6/n; local bytes=(collectgarbage('count')-mem)*1024/n
 collectgarbage('restart'); return elapsed,bytes
end
local function median(t) table.sort(t); return t[3] end
for _,kind in ipairs({'submit','change','done','animation'}) do
 local times={{},{}}
 for round=1,5 do
  for j=1,2 do local idx=round%2==0 and (3-j) or j
   times[idx][round]=measure(idx==1 and old or new,kind,100000,false)
  end
 end
 local _,a=measure(old,kind,3000,true); local _,b=measure(new,kind,3000,true)
 print(string.format('%s old_us=%.4f new_us=%.4f old_bytes=%.3f new_bytes=%.3f',kind,median(times[1]),median(times[2]),a,b))
end
