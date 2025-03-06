#!/bin/bash

# This script shows the logs for the bot container

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Show bot logs
echo "Showing bot logs (press Ctrl+C to exit)..."
docker compose logs -f bot 