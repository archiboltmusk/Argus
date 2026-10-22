#Requires -Version 5.1
<#
  Build Argus Shipyard (the managed installer) locally.

    powershell -File scripts/build-shipyard.ps1             # build everything, print the exe path
    powershell -File scripts/build-shipyard.ps1 -Run        # ...and launch the installer
    powershell -File scripts/build-shipyard.ps1 -SkipApp    # reuse the existing app release build
    powershell -File scripts/build-shipyard.ps1 -RebuildApp # force a fresh app release build
    powershell -File scripts/build-shipyard.ps1 -Channel beta   # stamp the build as beta

  Or through pnpm for a plain build: pnpm shipyard. Pass switches straight through
  (pnpm shipyard -Run), but a literal "--" reaching PowerShell is rejected as a parameter
  name, so when in doubt call the script directly:
  powershell -File scripts/build-shipyard.ps1 -Run

  The frontend stamps itself from ARGUS_CHANNEL at build time: only "stable" clears the
  Beta label the app shows in About. -Channel sets it when this script builds the app;
  without it, an existing ARGUS_CHANNEL is respected, and the default is stable.

  Steps:
    1. app release build (pnpm tauri build --no-bundle) when argus.exe is missing or -RebuildApp
    2. standalone uninstaller (no payload, small)
    3. payload assembly + verification (make-payload.mjs)
    4. Argus Shipyard build + embedded-payload verification

  The build lands in installer/src-tauri/target/release/ as
  argus-shipyard-v<version>-<channel>.exe (for example argus-shipyard-v1.0.0-beta.exe),
  alongside the raw argus-shipyard.exe the release scripts consume.

  No signing, no staging, no publishing. For release artifacts use
  scripts/release-beta.ps1 (or pnpm release:stable / pnpm release:beta),
  which adds version checks, staging and signing.
#>
[CmdletBinding()]
param(
  [switch]$Run,
  [switch]$SkipApp,
  [switch]$RebuildApp,
  [ValidateSet('stable', 'beta')]
  [string]$Channel
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

# The channel for the app stamp and the output name: an explicit -Channel wins, then an
# existing ARGUS_CHANNEL, then the documented stable default. The file name is only ever
# stable or beta, so any non-stable stamp is labelled beta to match what the app shows.
$channel = if ($PSBoundParameters.ContainsKey('Channel')) {
  $Channel
} elseif ($env:ARGUS_CHANNEL) {
  $env:ARGUS_CHANNEL
} else {
  'stable'
}
$nameChannel = if ($channel -eq 'stable') { 'stable' } else { 'beta' }

function Step([string]$text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Invoke-Tool([string]$file, [string[]]$arguments) {
  & $file @arguments
  if ($LASTEXITCODE -ne 0) { throw "$file $($arguments -join ' ') failed with exit $LASTEXITCODE" }
}

if ($SkipApp -and $RebuildApp) { throw 'Use either -SkipApp or -RebuildApp, not both.' }

$appExe = 'src-tauri/target/release/argus.exe'
$shipyard = 'installer/src-tauri/target/release/argus-shipyard.exe'

# No staged extension runtime means this build ships without extension support. The layer's
# sources are tracked while its jars are gitignored, so a jarless checkout looks "present but
# broken" to capstan-stage and it stops when sh cannot fetch the jars. Point it at a path that
# does not exist so the build takes the documented no-layer path instead.
if (-not (Test-Path -LiteralPath 'src-tauri/resources/capstan/capstan.jar')) {
  if (-not $env:ARGUS_CAPSTAN_OPTIONAL) {
    Write-Host 'No extension runtime staged; building without it (ARGUS_CAPSTAN_OPTIONAL=1).' -ForegroundColor Yellow
    $env:ARGUS_CAPSTAN_OPTIONAL = '1'
  }
  $noLayer = Join-Path $env:TEMP 'argus-no-capstan-layer'
  Remove-Item -LiteralPath $noLayer -Recurse -Force -ErrorAction SilentlyContinue
  $env:ARGUS_CAPSTAN_SRC = $noLayer
}

# No staged game engine means this build ships tab-only games, which the payload script would
# otherwise refuse. Mirror the capstan fallback.
if (-not (Test-Path -LiteralPath 'src-tauri/resources/pokemon-engine/Argus.PokemonEngine.exe') -and -not $env:ARGUS_POKEMON_OPTIONAL) {
  Write-Host 'No game engine staged; shipping tab-only games (ARGUS_POKEMON_OPTIONAL=1).' -ForegroundColor Yellow
  $env:ARGUS_POKEMON_OPTIONAL = '1'
}

if (-not $SkipApp) {
  if ((Test-Path -LiteralPath $appExe) -and -not $RebuildApp) {
    Step "App build skipped (found $appExe; pass -RebuildApp to force)"
  } else {
    Step 'App release build (pnpm tauri build --no-bundle)'
    $env:ARGUS_CHANNEL = $channel
    Write-Host "  channel stamp: $env:ARGUS_CHANNEL"
    Invoke-Tool 'pnpm' @('tauri', 'build', '--no-bundle')
  }
}
if (-not (Test-Path -LiteralPath $appExe)) {
  throw "Missing $appExe. Run without -SkipApp first, or build it with: pnpm tauri build --no-bundle"
}

Step 'Uninstaller build'
Invoke-Tool 'cargo' @('build', '--manifest-path', 'installer/src-tauri/Cargo.toml', '--release',
  '--no-default-features', '--features', 'tauri/custom-protocol', '--bin', 'argus-uninstall', '--locked')

Step 'Payload'
Invoke-Tool 'node' @('installer/scripts/make-payload.mjs')
Invoke-Tool 'node' @('scripts/verify-managed-payload.mjs')

Step 'Shipyard build'
Invoke-Tool 'cargo' @('build', '--manifest-path', 'installer/src-tauri/Cargo.toml', '--release',
  '--features', 'tauri/custom-protocol', '--bin', 'argus-shipyard', '--locked')
Invoke-Tool 'node' @('scripts/verify-managed-payload.mjs', '--embedded')

$version = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
$named = "installer/src-tauri/target/release/argus-shipyard-v$version-$nameChannel.exe"
Copy-Item -LiteralPath $shipyard -Destination $named -Force
Write-Host "`nArgus Shipyard $version ($nameChannel) ready:" -ForegroundColor Green
Write-Host "  $((Resolve-Path $named).Path)"
Write-Host "  raw build output: $((Resolve-Path $shipyard).Path)"

if ($Run) {
  Step 'Launching Argus Shipyard'
  Start-Process -FilePath (Resolve-Path $named).Path
}
