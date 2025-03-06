import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "../index";
import { formatDate } from '../utils/ticketUtils';

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Get information about the current ticket"),

  async execute(interaction: CommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({
        content: "This command can only be used in a channel.",
        ephemeral: true,
      });
      return;
    }

    // Check if the channel is a ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        channelId: interaction.channel.id,
      },
    });

    if (!ticket) {
      await interaction.reply({
        content: "This channel is not a ticket.",
        ephemeral: true,
      });
      return;
    }

    // Get ticket creator
    const creator = await interaction.client.users
      .fetch(ticket.userId)
      .catch(() => null);

    // Set color based on ticket status
    let statusColor;
    switch (ticket.status) {
      case 'OPEN':
        statusColor = 0x0099FF; // Blue
        break;
      case 'LOCKED':
        statusColor = 0xFFA500; // Orange
        break;
      case 'CLOSED':
        statusColor = 0xFF0000; // Red
        break;
      default:
        statusColor = 0x0099FF; // Default blue
    }

    // Create info embed
    const infoEmbed = new EmbedBuilder()
      .setColor(statusColor)
      .setTitle("Ticket Information")
      .addFields(
        { name: "Ticket ID", value: ticket.id },
        {
          name: "Created by",
          value: creator
            ? `${creator.tag} (${creator.id})`
            : `Unknown (${ticket.userId})`,
        },
        { name: "Status", value: ticket.status },
        { name: "Type", value: ticket.ticketType },
        {
          name: "Created at",
          value: formatDate(ticket.createdAt),
        }
      )
      .setTimestamp();

    // Add locked at field if ticket is or was locked
    if (ticket.lockedAt) {
      infoEmbed.addFields({ name: 'Locked at', value: formatDate(ticket.lockedAt) });
    }

    // Add closed at field if ticket is closed
    if (ticket.status === "CLOSED" && ticket.closedAt) {
      infoEmbed.addFields({
        name: "Closed at",
        value: formatDate(ticket.closedAt),
      });
    }

    await interaction.reply({ embeds: [infoEmbed] });
  },
};
