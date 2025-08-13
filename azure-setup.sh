#!/bin/bash
# Azure deployment post-install script

echo "🚀 Azure Post-Install: Setting up database and questions..."

# Set Node.js environment
export NODE_ENV=production

# Install dependencies if not already done
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install --production
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check if database file exists, if not copy it
DB_FILE="./prisma/quiz_app.db"
if [ ! -f "$DB_FILE" ]; then
    echo "📋 Database file not found, creating new database..."
    # Run database setup
    npx prisma db push --force-reset
else
    echo "📋 Database file found, using existing database..."
fi

# Run database migrations to ensure schema is up to date
echo "🔄 Running database migrations..."
npx prisma db push

# Load questions into database
echo "📚 Loading questions into database..."
node load-questions.js

# Verify database setup
echo "🔍 Verifying database setup..."
node check-local-db.js

echo "✅ Azure Post-Install: Database and questions setup complete!"
