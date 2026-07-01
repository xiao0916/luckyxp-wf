param(
  [string[]] $AgentSkillDirs = @(".opencode\skills", ".codex\skills", ".cursor\skills", ".trae\skills"),
  [ValidateSet("Junction", "SymbolicLink")]
  [string] $LinkType = "Junction",
  [switch] $Force
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  $scriptDir = Split-Path -Parent $PSCommandPath
  return (Resolve-Path (Join-Path $scriptDir "..")).Path
}

function Test-DirectoryEmpty {
  param([string] $Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $true
  }

  return @((Get-ChildItem -LiteralPath $Path -Force)).Count -eq 0
}

function Get-LinkTargetPath {
  param([System.IO.FileSystemInfo] $Item)

  if ($null -eq $Item -or $null -eq $Item.Target -or $Item.Target.Count -eq 0) {
    return $null
  }

  return (Resolve-Path $Item.Target[0]).Path
}

$repoRoot = Resolve-RepoRoot
$skillsPath = Join-Path $repoRoot "skills"

if (-not (Test-Path -LiteralPath $skillsPath -PathType Container)) {
  throw "Missing skills directory: $skillsPath"
}

$canonicalSkillsPath = (Resolve-Path $skillsPath).Path

$normalizedAgentSkillDirs = foreach ($entry in $AgentSkillDirs) {
  foreach ($path in ($entry -split ",")) {
    $trimmedPath = $path.Trim()
    if ($trimmedPath.Length -gt 0) {
      $trimmedPath
    }
  }
}

foreach ($relativePath in $normalizedAgentSkillDirs) {
  $linkPath = Join-Path $repoRoot $relativePath
  $parentPath = Split-Path -Parent $linkPath

  if (-not (Test-Path -LiteralPath $parentPath -PathType Container)) {
    New-Item -ItemType Directory -Path $parentPath | Out-Null
  }

  if (Test-Path -LiteralPath $linkPath) {
    $item = Get-Item -LiteralPath $linkPath -Force

    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      $currentTarget = Get-LinkTargetPath $item

      if ($currentTarget -eq $canonicalSkillsPath) {
        Write-Host "[OK] $relativePath already points to skills/"
        continue
      }

      if (-not $Force) {
        throw "$relativePath is a link, but it points to '$currentTarget'. Re-run with -Force to replace it."
      }

      Remove-Item -LiteralPath $linkPath
    } elseif (Test-DirectoryEmpty $linkPath) {
      Remove-Item -LiteralPath $linkPath
    } else {
      throw "$relativePath exists and is not empty. Move or remove it manually before creating the link."
    }
  }

  New-Item -ItemType $LinkType -Path $linkPath -Target $canonicalSkillsPath | Out-Null
  Write-Host "[CREATED] $relativePath -> $canonicalSkillsPath ($LinkType)"
}
