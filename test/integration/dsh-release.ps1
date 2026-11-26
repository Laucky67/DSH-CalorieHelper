param(
  [Parameter(Mandatory)] [string] $DshEntry,
  [string] $Package = 'dist/dsh-calorie-helper-0.2.2.tgz',
  [string] $Chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$DshEntry = (Resolve-Path -LiteralPath $DshEntry).Path
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('卡路里 发布验收-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $testRoot | Out-Null
$env:DSH_HOME = Join-Path $testRoot 'home'
$fixture = Join-Path $PSScriptRoot 'legacy-0.1.json'
$tgz = (Resolve-Path -LiteralPath $Package).Path
$members = @(tar -tzf $tgz)
if ($LASTEXITCODE) { throw 'Invalid release archive' }
foreach ($file in 'package/lib/index.js','package/lib/client.js','package/lib/data-layout.js','package/cordis.patch.yml','package/scripts/data.mjs') {
  if ($file -notin $members) { throw "Missing packaged file: $file" }
}
if ($members -match '^package/(?:test|\.scratch|storages)/') { throw 'Installed package contains local data or tests' }
& node $DshEntry plugin --profile web add $tgz --registry=https://registry.npmjs.org --ignore-scripts
if ($LASTEXITCODE) { throw 'DSH plugin installation failed' }
$storages = Join-Path $env:DSH_HOME 'storages'
New-Item -Path $storages -ItemType Directory -Force | Out-Null
$oldFile = Join-Path $storages 'calorie_helper.json'
Set-Content -LiteralPath $oldFile -Value '{invalid'
$legacy = (Get-Content -LiteralPath $fixture -Raw | ConvertFrom-Json).global
$priorHash = (Get-FileHash -LiteralPath $fixture).Hash
$pluginDirectory = Join-Path $storages 'calorie-helper'
$databaseFile = Join-Path $pluginDirectory 'calorie.sqlite'
$hosts = [System.Collections.Generic.List[object]]::new()
function Start-TestHost($name) {
  $out = Join-Path $testRoot "$name.out"
  $err = Join-Path $testRoot "$name.err"
  $arguments = @(('{0}{1}{0}' -f [char]34, $DshEntry), 'web', '--host', '127.0.0.1', '--port', '0', '--no-open')
  $process = Start-Process -FilePath (Get-Command node).Source -ArgumentList $arguments -WindowStyle Hidden -WorkingDirectory $testRoot -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
  $hosts.Add($process)
  $boot = $null
  for ($i = 0; $i -lt 150 -and !$boot; $i++) {
    if ($process.HasExited) { throw "DSH exited during boot. Logs in $testRoot" }
    $lines = Get-Content -LiteralPath $out -Raw -ErrorAction SilentlyContinue
    if ($lines -match 'http://127\.0\.0\.1:\d+[^\s]*') { $boot = $Matches[0] } else { Start-Sleep -Milliseconds 200 }
  }
  if (!$boot) { throw "DSH boot timeout. Logs in $testRoot" }
  $landing = Invoke-WebRequest $boot -SessionVariable session
  if ($landing.StatusCode -ne 200 -or $landing.Content -notmatch 'dsh-calorie-helper') { throw 'DSH boot graph is missing plugin' }
  return @{ process = $process; origin = ([uri]$boot).GetLeftPart([UriPartial]::Authority); session = $session; launch = $boot }
}
function Call-Plugin($server, $action, $request) {
  $json = @{ action = $action; input = $request } | ConvertTo-Json -Depth 12 -Compress
  $response = Invoke-RestMethod ($server.origin + '/api/calorie-helper') -Method Post -ContentType 'application/json; charset=utf-8' -Headers @{ Origin = $server.origin } -WebSession $server.session -Body ([Text.Encoding]::UTF8.GetBytes($json))
  return $response.result
}
try {
  $first = Start-TestHost 'first'
  $invalid = Invoke-WebRequest ($first.origin + '/api/calorie-helper') -Method Post -ContentType 'application/json' `
    -Headers @{ Origin = $first.origin } -WebSession $first.session -Body '{"action":"food_search","input":{}}' -SkipHttpErrorCheck
  if ($invalid.StatusCode -ne 500 -or ($invalid.Content | ConvertFrom-Json).error -notmatch '旧版卡路里数据格式有误') { throw 'Unsafe legacy data did not get a recoverable error' }
  if ((Get-Content -LiteralPath $oldFile -Raw) -notmatch '\{invalid') { throw 'Invalid migration input was overwritten' }
  Copy-Item -LiteralPath $fixture -Destination $oldFile -Force
  if (@(Call-Plugin $first 'food_search' @{}).Length -ne $legacy.foods.Length) { throw 'Migration could not recover without restarting host' }
  $second = Start-TestHost 'second'
  $anonymous = Invoke-WebRequest ($first.origin + '/api/calorie-helper') -Method Post -ContentType 'application/json' -Body '{}' -SkipHttpErrorCheck
  if ($anonymous.StatusCode -ne 401) { throw 'Anonymous access was not rejected' }
  $foreign = Invoke-WebRequest ($first.origin + '/api/calorie-helper') -Method Post -ContentType 'application/json' -Body '{}' -Headers @{Origin='https://example.invalid'} -WebSession $first.session -SkipHttpErrorCheck
  if ($foreign.StatusCode -ne 403) { throw 'Cross-origin access was not rejected' }
  if (!(Test-Path $databaseFile) -or (Test-Path $oldFile)) { throw 'SQLite migration or relocation failed' }
  if ((Get-FileHash -LiteralPath (Join-Path $pluginDirectory 'legacy-calorie_helper.json')).Hash -ne $priorHash) { throw 'Migration archive bytes differ' }
  foreach ($food in $legacy.foods) {
    $found = @(Call-Plugin $first 'food_search' @{ id = $food.id })
    if ($found.Length -ne 1 -or $found[0].name -ne $food.name) { throw 'Migrated food mismatch' }
  }
  foreach ($entry in $legacy.entries) {
    $found = Call-Plugin $second 'diet_query' @{ id = $entry.id }
    if ($found.items[0].foodId -ne $entry.foodId -or $found.items[0].amount.value -ne $entry.amount.value) { throw 'Migrated record mismatch' }
  }
  $historical = Call-Plugin $first 'daily_summary' @{ date = $legacy.profiles[0].effectiveDate }
  if ($null -eq $historical.maintenanceKcal) { throw 'Migrated historical maintenance calories missing' }
  $food = Call-Plugin $first 'food_create' @{ name = '升级验证饭团'; nutrition = @{ per = @{ value = 1; unit = '个' }; values = @{ energyKcal = 90 } } }
  $request = @{ date = '2026-11-24'; meal = 'lunch'; operationId = [guid]::NewGuid().ToString(); items = @(@{ foodId = $food.id; amount = @{ value = 2; unit = '个' } }) }
  $initial = @(Call-Plugin $second 'diet_create' $request)
  $replay = @(Call-Plugin $first 'diet_create' $request)
  if ($initial.Length -ne 1 -or $initial[0].id -ne $replay[0].id) { throw 'Cross-host idempotency failed' }
  $newRecord = Call-Plugin $first 'diet_query' @{ id = $initial[0].id }
  if ($newRecord.totalKcal -ne 180) { throw 'Unexpected calories' }
  $dataTool = Join-Path $env:DSH_HOME 'profiles/web/node_modules/dsh-calorie-helper/scripts/data.mjs'
  $backupPath = & node $dataTool backup
  if ($LASTEXITCODE -or !(Test-Path $backupPath)) { throw 'Snapshot failed' }
  $second.process.Kill()
  $second.process.WaitForExit()
  $restarted = Start-TestHost 'restarted'
  $afterRestart = @(Call-Plugin $restarted 'diet_create' $request)
  if ($afterRestart[0].id -ne $initial[0].id) { throw 'Restart replay failed' }
  $env:DSH_HOME = Join-Path $testRoot 'restore-home'
  & node $dataTool restore $backupPath
  if ($LASTEXITCODE) { throw 'Restore failed' }
  $restoredPath = Join-Path $env:DSH_HOME 'storages/calorie-helper/calorie.sqlite'
  node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync(process.argv[1]); if (db.prepare('SELECT count(*) AS total FROM diet_entries').get().total !== Number(process.argv[2])) process.exitCode=1; db.close()" $restoredPath ($legacy.entries.Length + 1)
  if ($LASTEXITCODE) { throw 'Restored rows mismatch' }
  & node $dataTool restore $backupPath 2>$null
  if ($LASTEXITCODE -ne 1) { throw 'Restore overwrote an existing database' }
  & node $DshEntry plugin --profile web add $tgz --registry=https://registry.npmjs.org --ignore-scripts
  if ($LASTEXITCODE) { throw 'Unable to install in restored home' }
  $restored = Start-TestHost 'restored'
  if ((Call-Plugin $restored 'diet_query' @{ id = $initial[0].id }).totalKcal -ne 180) { throw 'Restored route returned different calories' }
  $env:CALORIE_SMOKE_BOOT_URL = $first.launch
  & node (Join-Path $PSScriptRoot 'browser.mjs') (Join-Path $testRoot 'chrome') $Chrome
  if ($LASTEXITCODE) { throw 'Browser workflow failed' }
  $env:DSH_HOME = Join-Path $testRoot 'home'
  Write-Output "Passed: archive contents, authentication, failed migration recovery, archived source, historical profile, two DSH hosts, durable replay, live backup and restored route. $testRoot"
  Get-FileHash -LiteralPath $tgz | Select-Object Algorithm,Hash
} finally {
  foreach ($process in $hosts) { if (!$process.HasExited) { $process.Kill(); $process.WaitForExit() } }
}
