# Sync local and remote - ASCII only
$ErrorActionPreference = "Stop"
git fetch origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$count = git rev-list --left-right --count main...origin/main 2>$null
$parts = $count -split "\s+"
$remoteAhead = [int]$parts[0]
$localAhead = [int]$parts[1]
if ($remoteAhead -gt 0 -and $localAhead -eq 0) {
    git pull origin main
} elseif ($localAhead -gt 0 -and $remoteAhead -eq 0) {
    git push origin main
} elseif ($remoteAhead -gt 0 -and $localAhead -gt 0) {
    git merge origin/main
    if ($LASTEXITCODE -ne 0) { exit 1 }
    git push origin main
}
