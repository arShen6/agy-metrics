@echo off
setlocal
set "TOKEN_TIPS_LANGUAGE=zh-CN"
call "%~dp0install.cmd"
exit /b %errorlevel%
