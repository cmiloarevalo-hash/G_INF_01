@echo off
setlocal
cd /d "%~dp0"

".\runtime\node.exe" ".\app\portable-launcher.mjs"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo La aplicacion no pudo iniciarse. Codigo: %RC%
  pause
)

exit /b %RC%
