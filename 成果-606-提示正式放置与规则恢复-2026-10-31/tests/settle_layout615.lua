-- 615: exit-menu four buttons use the no-countdown editor layout; cancel moves down only while the countdown is visible.
package.path='lua/?.lua;lua/?/init.lua;'..package.path
local Main=require('main')
local Core=require('murdoku_core')
local UI=require('ui_controller')
local A=require('engine_adapter_qianxing').Adapter
local L=require('levels.case_001')
local n=0
local function check(x,msg) assert(x,msg);n=n+1;print('  [PASS] '..msg) end
local function node(c,id) for _,q in ipairs(c:build_layout()) do if q.id==id then return q end end end

Main.reset_settle_session()
local session=Main.get_settle_session()
local c=UI.new(Core.new(L),{skip_intro=true,settle_session=session});c.screen=nil
c.modal={kind='exit_menu'}
check(node(c,'modal.cancel').settle_shift==30,'countdown visible: cancel yields one line')
check(node(c,'modal.settle.countdown').visible==true,'countdown label visible')
Main.advance_settle_session(60);c:tick(60)
check(node(c,'modal.cancel').settle_shift==0,'countdown finished: cancel back to original layout')
check(node(c,'modal.settle.countdown').visible==false,'countdown label hidden')
for _,id in ipairs({'modal.exit','modal.save','modal.settle'}) do check(node(c,id).settle_shift==nil,id..' never moved') end
Main.reset_settle_session();session=Main.get_settle_session()
c=UI.new(Core.new(L),{skip_intro=true,settle_session=session});c.screen=nil;c.modal={kind='exit_menu'}
c.core.status='solved'
check(node(c,'modal.cancel').settle_shift==0,'win early unlock also restores layout')
c.modal={kind='share',code='x'}
check(node(c,'modal.cancel').settle_shift==0,'other modals use original position')

-- adapter: base read once from editor position, no accumulation, writes absolute positions
local writes,reads={},0
local ctrl={x=0,y=-160}
function ctrl:GetAnchoredPosition() reads=reads+1;return self.x,self.y end
function ctrl:SetAnchoredPosition(x,y) self.x,self.y=x,y;writes[#writes+1]=y end
local ad=setmetatable({find=function() return ctrl end},A)
for _=1,3 do ad:set_property('modal.cancel','settle_shift',30);ad:set_property('modal.cancel','settle_shift',0) end
check(ctrl.y==-160,'repeated open/close returns exactly to editor position')
check(reads==1,'editor base read only once')
check(writes[1]==-190 and writes[2]==-160,'shift moves down 30 and back')
local ctrl2={x=0,y=-160,GetAnchoredPosition=ctrl.GetAnchoredPosition,SetAnchoredPosition=ctrl.SetAnchoredPosition}
ad.find=function() return ctrl2 end
ad:set_property('modal.cancel','settle_shift',30)
check(ctrl2.y==-190,'new control handle re-reads base')
print('settle_layout615: '..n..' passed')
