# Kasper - Discord Ticket Bot

A powerful Discord ticket system bot built with TypeScript and Discord.js.

## Features

- Create and manage support tickets
- Multiple ticket types (Support, Billing, Technical)
- Admin-only lock/unlock functionality to prevent users from sending messages
- Ticket transcripts with HTML formatting
- Customizable ticket categories
- Ticket logging
- Role-based permissions
- Automatic ticket archiving

## Deployment

### First-time Deployment

1. Edit the `scripts/deploy.sh` file and set your Git repository URL:

   ```bash
   REPO_URL="your-git-repo-url"
   ```

2. Run the deployment script on your server:

   ```bash
   curl -s https://raw.githubusercontent.com/yourusername/kasper/main/scripts/deploy.sh | bash
   ```

3. Edit the `.env` file with your Discord bot credentials:

   ```bash
   nano /opt/kasper/.env
   ```

4. Run the deployment script again to start the bot:
   ```bash
   /opt/kasper/scripts/deploy.sh
   ```

### Updating the Bot

When you make changes to the bot and push them to your Git repository, you can update your deployment:

```bash
cd /opt/kasper
./scripts/update.sh
```

This will:

1. Stop the running containers
2. Pull the latest changes from Git
3. Rebuild the containers
4. Start the containers again

## Setup

### Standard Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   DATABASE_URL="file:./dev.db"
   ```
4. Generate the Prisma client:
   ```
   npx prisma generate
   ```
5. Deploy the slash commands:
   ```
   npm run deploy
   ```
6. Start the bot:
   ```
   npm run dev
   ```

### Docker Setup

1. Clone the repository
2. Create a `.env` file with the following variables:
   ```
   TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   ```
3. Run the bot using Docker:

   ```
   ./run.sh
   ```

   This will:

   - Build the Docker images
   - Start the PostgreSQL database
   - Run database migrations
   - Deploy slash commands
   - Start the bot

4. To stop the bot:
   ```
   ./stop.sh
   ```

## Commands

- `/ticket create` - Create a new ticket
- `/ticket close` - Close the current ticket
- `/ticket lock` - Lock the current ticket (admin only)
- `/ticket unlock` - Unlock a locked ticket (admin only)
- `/setup` - Configure the ticket system
- `/panel` - Create a ticket panel for users to create tickets
- `/info` - Get information about the current ticket
- `/transcript` - View a ticket's transcript

## Configuration Options

- **Category** - The category to create tickets in
- **Log Channel** - Channel to log ticket events
- **Transcript Channel** - Channel to post ticket transcripts
- **Support Role** - Role that can see and manage tickets
- **Welcome Message** - Message to show when a ticket is created
- **Save Transcripts** - Whether to save transcripts when tickets are closed

## Development

### Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose

### Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/kasper.git
   cd kasper
   ```

2. Create a `.env` file:

   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your Discord bot credentials.

4. Start the bot:
   ```bash
   ./scripts/run.sh
   ```

### Useful Scripts

- `scripts/run.sh` - Start the bot in development mode
- `scripts/stop.sh` - Stop the bot
- `scripts/bot-logs.sh` - View bot logs
- `scripts/db-logs.sh` - View database logs
- `scripts/db-reset.sh` - Reset the database
- `scripts/update.sh` - Update the bot to the latest version
- `scripts/deploy.sh` - Deploy the bot on a new server

## Docker Commands

- `docker-compose up -d` - Start the containers in detached mode
- `docker-compose down` - Stop the containers
- `docker-compose logs -f` - View logs
- `docker-compose ps` - View running containers

## Helper Scripts

- `./run.sh` - Build and start the Docker containers
- `./stop.sh` - Stop the Docker containers
- `./db-reset.sh` - Reset the database by removing the volume and recreating it
- `./db-logs.sh` - View the database logs
- `./bot-logs.sh` - View the bot logs

## Database

This project uses PostgreSQL with Prisma ORM for data storage when running in Docker, and SQLite for local development. The database schema includes:

- Tickets
- Messages
- Configuration

## License

[MIT](LICENSE)
