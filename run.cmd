@echo off
setlocal DisableDelayedExpansion
set "AGY_NODE=%~dp0runtime\node.exe"
if not exist "%AGY_NODE%" set "AGY_NODE=node"
"%AGY_NODE%" -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=16)?0:1)" >nul 2>&1
if errorlevel 1 (
  echo Node.js 22.16 or later is required. Use a standalone installer ZIP.
  exit /b 1
)
if "%~1"=="install" goto desktop
if "%~1"=="uninstall" goto desktop
if "%~1"=="status" goto desktop
"%AGY_NODE%" "%~dp0bin\agy-metrics.mjs" %*
exit /b %errorlevel%
:desktop
"%AGY_NODE%" "%~dp0bin\desktop.mjs" %*
exit /b %errorlevel%
