@echo off
chcp 65001 >nul
call "%~dp0run.cmd" status
call "%~dp0run.cmd" doctor
pause
