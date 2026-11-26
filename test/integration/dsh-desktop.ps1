param(
  [Parameter(Mandatory)] [string] $Runtime,
  [string] $Package = 'dist/dsh-calorie-helper-0.2.0.tgz',
  [string] $LegacyPackage
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Runtime = (Resolve-Path -LiteralPath $Runtime).Path
$exe = Join-Path $Runtime 'DeepSeek Harness.exe'
$cli = Join-Path $Runtime 'resources/runtime/cli/bin/dsh.cmd'
$tgz = (Resolve-Path -LiteralPath $Package).Path
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('calorie-native-proof-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -Path $testRoot -ItemType Directory | Out-Null
$env:DSH_HOME = Join-Path $testRoot 'home'
$desktopProfile = Join-Path $testRoot 'electron'
$env:DSH_DESKTOP_USER_DATA_DIR = $desktopProfile
$env:ELECTRON_ENABLE_LOGGING = '1'

function Start-IsolatedDesktop($name) {
  $port = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $port.Start()
  $number = $port.LocalEndpoint.Port
  $port.Stop()
  $args = @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$number", ('--user-data-dir={0}{1}{0}' -f [char]34, $desktopProfile))
  $process = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $Runtime -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $testRoot "$name.out") -RedirectStandardError (Join-Path $testRoot "$name.err")
  return @{ process = $process; port = $number }
}

function Stop-IsolatedDesktop($run) {
  if ($run -and !$run.process.HasExited) { $run.process.Kill($true); $run.process.WaitForExit() }
}

$run = $null
try {
  $run = Start-IsolatedDesktop 'initialize'
  $manifest = Join-Path $env:DSH_HOME 'profiles/desktop/package.json'
  $deadline = [DateTime]::UtcNow.AddSeconds(35)
  while (!(Test-Path -LiteralPath $manifest) -and [DateTime]::UtcNow -lt $deadline -and !$run.process.HasExited) {
    Start-Sleep -Milliseconds 200
  }
  if (!(Test-Path -LiteralPath $manifest)) { throw "Native DSH did not initialize the isolated profile in $testRoot" }
  Stop-IsolatedDesktop $run
  if ($LegacyPackage) {
    & $cli plugin --profile desktop add (Resolve-Path -LiteralPath $LegacyPackage).Path --registry=https://registry.npmjs.org --ignore-scripts
    if ($LASTEXITCODE) { throw 'Native DSH rejected the legacy package' }
  }
  & $cli plugin --profile desktop add $tgz --registry=https://registry.npmjs.org --ignore-scripts
  if ($LASTEXITCODE) { throw "Native DSH rejected the release package in $testRoot" }
  $storages = Join-Path $env:DSH_HOME 'storages'
  New-Item -Path $storages -ItemType Directory -Force | Out-Null
  $legacy = Join-Path $storages 'calorie_helper.json'
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'legacy-0.1.json') -Destination $legacy
  $legacyHash = (Get-FileHash -LiteralPath $legacy).Hash
  $run = Start-IsolatedDesktop 'upgrade'
  node (Join-Path $PSScriptRoot 'browser.mjs') $desktopProfile $exe $run.port
  if ($LASTEXITCODE) { throw "Native DSH browser assertions failed. See $testRoot" }
  Stop-IsolatedDesktop $run
  $database = Join-Path $storages 'calorie-helper/calorie.sqlite'
  $archive = Join-Path $storages 'calorie-helper/legacy-calorie_helper.json'
  if (!(Test-Path -LiteralPath $database) -or (Test-Path -LiteralPath $legacy) -or (Get-FileHash -LiteralPath $archive).Hash -ne $legacyHash) {
    throw "Native migration did not publish the expected database and legacy archive in $testRoot"
  }
  $run = Start-IsolatedDesktop 'restart'
  $env:CALORIE_RESTART_CHECK = 'true'
  node (Join-Path $PSScriptRoot 'browser.mjs') $desktopProfile $exe $run.port
  if ($LASTEXITCODE) { throw "Native DSH restart checks failed. See $testRoot" }
  Write-Output "Passed: signed official native DSH, installed artifact, real Electron UI, SQLite migration and restart. $testRoot"
  Get-FileHash -LiteralPath $tgz | Select-Object Algorithm,Hash
} finally {
  Stop-IsolatedDesktop $run
}
