@echo off
REM ================================================================
REM Clean Cloak Backend - Quick Deployment Script (Windows)
REM ================================================================
REM This script commits and pushes backend changes to trigger
REM auto-deployment on Render.com
REM ================================================================

setlocal enabledelayedexpansion

REM Colors (using Windows color codes)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo %BLUE%========================================%NC%
echo %BLUE%Clean Cloak Backend Deployment%NC%
echo %BLUE%========================================%NC%
echo.

REM Check if we're in the backend directory
if not exist "server.js" (
    echo %RED%Error: server.js not found!%NC%
    echo %YELLOW%Please run this script from the backend directory%NC%
    pause
    exit /b 1
)

REM Check for git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%Error: git is not installed%NC%
    pause
    exit /b 1
)

REM Check if git repository
if not exist ".git" (
    echo %YELLOW%Warning: Not a git repository%NC%
    echo %YELLOW%Initializing git repository...%NC%
    git init
    git remote add origin https://github.com/Jontexi/clean-cloak-b.git
)

REM Show current status
echo %BLUE%Step 1: Checking for changes...%NC%
git status --short

REM Add changes
echo.
echo %BLUE%Step 2: Staging changes...%NC%
git add .
echo %GREEN%✓ Changes staged%NC%

REM Show what will be committed
echo.
echo %BLUE%Files to be committed:%NC%
git diff --cached --name-only

REM Commit
echo.
echo %BLUE%Step 3: Creating commit...%NC%
git commit -m "Update CORS configuration for new Netlify frontend - Added https://rad-maamoul-c7a511.netlify.app - Added APK support (capacitor://, ionic://, http://)"
echo %GREEN%✓ Commit created%NC%

REM Push to GitHub
echo.
echo %BLUE%Step 4: Pushing to GitHub...%NC%
echo %YELLOW%This will trigger auto-deployment on Render.com%NC%
echo.

git push origin main
if %errorlevel% neq 0 (
    echo %RED%Push to 'main' failed. Trying 'master' branch...%NC%
    git push origin master
)

if %errorlevel% equ 0 (
    echo.
    echo %GREEN%========================================%NC%
    echo %GREEN%✓ DEPLOYMENT INITIATED%NC%
    echo %GREEN%========================================%NC%
    echo.

    echo %BLUE%Next Steps:%NC%
    echo 1. Go to: %YELLOW%https://dashboard.render.com%NC%
    echo 2. Find: %YELLOW%clean-cloak-b%NC% service
    echo 3. Watch deployment progress (1-2 minutes^)
    echo 4. Verify: %YELLOW%https://clean-cloak-b.onrender.com/api/health%NC%
    echo.

    echo %BLUE%Verification:%NC%
    echo After deployment completes, test with:
    echo %YELLOW%curl https://clean-cloak-b.onrender.com/api/health%NC%
    echo.

    echo %GREEN%Deployment process started! 🚀%NC%
    echo.
) else (
    echo.
    echo %RED%========================================%NC%
    echo %RED%✗ DEPLOYMENT FAILED%NC%
    echo %RED%========================================%NC%
    echo.

    echo %YELLOW%Possible issues:%NC%
    echo 1. Check your git credentials
    echo 2. Verify you have push access to the repository
    echo 3. Check your internet connection
    echo.

    pause
    exit /b 1
)

pause
exit /b 0
