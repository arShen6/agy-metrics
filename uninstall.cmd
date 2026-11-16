@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
call "%~dp0run.cmd" uninstall %*
if errorlevel 1 (
  echo Operation failed. Please keep the error above for your issue report.
  pause
  exit /b 1
)
