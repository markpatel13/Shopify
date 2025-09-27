@echo off
echo ===================================
echo GIT VERIFICATION SCRIPT  
echo ===================================
echo.

echo Testing Git installation...
git --version
if %ERRORLEVEL% equ 0 (
    echo ✅ Git installed successfully!
    echo.
    
    echo Current Git configuration:
    echo Name: 
    git config user.name 2>nul || echo Not configured
    echo Email: 
    git config user.email 2>nul || echo Not configured
    echo.
    
    echo ===================================
    echo CONFIGURE GIT (if needed)
    echo ===================================
    
    git config user.name >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo Setting up Git for first time...
        set /p gitname="Enter your full name: "
        set /p gitemail="Enter your email: "
        
        git config --global user.name "%gitname%"
        git config --global user.email "%gitemail%"
        
        echo ✅ Git configured successfully!
    )
    
    echo.
    echo ===================================
    echo READY TO INITIALIZE REPOSITORY!
    echo ===================================
    echo.
    echo Run these commands to start version control:
    echo.
    echo 1. git init
    echo 2. git add .
    echo 3. git commit -m "Initial commit: Complete e-commerce platform"
    echo.
    
) else (
    echo ❌ Git not found. Please:
    echo 1. Restart your computer
    echo 2. Or reinstall Git with recommended settings
    echo 3. Make sure to select "Git from command line" option
)

echo.
pause