@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title 🚀 WRITI.AI — Deploy a Vercel

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║         🚀  WRITI.AI — DEPLOY A VERCEL          ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: ─── Verificar Git ────────────────────────────────────
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Git no está instalado.
    echo  Descárgalo en: https://git-scm.com
    pause & exit /b 1
)

:: ─── Mensaje de versión ───────────────────────────────
echo  ¿Qué cambios hiciste? ^(Enter = timestamp automático^)
set "msg="
set /p "msg= > "
if "!msg!"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
    set "msg=Deploy auto !dt:~0,4!-!dt:~4,2!-!dt:~6,2! !dt:~8,2!:!dt:~10,2!"
)

echo.
echo  [1/4] Añadiendo todos los cambios...
git add -A
if %errorlevel% neq 0 ( echo  [ERROR] Falló git add & pause & exit /b 1 )

echo  [2/4] Creando commit: "!msg!"
git commit -m "!msg!"
:: Si no hay cambios nuevos, commit devuelve 1 — está bien
echo.

echo  [3/4] Subiendo a GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] No se pudo subir a GitHub.
    echo  Asegurate de tener conexion y permisos en el repo.
    pause & exit /b 1
)

echo  [4/4] ✅ GitHub actualizado. Vercel lo detectará en ~1-2 min.
echo.
echo ╔══════════════════════════════════════════════════╗
echo ║  ✅ LISTO — Vercel publicará en 1-2 minutos     ║
echo ║                                                  ║
echo ║  🔗 Ver progreso del deploy:                     ║
echo ║  https://vercel.com/dashboard                    ║
echo ║                                                  ║
echo ║  💡 Si no ves cambios: Ctrl+Shift+R para        ║
echo ║     limpiar caché del navegador                  ║
echo ╚══════════════════════════════════════════════════╝
echo.
pause
