#!/bin/bash

# This script shows the logs for the database container

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Show database logs
echo "Showing database logs (press Ctrl+C to exit)..."
docker-compose logs -f db 