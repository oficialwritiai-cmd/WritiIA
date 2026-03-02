@echo off
setlocal
echo ========================================
echo   🚀 DESPLEGANDO WRITI.AI A VERCEL
echo ========================================

:: 1. Verificar Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Git no esta instalado.
    pause
    exit /b
)

:: 2. Preguntar por mensaje de commit o usar uno por defecto
set "msg=Actualizacion automatica: %date% %time%"
set /p "user_msg=Mensaje para esta version (Enter para omitir): "
if not "%user_msg%"=="" set "msg=%user_msg%"

echo.
echo [+] Guardando cambios locales...
git add .

echo [+] Creando version: "%msg%"
git commit -m "%msg%"

echo [+] Subiendo codigo a GitHub...
git push origin main

echo.
echo ========================================
echo   ✅ ¡HECHO! Vercel esta procesando el despliegue.
echo   Tardara unos 2-3 minutos en estar vivo en publico.
echo ========================================
echo.
pause
