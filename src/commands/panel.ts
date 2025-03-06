import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ColorResolvable,
} from "discord.js";
import * as ticketService from "../services/ticketService";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Create a ticket panel for users to create tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Title of the ticket panel")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the ticket panel")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color of the ticket panel (hex code)")
        .setRequired(false)
    ),

  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const colorInput = interaction.options.getString("color") || "#0099ff";

    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    // Create ticket panel embed
    const panelEmbed = new EmbedBuilder()
      .setColor(colorInput as ColorResolvable)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: "Click the button below to create a ticket" });

    // Create buttons for different ticket types
    const config = await ticketService.getOrCreateConfig(interaction.guild.id);

    const ticketTypes = config?.ticketTypes.split(",") || [
      "SUPPORT",
      "BILLING",
      "TECHNICAL",
    ];

    // Create button row
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Add buttons for each ticket type
    ticketTypes.forEach((type) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`create_ticket_${type}`)
          .setLabel(`${type.charAt(0) + type.slice(1).toLowerCase()} Ticket`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(ticketService.getEmojiForTicketType(type))
      );
    });

    await interaction.reply({ embeds: [panelEmbed], components: [row] });
  },
};

// Helper function to get emoji for ticket type
function getEmojiForTicketType(type: string): string {
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
