# 课堂评测系统 Electron 打包脚本
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$electronDir = $PSScriptRoot

Write-Host "=== 步骤1：构建前端 ===" -ForegroundColor Cyan
Set-Location "$root\client"
yarn build

Write-Host "=== 步骤2：复制文件到 electron 目录 ===" -ForegroundColor Cyan

# 复制前端 dist
$clientDist = "$electronDir\client-dist"
if (Test-Path $clientDist) { Remove-Item $clientDist -Recurse -Force }
Copy-Item "$root\client\dist" $clientDist -Recurse

# 复制后端 server
$serverDest = "$electronDir\server"
if (Test-Path $serverDest) { Remove-Item $serverDest -Recurse -Force }
New-Item -ItemType Directory -Path "$serverDest\src" | Out-Null
Copy-Item "$root\server\src\*" "$serverDest\src\" -Recurse
Copy-Item "$root\server\package.json" "$serverDest\package.json"

# 复制 node_modules（含 better_sqlite3.node）
Write-Host "  复制 server node_modules..." -ForegroundColor Gray
Copy-Item "$root\server\node_modules" "$serverDest\node_modules" -Recurse

Write-Host "=== 步骤3：安装 Electron 依赖 ===" -ForegroundColor Cyan
Set-Location $electronDir
yarn install --ignore-scripts

Write-Host "=== 步骤4：打包 exe ===" -ForegroundColor Cyan
yarn build

Write-Host "=== 步骤5：复制 better_sqlite3.node (Electron ABI) ===" -ForegroundColor Cyan
$nodeTarget = "$electronDir\dist-exe\win-unpacked\resources\server_modules\better-sqlite3\build\Release"
New-Item -ItemType Directory -Force -Path $nodeTarget | Out-Null
Copy-Item "$electronDir\node_modules\better_sqlite3.node" "$nodeTarget\better_sqlite3.node" -Force

Write-Host ""
Write-Host "=== 打包完成！===" -ForegroundColor Green
Write-Host "输出目录：$electronDir\dist-exe" -ForegroundColor Green
