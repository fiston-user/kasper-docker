#!/bin/bash

# This script resets the database by removing the volume and recreating it

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop the containers
echo "Stopping containers..."
docker compose down

# Remove the database volume
echo "Removing database volume..."
docker volume rm kasper-postgres-data

# Start the containers again
echo "Starting containers..."
docker compose up -d

echo "Database has been reset. The bot will automatically run migrations on startup."
echo "Showing logs (press Ctrl+C to exit)..."
docker compose logs -f 