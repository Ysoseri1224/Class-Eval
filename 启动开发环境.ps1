# 课堂评测系统 - 一键启动开发环境
# 同时启动后端（端口3001）和前端开发服务器（端口5173）

$root = $PSScriptRoot

Write-Host "=== 课堂评测系统 启动中 ===" -ForegroundColor Cyan

# 启动后端
Write-Host "启动后端服务器..." -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\server'; node src/index.js" -PassThru

Start-Sleep 2

# 启动前端
Write-Host "启动前端开发服务器..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\client'; yarn dev" -PassThru

Start-Sleep 3

Write-Host ""
Write-Host "=== 启动完成 ===" -ForegroundColor Cyan
Write-Host "后端: http://localhost:3001" -ForegroundColor White
Write-Host "前端: http://localhost:5173" -ForegroundColor White
Write-Host "管理员账号: zxz / 248064" -ForegroundColor Yellow
Write-Host ""
Write-Host "关闭此窗口不会停止服务，请直接关闭弹出的终端窗口来停止服务。" -ForegroundColor Gray

# 打开浏览器
Start-Sleep 1
Start-Process "http://localhost:5173"
