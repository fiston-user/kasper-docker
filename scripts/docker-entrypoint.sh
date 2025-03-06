#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
npx wait-on -t 60000 tcp:db:5432

# Fix migration_lock.toml if it exists
if [ -f prisma/migrations/migration_lock.toml ]; then
  echo 'provider = "postgresql"' > prisma/migrations/migration_lock.toml
  echo "Fixed migration_lock.toml file"
fi

# Try running migrations, if it fails use db push
echo "Running database migrations..."
npx prisma migrate deploy || {
  echo "Migration failed, using db push instead..."
  npx prisma db push --accept-data-loss
}

# Deploy slash commands
echo "Deploying slash commands..."
npm run deploy

# Start the bot
echo "Starting the bot..."
exec "$@" 