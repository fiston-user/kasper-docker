#!/bin/bash
set -e

# Print colored status messages
print_status() {
  echo -e "\033[1;34m[DEPLOY]\033[0m $1"
}

# Configuration
REPO_URL="https://github.com/fiston-user/kasper-docker.git"  # Replace with your actual git repo URL
INSTALL_DIR="/opt/kasper"          # Where to install the bot
ENV_FILE="$INSTALL_DIR/.env"       # Path to the .env file

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
  print_status "Error: Docker and/or Docker Compose are not installed."
  print_status "Please install them first:"
  print_status "  https://docs.docker.com/engine/install/"
  print_status "  https://docs.docker.com/compose/install/"
  exit 1
fi

# Create installation directory if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
  print_status "Creating installation directory: $INSTALL_DIR"
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown $(whoami): "$INSTALL_DIR"
else
  print_status "Installation directory already exists: $INSTALL_DIR"
  
  # Check if it's a git repository
  if [ -d "$INSTALL_DIR/.git" ]; then
    print_status "Existing installation detected. Use update.sh instead."
    print_status "Run: cd $INSTALL_DIR && ./scripts/update.sh"
    exit 1
  fi
fi

# Clone the repository
print_status "Cloning repository to $INSTALL_DIR..."
git clone "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Create .env file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  print_status "Creating .env file..."
  cat > "$ENV_FILE" << EOF
# Discord Bot Configuration
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/kasper?schema=public
EOF
  print_status "Please edit $ENV_FILE with your actual Discord bot credentials"
  print_status "Then run this script again."
  exit 0
else
  print_status "Using existing .env file"
fi

# Make scripts executable
print_status "Making scripts executable..."
chmod +x scripts/*.sh

# Build and start the containers
print_status "Building and starting containers..."
docker compose build
docker compose up -d

# Show the status
print_status "Deployment complete! Showing container status:"
docker compose ps

print_status "Showing logs:"
docker compose logs --tail=20

print_status "Deployment completed successfully!"
print_status "To update in the future, run: cd $INSTALL_DIR && ./scripts/update.sh"
