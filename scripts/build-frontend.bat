@echo off
cd /d "%~dp0..\src"
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%
