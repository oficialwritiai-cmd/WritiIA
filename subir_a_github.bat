@echo off
setlocal
echo ========================================
echo        CONECTANDO WRITI.AI A GITHUB
echo ========================================

:: Verificar si git existe
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] ERROR: Git no esta instalado.
    echo.
    echo Por favor, instala Git desde aqui: https://git-scm.com/download/win
    echo Es una instalacion de 1 minuto. Luego cierra y abre esta carpeta.
    pause
    exit /b
)

echo [+] Inicializando Git...
git init

:: Configurar identidad local si no existe para evitar errores
echo [+] Configurando identidad local...
git config user.email "oficialwritiai@gmail.com"
git config user.name "Stive Writi"

echo [+] Configurando repositorio remoto...
git remote add origin https://github.com/oficialwritiai-cmd/WritiIA.git

echo [+] Preparando archivos (respetando .gitignore)...
git add .

echo [+] Creando primer commit...
git commit -m "Lanzamiento Profesional - WRITI.AI con Cerebro IA y Stakent UI"

echo [+] Renombrando rama a main...
git branch -M main

echo [+] Subiendo a GitHub (es posible que se abra una ventana de login)...
git push -u origin main

echo.
echo ========================================
echo        ¡TODO LISTO! TU CODIGO ESTA EN GITHUB
echo ========================================
pause
