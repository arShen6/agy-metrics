@echo off
cd /d "%~dp0"
node bin\agy-metrics.mjs start %*
if errorlevel 1 pause
