@echo off
REM InterZone - Inicia base de datos, servidor (API) y cliente de desarrollo

cd /d "%~dp0"

echo Levantando la base de datos (Docker)...
pushd server
call npm run db:up
popd

echo Iniciando el servidor API en http://localhost:3000
start "InterZone API" cmd /k "cd /d "%~dp0server" && npm start"

echo Iniciando InterZone en http://localhost:4200
npm start
pause
