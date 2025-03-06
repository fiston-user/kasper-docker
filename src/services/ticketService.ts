import { TextChannel, EmbedBuilder, PermissionsBitField } from "discord.js";
import { prisma } from "../index";
import { TicketStatus, TicketType } from "../types";

/**
 * Create a new ticket in the database
 */
export async function createTicket(
  channelId: string,
  userId: string,
  guildId: string,
  ticketType: string
) {
  return prisma.ticket.create({
    data: {
      channelId,
      userId,
      guildId,
      ticketType,
    },
  });
}

/**
 * Find a ticket by channel ID and status
 */
export async function findTicketByChannel(
  channelId: string,
  status?: TicketStatus | TicketStatus[]
) {
  if (status) {
    if (Array.isArray(status)) {
      return prisma.ticket.findFirst({
        where: {
          channelId,
          status: { in: status },
        },
      });
    } else {
      return prisma.ticket.findFirst({
        where: {
          channelId,
          status,
        },
      });
    }
  }

  return prisma.ticket.findFirst({
    where: {
      channelId,
    },
  });
}

/**
 * Find if a user has an open ticket
 */
export async function findOpenTicketByUser(userId: string, guildId: string) {
  return prisma.ticket.findFirst({
    where: {
      userId,
      guildId,
      status: { in: ["OPEN", "LOCKED"] },
    },
  });
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
) {
  const updateData: any = {
    status,
  };

  // Add timestamp based on status
  if (status === "CLOSED") {
    updateData.closedAt = new Date();
  } else if (status === "LOCKED") {
    updateData.lockedAt = new Date();
  } else if (status === "OPEN") {
    // If unlocking, clear the lockedAt timestamp
    updateData.lockedAt = null;
  }

  return prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
  });
}

/**
 * Get or create ticket configuration
 */
export async function getOrCreateConfig(guildId: string) {
  let config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  if (!config) {
    config = await prisma.ticketConfig.create({
      data: {
        id: "config",
        guildId,
      },
    });
  }

  return config;
}

/**
 * Update ticket configuration
 */
export async function updateConfig(data: any) {
  return prisma.ticketConfig.update({
    where: { id: "config" },
    data,
  });
}

/**
 * Log a ticket event to the configured log channel
 */
export async function logTicketEvent(
  guild: any,
  logChannelId: string | null | undefined,
  embed: EmbedBuilder
) {
  if (!guild || !logChannelId) return;

  try {
    const logChannel = (await guild.channels.fetch(
      logChannelId
    )) as TextChannel;
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error logging ticket event:", error);
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | null | undefined) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString();
}

/**
 * Get emoji for ticket type
 */
export function getEmojiForTicketType(type: string): string {
  switch (type.toUpperCase()) {
    case "SUPPORT":
      return "🔧";
    case "BILLING":
      return "💰";
    case "TECHNICAL":
      return "💻";
    default:
      return "🎫";
  }
}
