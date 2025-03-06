#!/bin/bash
set -e

# Print colored status messages
print_status() {
  echo -e "\033[1;34m[UPDATE]\033[0m $1"
}

# Check if we're in a git repository
if [ ! -d .git ]; then
  print_status "Error: Not in a git repository. Please run this script from the root of your git repository."
  exit 1
fi

# Get the current directory name
DIR_NAME=$(basename "$PWD")

print_status "Updating $DIR_NAME..."

# Stop the running containers
print_status "Stopping running containers..."
docker compose down

# Pull the latest changes from git
print_status "Pulling latest changes from git..."
git fetch
git pull

# Rebuild the containers
print_status "Rebuilding containers..."
docker compose build

# Start the containers
print_status "Starting containers..."
docker compose up -d

# Show the status
print_status "Update complete! Showing container status:"
docker compose ps

print_status "Showing recent logs:"
docker compose logs --tail=20

print_status "Update process completed successfully!"
