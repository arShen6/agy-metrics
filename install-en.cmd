@echo off
setlocal
set "TOKEN_TIPS_LANGUAGE=en"
call "%~dp0install.cmd"
exit /b %errorlevel%
