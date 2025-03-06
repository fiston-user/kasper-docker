#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
npx wait-on -t 60000 tcp:db:5432

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Deploy slash commands
echo "Deploying slash commands..."
npm run deploy

# Start the bot
echo "Starting the bot..."
exec "$@" 