package.path = 'lua/?.lua;lua/?/init.lua;' .. package.path
local Q = require('engine_adapter_qianxing')
local function container(name) return {name=name,kids={}} end
local content, rug, furn, portrait = container('content'),container('rug_layer'),container('furn'),container('portrait')
content.kids={rug,furn,portrait}
local reorder=0
local made={}
_G.game={InstantiateClientUIControl=function(prefab,parent)
 local o={name='new',parent=parent}
 function o:SetSiblingIndex() reorder=reorder+1 end
 function o:SetAsFirstSibling() reorder=reorder+1 end
 function o:SetAsLastSibling() reorder=reorder+1 end
 function o:SetVisible(v) self.visible=v end
 function o:SetActive(v) self.active=v end
 parent.kids[#parent.kids+1]=o;made[#made+1]=o;return o
end}
local ad=setmetatable({cfg={},_furn_prefabs={chair=1,rug=2},_furn_level=true}, {__index=Q.Adapter})
function ad:sub(_,n) return ({content=content,furn=furn,rug_layer=rug,portrait=portrait})[n] end
function ad:_cell_size_of() return 108,108 end
function ad:_furn_scale_layers() end
assert(ad:_spawn_furn_tpl('cell.1.1',content,'furn.chair'))
assert(ad:_spawn_furn_tpl('cell.1.1',content,'furn.rug'))
assert(made[1].parent==furn and made[2].parent==rug,'fixed layer parents')
assert(content.kids[3]==portrait and #content.kids==3,'portrait remains above both containers')
assert(ad:enforce_layers('cell.1.1')==0 and reorder==0,'no runtime sibling reordering')
assert(ad:_spawn_furn_tpl('cell.1.1',content,'furn.chair'))
assert(#made==2 and reorder==0,'reuse does not alter layers')
print('4 furniture layer regression checks passed')

-- 600: containers hidden by a screen transition must recover without sibling sorting.
local writes = 0
for _, layer in ipairs({rug, furn}) do
 function layer:SetVisible(v) self.visible=v;writes=writes+1 end
 function layer:SetActive(v) self.active=v;writes=writes+1 end
 function layer:SetSizeDelta(w,h) self.w=w;self.h=h;writes=writes+1 end
end
ad._furn_layer_state=nil
ad:_spawn_furn_tpl('cell.1.1',content,'furn.chair')
assert(furn.visible and furn.active and furn.w==108 and furn.h==108)
local steady=writes
ad:_spawn_furn_tpl('cell.1.1',content,'furn.chair')
assert(writes==steady,'steady reuse does not write layer properties')
furn.visible=false
ad:_repaint_cell_overlays('cell.1.1')
assert(furn.visible,'dirty visibility event restores parent')
ad:_prepare_furn_layer('cell.1.1','furn',89,89)
assert(furn.w==89 and furn.h==89,'resize updates fixed parent')
assert(reorder==0,'600 never reorders siblings')
print('5 fixed-layer visibility and performance checks passed')

local leaf={name='primitive',visible=true}
function leaf:SetVisible(v) self.visible=v end
function leaf:GetChildren() return {} end
furn.kids={leaf}
for _,o in ipairs({content,rug,furn,portrait}) do
 function o:GetChildren() return self.kids end
 if not o.SetVisible then function o:SetVisible(v) self.visible=v end end
end
local cell=container('cell.1.1');cell.kids={content}
function cell:GetChildren() return self.kids end
function cell:SetVisible(v) self.visible=v end
function cell:SetActive(v) self.active=v end
function ad:find() return cell end
ad:set_property('cell.1.1','visible',false)
assert(furn.visible==false and leaf.visible==true,'hide stops at fixed furniture layer')
ad:set_property('cell.1.1','visible',true)
ad:_repaint_cell_overlays('cell.1.1')
assert(furn.visible==true and leaf.visible==true,'restore preserves primitive visibility')
print('2 screen-transition primitive checks passed')
