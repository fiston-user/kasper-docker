-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "ticketType" TEXT NOT NULL DEFAULT 'SUPPORT',
    "transcriptUrl" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketConfig" (
    "id" TEXT NOT NULL DEFAULT 'config',
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT,
    "logChannelId" TEXT,
    "supportRoleId" TEXT,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Welcome to your ticket! Support will be with you shortly.',
    "ticketTypes" TEXT NOT NULL DEFAULT 'SUPPORT,BILLING,TECHNICAL',
    "saveTranscripts" BOOLEAN NOT NULL DEFAULT true,
    "transcriptChannelId" TEXT,

    CONSTRAINT "TicketConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
