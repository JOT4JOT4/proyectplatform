@echo off
REM Script para iniciar DEMO - Sistema de Reservas UCN

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════╗
echo ║  SISTEMA DE RESERVAS UCN - STARTUP SCRIPT     ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Obtener directorio actual
set PROJECT_DIR=%cd%\ECIN_UCN-ReserveProject

REM Verificar si existe el directorio del proyecto
if not exist "%PROJECT_DIR%" (
    echo [ERROR] No se encontró la carpeta del proyecto en: %PROJECT_DIR%
    echo Asegúrate de ejecutar este script desde la carpeta raíz del proyecto.
    pause
    exit /b 1
)

echo [PASO 1] Levantando Docker PostgreSQL...
echo.
cd /d "%PROJECT_DIR%"
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo iniciar Docker Compose
    pause
    exit /b 1
)

timeout /t 3 /nobreak
echo.
echo [PASO 2] Iniciando Backend NestJS...
echo.
start "Backend NestJS" cmd /k "cd /d %PROJECT_DIR%\backend && npm run start:dev"

timeout /t 5 /nobreak
echo.
echo [PASO 3] Obteniendo IP local...
for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :got_ip
)
:got_ip

echo IP Local detectada: %LOCAL_IP%
echo.
echo [PASO 4] Iniciando Mobile App (Expo)...
echo.
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3000
echo.
start "Mobile Expo" cmd /k "cd /d %PROJECT_DIR%\movil && set EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3000 && npm start"

echo.
echo ════════════════════════════════════════════════
echo ✅ SERVICIOS INICIADOS EXITOSAMENTE
echo ════════════════════════════════════════════════
echo.
echo 🌐 Backend:  http://localhost:3000
echo 📱 Mobile:   Escanea el QR en Expo Go
echo 🗄️  Database: PostgreSQL en puerto 5433
echo.
echo 📖 Para más detalles: lee DEMO.md
echo.
pause
