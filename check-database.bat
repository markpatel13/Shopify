@echo off
echo Checking MongoDB Connection...
echo.

REM Test MongoDB connection
mongosh --eval "db.runCommand('ping')" --quiet 2>nul
if %ERRORLEVEL% equ 0 (
    echo ✅ MongoDB is running and accessible!
    echo Database: shopify_elite
    echo Connection: mongodb://localhost:27017
    echo.
    echo Ready to start your application!
) else (
    echo ❌ MongoDB connection failed
    echo.
    echo Please ensure MongoDB is installed and running:
    echo 1. Download from: https://www.mongodb.com/try/download/community
    echo 2. Install with default settings
    echo 3. Start MongoDB service
    echo.
    echo Alternative: Use MongoDB Atlas (cloud)
    echo - Sign up at: https://www.mongodb.com/atlas
    echo - Update MONGO_URI in .env file
)

echo.
pause