@echo off
echo ==========================================
echo AZURE DEPLOYMENT PREPARATION
echo ==========================================

echo 1. Installing dependencies...
call npm install

echo 2. Generating Prisma client...
call npx prisma generate

echo 3. Creating database if it doesn't exist...
if not exist "prisma\quiz_app.db" (
    echo Database not found, creating new database...
    call npx prisma db push
    call node prisma\seed.js
) else (
    echo Database exists, skipping initialization...
)

echo 4. Testing server configuration...
call node -e "console.log('Node.js version:', process.version); console.log('Environment:', process.env.NODE_ENV || 'production');"

echo ==========================================
echo DEPLOYMENT PREPARATION COMPLETE!
echo ==========================================
echo Ready to deploy to Azure App Service
echo Main entry point: server-azure.js
echo ==========================================
