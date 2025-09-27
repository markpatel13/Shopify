@echo off
echo Starting Shopify Elite E-commerce Platform...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MongoDB is running
echo Checking MongoDB connection...
mongosh --eval "db.runCommand('ping')" --quiet >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Warning: MongoDB might not be running
    echo Please start MongoDB service or install MongoDB Community Server
    echo.
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy ".env.example" ".env"
    echo Please configure your .env file with appropriate values
    echo.
)

REM Create uploads directory if it doesn't exist
if not exist "uploads" (
    mkdir uploads
    echo Created uploads directory
)

REM Create logs directory if it doesn't exist
if not exist "logs" (
    mkdir logs
    echo Created logs directory
)

echo Starting the backend server...
echo Frontend: Open index.html in your browser or use Live Server
echo Backend API: http://localhost:5000
echo.

REM Start the server
npm run dev