@echo off
setlocal
cd /d "%~dp0"

set "LAUNCHER_ARGS="
if /I "%G_INF_PORTABLE_SMOKE%"=="1" set "LAUNCHER_ARGS=--smoke"

".\runtime\node.exe" ".\app\portable-launcher.mjs" %LAUNCHER_ARGS%
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo La aplicacion no pudo iniciarse. Codigo: %RC%
  pause
)

exit /b %RC%
