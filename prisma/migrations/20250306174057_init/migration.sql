-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "ticketType" TEXT NOT NULL DEFAULT 'SUPPORT'
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT,
    "logChannelId" TEXT,
    "supportRoleId" TEXT,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Welcome to your ticket! Support will be with you shortly.',
    "ticketTypes" TEXT NOT NULL DEFAULT 'SUPPORT,BILLING,TECHNICAL'
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");
