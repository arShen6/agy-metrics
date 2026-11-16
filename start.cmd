@echo off
call "%~dp0run.cmd" start %*
if errorlevel 1 pause
