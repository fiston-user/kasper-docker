import {
  SlashCommandBuilder,
  CommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "../index";

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
    ),

  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const category = interaction.options.getChannel("category");
    const logChannel = interaction.options.getChannel("log_channel");
    const supportRole = interaction.options.getRole("support_role");
    const welcomeMessage = interaction.options.getString("welcome_message");

    // Get or create ticket configuration
    let config = await prisma.ticketConfig.findUnique({
      where: { id: "config" },
    });

    if (!config) {
      config = await prisma.ticketConfig.create({
        data: {
          id: "config",
          guildId: interaction.guild!.id,
        },
      });
    }

    // Update configuration with new values
    await prisma.ticketConfig.update({
      where: { id: "config" },
      data: {
        categoryId: category?.id || config.categoryId,
        logChannelId: logChannel?.id || config.logChannelId,
        supportRoleId: supportRole?.id || config.supportRoleId,
        welcomeMessage: welcomeMessage || config.welcomeMessage,
      },
    });

    // Build response message
    let responseMessage = "Ticket system configuration updated:";

    if (category) {
      responseMessage += `\n- Ticket Category: <#${category.id}>`;
    }

    if (logChannel) {
      responseMessage += `\n- Log Channel: <#${logChannel.id}>`;
    }

    if (supportRole) {
      responseMessage += `\n- Support Role: <@&${supportRole.id}>`;
    }

    if (welcomeMessage) {
      responseMessage += `\n- Welcome Message: "${welcomeMessage}"`;
    }

    await interaction.reply({ content: responseMessage, ephemeral: true });
  },
};
