@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Informes App - Fernandez Fica
echo ============================================
echo.
echo Iniciando backend (API)...
start "Backend - Informes App" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo Iniciando frontend...
start "Frontend - Informes App" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Esperando a que el frontend este listo...
timeout /t 6 /nobreak >nul

start "" "http://localhost:5174"

echo.
echo Listo. Deja abiertas las dos ventanas (Backend y Frontend) mientras uses
echo la app. Para cerrar todo, cierra esas dos ventanas.
echo.
echo Si el navegador no se abrio solo, entra a:  http://localhost:5174
echo.
pause
