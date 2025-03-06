# Kasper - Discord Ticket Bot

A powerful Discord ticket system bot built with TypeScript and Discord.js.

## Features

- Create and manage support tickets
- Multiple ticket types (Support, Billing, Technical)
- Admin-only lock/unlock functionality to prevent users from sending messages
- Customizable ticket categories
- Ticket logging
- Role-based permissions
- Automatic ticket archiving

## Setup

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

## Commands

- `/ticket create` - Create a new ticket
- `/ticket close` - Close the current ticket
- `/ticket lock` - Lock the current ticket (admin only)
- `/ticket unlock` - Unlock a locked ticket (admin only)
- `/setup` - Configure the ticket system
- `/panel` - Create a ticket panel for users to create tickets
- `/info` - Get information about the current ticket

## Development

- `npm run dev` - Start the bot in development mode
- `npm run build` - Build the project
- `npm start` - Start the bot in production mode

## Database

This project uses SQLite with Prisma ORM for data storage. The database schema includes:

- Tickets
- Messages
- Configuration

## License

MIT
