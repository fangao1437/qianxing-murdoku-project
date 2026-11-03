-- 619: help entry binding is independent; tutorial overlays suppress the home settle countdown.
local root = (arg and arg[0] and arg[0]:match("^(.*)[/\\]tests[/\\][^/\\]*$")) or "."
local pass, fail = 0, 0
local function ok(v, msg) if v then pass = pass + 1 else fail = fail + 1; print("FAIL " .. msg) end end
local src = assert(io.open(root .. "/lua/entry_client_script.lua", "rb")):read("*a")
local ui = assert(io.open(root .. "/lua/ui_controller.lua", "rb")):read("*a")
local block = src:match("%-%- 619: entry button.-local function tick_tutorial%(%)")
ok(block ~= nil, "619 help block exists")
ok(block and block:find("entry_bound", 1, true) and block:find("close_bound", 1, true), "entry and close bind independently")
ok(block and not block:find("if controls%[name%] == nil then return end"), "missing popup child no longer blocks entry")
ok(block and block:find("overlay_open()", 1, true), "help ignores clicks while another overlay is open")
ok(block and block:find("inst:go(1)", 1, true) and block:find("inst:open_ui()", 1, true), "levels with tutorial open page 1")
ok(src:find("bind_help617%(%)%s+if help617%.open") ~= nil, "binding retried until ready")
ok(not src:find("sync_overlay_state()", 1, true), "no countdown overlay coupling")
ok(not ui:find('and not self.overlay_open', 1, true), "countdown behavior retained")
print(string.format("help_overlay619: %d passed, %d failed", pass, fail))
if fail > 0 then os.exit(1) end
