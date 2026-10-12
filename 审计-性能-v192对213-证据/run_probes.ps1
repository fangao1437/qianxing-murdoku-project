# perf-compare-192-213 / run_probes.ps1
# 只读地跑 qianxing-murdoku 仓库里的探针，对 staged 产物做 A/B，把逐字输出落到 raw/。
# 不修改 qianxing-murdoku 里的任何文件。
#
# 用法： pwsh -File run_probes.ps1            # 跑全矩阵
#        pwsh -File run_probes.ps1 -Quick     # 只跑 v192 / v213

param([switch]$Quick)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$RepoRoot  = 'D:\新建文件夹\miHoYo Launcher\qianxing-murdoku'
$OutRoot   = 'D:\新建文件夹\miHoYo Launcher\perf-compare-192-213'
$ArtDir    = Join-Path $OutRoot 'artifacts'
$RawDir    = Join-Path $OutRoot 'raw'
New-Item -ItemType Directory -Force -Path $RawDir | Out-Null

$Frames = '300'   # perframe_engine_calls 的稳态帧数（与 20/30 帧节流位对齐：300 = 10x30）

# 探针 -> 除产物路径外要补的参数
$CoreProbes = [ordered]@{
  'tests/_wip/perframe_engine_calls.lua'   = @($Frames)
  'tests/_wip/render_cost.lua'             = @()
  'tests/_wip/render_geom_writes.lua'      = @()
  'tests/_wip/geo_write_count.lua'         = @()
  'tests/_wip/vis_write_count.lua'         = @()
  'tests/_wip/cursor_latch_count.lua'      = @()
  'tests/_wip/bound_rearm_count.lua'       = @()
  'tests/_wip/ruler_cost.lua'              = @()
  'tests/_wip/ruler_write_count.lua'       = @()
  'tests/_wip/probe_throttle_cost.lua'     = @()
  'tests/sub_miss_cache.lua'               = @()
  'tests/overlap_diag_once.lua'            = @()
  'tests/grid_cost.lua'                    = @()
}
$ExtraProbes = [ordered]@{
  'tests/_wip/ruler_method_exists.lua'          = @()
  'tests/_wip/probe_double_bind.lua'            = @()
  'tests/_wip/probe_event_table.lua'            = @()
  'tests/_wip/probe_event_slots_independent.lua'= @()
  'tests/perframe_throttle.lua'                 = @()
  'tests/anchored_pos_guard.lua'                = @()
  'tests/bound_rearm.lua'                       = @()
  'tests/dupe_dispatch.lua'                     = @()
  'tests/prop_ledger.lua'                       = @()
}

$Artifacts = if ($Quick) { @('v192','v213') } else { @('v192','v212','v213','v216') }
$ExtraArtifacts = @('v192','v213')

$index = New-Object System.Collections.Generic.List[string]
$index.Add(("probe`tartifact`texit`tms`tbytes`tfile"))

function Invoke-One {
  param([string]$Probe, [string[]]$ExtraArgs, [string]$Art)
  $artPath = Join-Path $ArtDir "$Art.lua"
  if (-not (Test-Path $artPath)) { return }
  $tag  = ($Probe -replace '^tests/','' -replace '/','_' -replace '\\','_' -replace '\.lua$','')
  $file = Join-Path $RawDir ("{0}__{1}.txt" -f $tag, $Art)
  $argv = @($Probe, $artPath) + $ExtraArgs
  $t0 = Get-Date
  $out = & lua @argv 2>&1
  $code = $LASTEXITCODE
  $ms = [int]((Get-Date) - $t0).TotalMilliseconds
  $text = ($out | ForEach-Object { $_.ToString() }) -join "`r`n"
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($file, $text + "`r`n", $enc)
  $bytes = (Get-Item $file).Length
  $index.Add(("{0}`t{1}`t{2}`t{3}`t{4}`t{5}" -f $Probe, $Art, $code, $ms, $bytes, $file))
  Write-Host ("{0,-46} {1,-6} exit={2} {3,6}ms {4,7}B" -f $Probe, $Art, $code, $ms, $bytes)
}

Push-Location $RepoRoot
try {
  Write-Host "=== 核心探针 x $($Artifacts -join ',') ==="
  foreach ($p in $CoreProbes.Keys) {
    foreach ($a in $Artifacts) { Invoke-One -Probe $p -ExtraArgs $CoreProbes[$p] -Art $a }
  }
  Write-Host "=== 补充探针 x $($ExtraArtifacts -join ',') ==="
  foreach ($p in $ExtraProbes.Keys) {
    foreach ($a in $ExtraArtifacts) { Invoke-One -Probe $p -ExtraArgs $ExtraProbes[$p] -Art $a }
  }
} finally {
  Pop-Location
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines((Join-Path $RawDir '_index.tsv'), $index, $enc)
}
Write-Host "done -> $RawDir"
