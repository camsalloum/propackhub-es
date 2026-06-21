@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

call "%~dp0wait-api-health.bat"
start http://localhost:5000
