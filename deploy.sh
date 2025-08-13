#!/bin/bash

echo "Starting Azure deployment..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push database schema
echo "Setting up database..."
npx prisma db push

# Seed database if needed
echo "Seeding database..."
node prisma/seed.js

echo "Deployment setup complete!"
