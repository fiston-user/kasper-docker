#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with your Discord bot credentials."
  exit 1
fi

# Build and start the containers
echo "Building and starting Docker containers..."
docker-compose up -d --build

# Show logs
echo "Showing logs (press Ctrl+C to exit)..."
docker-compose logs -f 