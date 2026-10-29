--[[----------------------------------------------------------------------------
  tools/perf_faithful/compare.lua —— 对比 bench.lua 的两次结果（v362）

  用法：lua tools/perf_faithful/compare.lua <旧标签> <新标签>
    读 out/result_<标签>.txt 与 out/state_<标签>.txt
    ① 每阶段引擎调用次数 / 实例化节点数：旧 → 新、变化百分比
    ② 最终界面状态逐行比对：0 处不同 = 两版界面结果相同（退出码 0）；有不同 ⇒ 列前 20 处，退出码 1
----------------------------------------------------------------------------]]--
local HERE = ((arg and arg[0] or ""):match("^(.*)[/\\][^/\\]*$") or ".") .. "/"
local A, B = arg[1], arg[2]
if A == nil or B == nil then print("用法：lua tools/perf_faithful/compare.lua <旧标签> <新标签>"); os.exit(2) end

local function lines_of(path)
  local fh = io.open(path, "rb")
  if fh == nil then print("!! 读不到 " .. path); os.exit(2) end
  local t = {}
  for l in fh:lines() do t[#t + 1] = (l:gsub("\r$", "")) end
  fh:close()
  return t
end

local function parse(label)
  local rows, order = {}, {}
  for _, l in ipairs(lines_of(HERE .. "out/result_" .. label .. ".txt")) do
    local name, io_, inst = l:match("^(%S.-)%s+(%d+)%s+%d+%s+%d+%s+(%d+)%s+%d+%s+%d+%s+[%d.]+")
    if name ~= nil and name ~= "phase" then
      order[#order + 1] = name
      rows[name] = { io = tonumber(io_), inst = tonumber(inst) }
    end
  end
  return order, rows
end

local oa, ra = parse(A)
local _, rb = parse(B)
local function pct(x, y) if x == 0 then return "    -" end return string.format("%+5.0f%%", (y - x) / x * 100) end
print(string.format("%-24s %12s %12s %7s   %8s %8s", "phase", "调用 " .. A, "调用 " .. B, "变化", "实例化旧", "实例化新"))
local ta, tb, ia, ib = 0, 0, 0, 0
for _, k in ipairs(oa) do
  local x, y = ra[k], rb[k] or { io = 0, inst = 0 }
  ta, tb, ia, ib = ta + x.io, tb + y.io, ia + x.inst, ib + y.inst
  print(string.format("%-24s %12d %12d %7s   %8d %8d", k, x.io, y.io, pct(x.io, y.io), x.inst, y.inst))
end
print(string.format("%-24s %12d %12d %7s   %8d %8d", "合计", ta, tb, pct(ta, tb), ia, ib))

local sa = lines_of(HERE .. "out/state_" .. A .. ".txt")
local sb = lines_of(HERE .. "out/state_" .. B .. ".txt")
local set = {}
for _, l in ipairs(sb) do set[l] = (set[l] or 0) + 1 end
local diff = {}
for _, l in ipairs(sa) do
  if (set[l] or 0) > 0 then set[l] = set[l] - 1 else diff[#diff + 1] = "- " .. l end
end
for l, n in pairs(set) do for _ = 1, n do diff[#diff + 1] = "+ " .. l end end
print(string.format("\n最终界面状态：%s %d 行 / %s %d 行，不同 %d 处", A, #sa, B, #sb, #diff))
for i = 1, math.min(20, #diff) do print("  " .. diff[i]) end
os.exit(#diff == 0 and 0 or 1)
