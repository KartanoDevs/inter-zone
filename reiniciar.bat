@echo off
REM InterZone - Reinicia (o inicia) el stack local completo en Docker:
REM   web (Nginx + build de Angular)  ->  http://localhost:8080
REM   servidor (API Express + Prisma) ->  detras de /api
REM   postgres                        ->  puerto 5432
REM
REM Reconstruye las imagenes y recrea los contenedores. Equivale a:
REM   docker compose -f docker-compose.prod.yml -f docker-compose.local.yml up -d --build
REM que es lo que hace deploy.sh cuando ENTORNO=local en .env.
REM
REM Alternativa en modo desarrollo (recarga en caliente, :4200 + :3000): start.bat

setlocal
cd /d "%~dp0"

if not exist .env (
  echo No hay .env en la raiz. Copia .env.produccion.example a .env y rellenalo primero.
  exit /b 1
)

set "COMPOSE=docker compose -f docker-compose.prod.yml -f docker-compose.local.yml"

echo ==^> Reconstruyendo y recreando el stack local...
%COMPOSE% up -d --build
if errorlevel 1 (
  echo.
  echo Fallo al levantar el stack.
  exit /b 1
)

echo.
%COMPOSE% ps
echo.
echo InterZone disponible en http://localhost:8080
echo Logs:  %COMPOSE% logs -f
echo Parar: %COMPOSE% down

endlocal
