package.path='lua/?.lua;lua/?/init.lua;'..package.path
local Core=require('murdoku_core');local UI=require('ui_controller')
local n=0;local function check(v,m)n=n+1;assert(v,m)end
local function new(level)local c=UI.new(Core.new(require('levels.'..level)),{skip_intro=true});c.screen=nil;return c end
local c=new('case_002');local k=c.core
-- Core slots are supplied by the runtime adapter; use the authoritative level clues in this isolated test.
k.clues=k.level.clues
local function menu()c:hint635_action('toggle')end
menu();check(c.hint635.kind=='menu','menu');c:hint635_action('close');check(k.hint635_used.position==0 and k.hint635_used.clue==0,'close free')
menu();c:hint635_action('position');check(c.hint635.text=='请先选中一张人物卡','no person');check(k.hint635_used.position==0,'no person free');c:hint635_action('close')
k:select_suspect('E');menu();c:hint635_action('position');check(k.pos.E.r==k.solution.E.r and k.pos.E.c==k.solution.E.c and k.placed.E,'selected E formal');check(not k.pos.A,'not sequential A');check(k.hint635_used.position==1 and k.hint635_used.clue==0,'independent position count')
k:undo();check(k.hint635_used.position==1,'undo no refund');k:select_suspect('A');menu();c:hint635_action('position');check(c.hint635.text=='本关揭示位置次数已用完','position limit');c:hint635_action('close')
k.selected=nil;c.focused_clue=nil;c._clue_sel_pos=nil;menu();c:hint635_action('clue');check(c.hint635.text=='请先选中一条线索卡','no clue');check(k.hint635_used.clue==0,'no clue free');c:tick(2.9);check(c.hint635~=nil,'before deadline');c:tick(.11);check(c.hint635==nil,'three second deadline')
menu();c:hint635_action('clue');k:select_suspect('D');menu();check(c.hint635==nil,'click hint dismisses reminder after selection')
-- Explicit card mapping mirrors runtime row mapping.
c._clue_pos_of_person=function(_,id) local m={A=1,B=2,C=3,D=4,E=5,V=6};return m[id] end
check(k:answer_clue(4)==false,'D false on solution');check(k:answer_clue(1)==true,'A true on solution');check(next(k.pos)==nil,'truth does not mutate guesses')
menu();c:hint635_action('clue');check(c.hint635.text=='该线索为假','false popup');check(k.hint635_used.clue==1,'first verification');c:hint635_action('close');k:select_suspect('A');menu();c:hint635_action('clue');check(c.hint635.text=='该线索为真','true popup');check(k.hint635_used.clue==2,'second verification');c:hint635_action('close');menu();c:hint635_action('clue');check(c.hint635.text=='本关验证线索次数已用完','clue limit');check(k.hint635_used.position==1,'position unaffected')
c:do_restart();check(c.hint635==nil and k.hint635_used==nil,'restart resets');local d=new('case_001');check(d.core.hint635_used==nil,'other level independent')
print('635 hints: '..n..' assertions passed')
