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
local nodes={};for _,n in ipairs({'clues.help617','help617','help617.title','help617.body','help617.bg'}) do nodes[n]=control() end
local adapter={_lookup_gen=0,find=function(_,n) return nodes[n] end}
local binder=Tutorial.new(adapter)
local opened=0
local inst={init=function() end,go=function(_,n) check(n==1,'tutorial starts on page one') end,open_ui=function() opened=opened+1 end}
local current={level={id='case_001'},controller={}}
local env=setmetatable({adapter=adapter,TUT_SETS={l1={tag='l1'}},TUT_TRIGGER={case_001='l1'},tutorial_inst={},tutorial_seen={},Murdoku={current=function() return current end},tutorial_instance=function() return setmetatable(inst,{__index=binder}) end,current_tut_key=function() return current.level.id end,print=function() end},{__index=_G})
local state,bind=assert(load(block..'\nreturn help617,bind_help617','help-block','t',env))()
bind();check(state.entry_bound and not state.close_bound,'missing close does not block entry');nodes['clues.help617'].listeners[1]();check(opened==1,'first lesson opens')
bind();check(#nodes['clues.help617'].listeners==1,'retry does not duplicate listeners')
nodes['help617.close']=control();bind();check(state.bound,'late close binds')
local old=nodes['clues.help617'];nodes['clues.help617']=control();adapter._lookup_gen=1;bind();check(state.controls['clues.help617']==nodes['clues.help617'],'generation replaces cached entry');check(#nodes['clues.help617'].listeners==1,'new entry receives listener');nodes['clues.help617'].listeners[1]();check(opened==2,'new entry opens tutorial')
current={level={id='case_003',name='third',objects={chair={occupiable=true},table={occupiable=false}}},controller={}}
nodes['clues.help617'].listeners[1]();check(state.open and nodes.help617.visible,'later level opens annotation');nodes['help617.close'].listeners[1]();check(not state.open and not nodes.help617.visible,'annotation closes')
current.controller.modal={};nodes['clues.help617'].listeners[1]();check(not state.open,'modal blocks annotation')
print('help_input624: '..pass..' passed')
