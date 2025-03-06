FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install wait-on --save-dev

# Copy source code
COPY . .

# Make entrypoint script executable
RUN chmod +x scripts/docker-entrypoint.sh

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create transcripts directory
RUN mkdir -p transcripts

# Set environment variables
ENV NODE_ENV=production

# Set entrypoint
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

# Run the bot
CMD ["npm", "start"] 