# リモートとローカルを新しい方に合わせるスクリプト
# プロジェクトフォルダで: .\sync-remote.ps1

$ErrorActionPreference = "Stop"
Write-Host "=== 1. リモートの最新を取得 ===" -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== 2. 差分を確認 ===" -ForegroundColor Cyan
$count = git rev-list --left-right --count main...origin/main 2>$null
$parts = $count -split "\s+"
$remoteAhead = [int]$parts[0]  # リモートにあってローカルにない
$localAhead = [int]$parts[1]   # ローカルにあってリモートにない

Write-Host "リモートのみのコミット: $remoteAhead / ローカルのみのコミット: $localAhead"

if ($remoteAhead -gt 0 -and $localAhead -eq 0) {
    Write-Host ""
    Write-Host "=== リモートが新しい → pull で合わせます ===" -ForegroundColor Green
    git pull origin main
} elseif ($localAhead -gt 0 -and $remoteAhead -eq 0) {
    Write-Host ""
    Write-Host "=== ローカルが新しい → push で合わせます ===" -ForegroundColor Green
    git push origin main
} elseif ($remoteAhead -gt 0 -and $localAhead -gt 0) {
    Write-Host ""
    Write-Host "=== 両方に変更あり → マージしてから push ===" -ForegroundColor Yellow
    git merge origin/main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "コンフリクトがあります。解消後に git add . ; git commit してから再度 .\sync-remote.ps1 を実行してください。" -ForegroundColor Red
        exit 1
    }
    git push origin main
} else {
    Write-Host ""
    Write-Host "=== すでに同期済みです ===" -ForegroundColor Green
}
Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
