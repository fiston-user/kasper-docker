import {
  SlashCommandBuilder,
  CommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
} from "discord.js";
import * as ticketService from "../services/ticketService";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set up the ticket system")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("Category to create tickets in")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("log_channel")
        .setDescription("Channel to log ticket events")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("transcript_channel")
        .setDescription("Channel to post ticket transcripts")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("support_role")
        .setDescription("Role that can see and manage tickets")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("welcome_message")
        .setDescription("Message to show when a ticket is created")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("save_transcripts")
        .setDescription("Whether to save transcripts when tickets are closed")
        .setRequired(false)
    ),

  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const category = interaction.options.getChannel("category");
    const logChannel = interaction.options.getChannel("log_channel");
    const transcriptChannel =
      interaction.options.getChannel("transcript_channel");
    const supportRole = interaction.options.getRole("support_role");
    const welcomeMessage = interaction.options.getString("welcome_message");
    const saveTranscripts = interaction.options.getBoolean("save_transcripts");

    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    // Get or create ticket configuration
    let config = await ticketService.getOrCreateConfig(interaction.guild.id);

    // Update configuration with new values
    const updateData: any = {};

    if (category) updateData.categoryId = category.id;
    if (logChannel) updateData.logChannelId = logChannel.id;
    if (transcriptChannel)
      updateData.transcriptChannelId = transcriptChannel.id;
    if (supportRole) updateData.supportRoleId = supportRole.id;
    if (welcomeMessage) updateData.welcomeMessage = welcomeMessage;
    if (saveTranscripts !== null) updateData.saveTranscripts = saveTranscripts;

    await ticketService.updateConfig(updateData);

    // Build response message
    let responseMessage = "Ticket system configuration updated:";

    if (category) {
      responseMessage += `\n- Ticket Category: <#${category.id}>`;
    }

    if (logChannel) {
      responseMessage += `\n- Log Channel: <#${logChannel.id}>`;
    }

    if (transcriptChannel) {
      responseMessage += `\n- Transcript Channel: <#${transcriptChannel.id}>`;
    }

    if (supportRole) {
      responseMessage += `\n- Support Role: <@&${supportRole.id}>`;
    }

    if (welcomeMessage) {
      responseMessage += `\n- Welcome Message: "${welcomeMessage}"`;
    }

    if (saveTranscripts !== null) {
      responseMessage += `\n- Save Transcripts: ${
        saveTranscripts ? "Enabled" : "Disabled"
      }`;
    }

    await interaction.reply({ content: responseMessage, ephemeral: true });
  },
};
