import { EmbedBuilder, TextChannel, User, Guild } from "discord.js";
import { prisma } from "../index";

/**
 * Get or create ticket configuration for a guild
 */
export async function getOrCreateConfig(guildId: string) {
  let config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  if (!config) {
    config = await prisma.ticketConfig.create({
      data: {
        id: "config",
        guildId: guildId,
      },
    });
  }

  return config;
}

/**
 * Log a ticket event to the configured log channel
 */
export async function logTicketEvent(
  guild: Guild | null,
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
 * Check if a user has an open ticket in a guild
 */
export async function hasOpenTicket(userId: string, guildId: string) {
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      userId: userId,
      guildId: guildId,
      status: "OPEN",
    },
  });

  return existingTicket;
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
