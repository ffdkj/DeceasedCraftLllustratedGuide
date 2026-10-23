@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 亡者世界图鉴 - 本地服务

echo.
echo ============================================
echo   亡者世界 · 生存图鉴  本地服务
echo ============================================
echo.
echo 保持这个窗口打开，手机和电脑连同一个 WiFi。
echo 电脑上打开:  http://localhost:8787
echo 手机上打开:  http://本机局域网IP:8787
echo.
echo 查看本机 IP：另开一个命令行，运行 ipconfig
echo 找到 "IPv4 地址"，例如 192.168.1.23
echo 手机浏览器访问 http://192.168.1.23:8787
echo.
echo 按 Ctrl+C 停止服务。
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8787
  python -m http.server 8787
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8787
  py -3 -m http.server 8787
  goto :eof
)

echo 没有找到 Python。请先安装 Python，或使用 npx serve。
echo 也可以用浏览器直接打开 "亡者世界图鉴-单文件版.html"。
pause
