import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "../index";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transcript")
    .setDescription("Get the transcript of a ticket")
    .addStringOption((option) =>
      option
        .setName("ticket_id")
        .setDescription("The ID of the ticket to get the transcript for")
        .setRequired(false)
    ),

  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    // Check if we're looking for a specific ticket or the current channel
    const ticketId = interaction.options.getString("ticket_id");
    let ticket;

    if (ticketId) {
      // Find ticket by ID
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });
    } else if (interaction.channel) {
      // Find ticket by channel ID
      ticket = await prisma.ticket.findFirst({
        where: { channelId: interaction.channel.id },
      });
    }

    if (!ticket) {
      await interaction.reply({
        content: ticketId
          ? `No ticket found with ID ${ticketId}.`
          : "This channel is not a ticket or no ticket ID was provided.",
        ephemeral: true,
      });
      return;
    }

    // Check if the ticket has a transcript
    if (!ticket.transcriptUrl) {
      await interaction.reply({
        content:
          "This ticket does not have a transcript. It may not be closed yet or transcripts were disabled when it was closed.",
        ephemeral: true,
      });
      return;
    }

    // Get ticket creator
    const creator = await interaction.client.users
      .fetch(ticket.userId)
      .catch(() => null);

    // Create embed with transcript link
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Ticket Transcript")
      .setDescription(`Here is the transcript for ticket ${ticket.id}`)
      .addFields(
        { name: "Ticket ID", value: ticket.id },
        {
          name: "Created by",
          value: creator
            ? `${creator.tag} (${creator.id})`
            : `Unknown (${ticket.userId})`,
        },
        { name: "Type", value: ticket.ticketType },
        { name: "Status", value: ticket.status },
        {
          name: "Created at",
          value: new Date(ticket.createdAt).toLocaleString(),
        },
        {
          name: "Transcript",
          value: `[View Transcript](${ticket.transcriptUrl})`,
        }
      )
      .setTimestamp();

    // Add closed at field if ticket is closed
    if (ticket.status === "CLOSED" && ticket.closedAt) {
      embed.addFields({
        name: "Closed at",
        value: new Date(ticket.closedAt).toLocaleString(),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
