@echo off
echo ===================================
echo GIT INSTALLATION HELPER
echo ===================================
echo.

echo Checking if Git is already installed...
git --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✅ Git is already installed!
    git --version
    echo.
    goto :configure
) else (
    echo ❌ Git is not installed
    echo.
)

echo 📥 DOWNLOADING AND INSTALLING GIT...
echo.
echo Opening Git for Windows download page...
echo Please download and install Git from the official website.
echo.

REM Open the Git download page
start https://git-scm.com/download/win

echo ===================================
echo INSTALLATION INSTRUCTIONS:
echo ===================================
echo.
echo 1. 📱 Download "64-bit Git for Windows Setup"
echo 2. 🏃‍♂️ Run the installer (.exe file)
echo 3. ✅ Use these recommended settings:
echo.
echo    During Installation:
echo    ├── ✅ Select Components: Keep all default selections
echo    ├── ✅ Default editor: Use Visual Studio Code (if available)
echo    ├── ✅ PATH environment: "Git from the command line and 3rd-party software"
echo    ├── ✅ HTTPS transport: "Use the OpenSSL library"
echo    ├── ✅ Line ending conversions: "Checkout Windows-style, commit Unix-style"
echo    ├── ✅ Terminal emulator: "Use MinTTY"
echo    ├── ✅ Git Pull behavior: "Default (fast-forward or merge)"
echo    └── ✅ Credential manager: "Git Credential Manager"
echo.
echo 4. 🔄 After installation, close and reopen this terminal
echo 5. 🎯 Run this script again to verify installation
echo.

:configure
echo ===================================
echo GIT CONFIGURATION
echo ===================================
echo.

REM Check if Git is configured
git config user.name >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 📝 Setting up Git configuration...
    echo.
    set /p username="Enter your name for Git commits: "
    set /p useremail="Enter your email for Git commits: "
    
    git config --global user.name "%username%"
    git config --global user.email "%useremail%"
    
    echo.
    echo ✅ Git configured successfully!
) else (
    echo ✅ Git is already configured:
    echo Name: 
    git config user.name
    echo Email: 
    git config user.email
)

echo.
echo ===================================
echo READY FOR VERSION CONTROL!
echo ===================================
echo.
echo You can now use Git commands:
echo ├── git init          ^(Initialize repository^)
echo ├── git add .         ^(Add all files^)
echo ├── git commit        ^(Save changes^)
echo ├── git status        ^(Check status^)
echo └── git push          ^(Upload to GitHub^)
echo.

echo Next steps:
echo 1. Initialize your repository: git init
echo 2. Add files: git add .
echo 3. Make first commit: git commit -m "Initial commit"
echo.

pause