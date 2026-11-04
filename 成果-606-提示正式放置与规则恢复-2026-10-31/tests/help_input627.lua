package.path='lua/?.lua;'..package.path
local Tutorial=require('tutorial_ui')
Enum={CursorEventType={CursorClick=1}}
local pass=0
local function check(v,m) assert(v,m);pass=pass+1 end
local function control()
 local c={visible=false,listeners={}}
 function c:AddCursorEventListener(ev,fn) self.listeners[#self.listeners+1]=fn end
 function c:SetVisible(v) self.visible=v end
 function c:SetActive(v) self.active=v end
 function c:SetText(v) self.text=v end
 return c
end
local unsupported=setmetatable(control(),{__newindex=function(t,k,v) if k=='raycastTarget' or k=='interactable' then error('unsupported property') end rawset(t,k,v) end})
local util=Tutorial.new({find=function() return unsupported end})
local called=0
check(util:_bind('image',function() called=called+1 end,unsupported),'image binds when optional properties throw')
unsupported.listeners[1]();check(called==1,'registered callback runs')
local src=assert(io.open('lua/entry_client_script.lua','rb')):read('*a')
local block=assert(src:match('local help617 = .-\nlocal function tick_tutorial%(%)')):gsub('\nlocal function tick_tutorial%(%)$','')
local nodes={};for _,n in ipairs({'clues.help617','clues.help627.hit','home.tutorial627.hit','help617','help617.title','help617.body','help617.bg'}) do nodes[n]=control() end
local adapter={_lookup_gen=0,find=function(_,n) return nodes[n] end}
local binder=Tutorial.new(adapter)
local opened=0
local inst={init=function() end,go=function(_,n) check(n==1,'tutorial starts on page one') end,open_ui=function() opened=opened+1 end}
local current={level={id='case_001'},controller={}}
local env=setmetatable({adapter=adapter,TUT_SETS={l1={tag='l1'},home={tag='home'}},TUT_TRIGGER={case_001='l1'},tutorial_inst={},tutorial_seen={},Murdoku={current=function() return current end},tutorial_instance=function() return setmetatable(inst,{__index=binder}) end,current_tut_key=function() return current.key or current.level.id end,print=function() end},{__index=_G})
local state,bind,sync=assert(load(block..'\nreturn help617,bind_help617,sync_home_tutorial628','help-block','t',env))()
bind();check(state.entry_bound and not state.close_bound,'missing close does not block entry');nodes['clues.help627.hit'].listeners[1]();check(opened==1,'first lesson opens')
bind();check(#nodes['clues.help627.hit'].listeners==1,'retry does not duplicate listeners')
nodes['help617.close']=control();bind();check(state.bound,'late close binds')
local old=nodes['clues.help627.hit'];nodes['clues.help627.hit']=control();adapter._lookup_gen=1;bind();check(state.controls['clues.help627.hit']==nodes['clues.help627.hit'],'generation replaces cached entry');check(#nodes['clues.help627.hit'].listeners==1,'new entry receives listener');nodes['clues.help627.hit'].listeners[1]();check(opened==2,'new entry opens tutorial')
current={level={id='case_003',name='third',objects={chair={occupiable=true},table={occupiable=false}}},controller={}}
nodes['clues.help627.hit'].listeners[1]();check(state.open and nodes.help617.visible,'later level opens annotation');nodes['help617.close'].listeners[1]();check(not state.open and not nodes.help617.visible,'annotation closes')
current.controller.modal={};nodes['clues.help627.hit'].listeners[1]();check(not state.open,'modal blocks annotation')
current.controller.modal=nil
current.key='home'
nodes['home.tutorial627.hit'].listeners[1]();check(opened==3,'home entry opens home tutorial');check(env.tutorial_seen.home,'home seen marked')
current.key=nil
nodes['home.tutorial627.hit'].listeners[1]();check(opened==3,'home button cannot open in level')
current.key='home';current.controller.modal={}
nodes['home.tutorial627.hit'].listeners[1]();check(opened==3,'home modal blocks open')
current.controller.modal=nil
bind();check(#nodes['home.tutorial627.hit'].listeners==1,'home binding not duplicated')
nodes['home.tutorial627.hit']=control();adapter._lookup_gen=2;bind()
check(#nodes['home.tutorial627.hit'].listeners==1,'home new generation binds')
nodes['home.tutorial627.hit'].listeners[1]();check(opened==4,'home rebuilt entry opens')
-- Real adapter hide_unlisted must not hide either independent help layer.
local Adapter=require('engine_adapter_qianxing')
local image,hit=control(),control();image.name='clues.help617';hit.name='clues.help627.hit';image.visible=true;hit.visible=true
local root={GetChildren=function() return {image,hit} end}
local a=Adapter.new({})
a.find=function(_,name) if name=='root' then return root end end
a:hide_unlisted({});check(image.visible and hit.visible,'adapter preserves both help layers')
local homeNames={'home.tutorial627.bg','home.tutorial627.ring','home.tutorial627.label','home.tutorial627.hit'}
local homeKids={}
for _,name in ipairs(homeNames) do nodes[name]=control();nodes[name].name=name;homeKids[#homeKids+1]=nodes[name] end
adapter._lookup_gen=3;bind();sync(true)
for _,name in ipairs(homeNames) do check(nodes[name].visible,'home first shows '..name) end
sync(false)
for _,name in ipairs(homeNames) do check(not nodes[name].visible,'away hides '..name) end
sync(true)
for _,name in ipairs(homeNames) do check(nodes[name].visible,'return restores '..name) end
local savedOpen=opened;current.key='home';nodes['home.tutorial627.hit'].listeners[1]();check(opened==savedOpen+1,'returned home still opens tutorial')
local hroot={GetChildren=function() return homeKids end}
local b=Adapter.new({});b.find=function(_,name) if name=='home' then return hroot end end
b._hidden={home=true}
-- Feed the production hidden-subtree method its actual hidden-set field.
local adsrc=assert(io.open('lua/engine_adapter_qianxing.lua','rb')):read('*a')
local method=assert(adsrc:match('function Adapter:enforce_hidden_subtrees%(%)%s*(.-)local function decor'))
local field=assert(method:match('local hid = self%.([%w_]+)'))
b[field]={home=true};b:enforce_hidden_subtrees()
for _,name in ipairs(homeNames) do check(nodes[name].visible,'hidden traversal exempts '..name) end
adapter._lookup_gen=4
for _,name in ipairs(homeNames) do nodes[name]=control() end
bind();sync(true)
for _,name in ipairs(homeNames) do check(nodes[name].visible,'rebuilt home restores '..name) end
print('help_input628: '..pass..' passed')
