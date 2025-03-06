import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} from "discord.js";
import { TicketModalSubmitInteraction } from "../types";
import * as ticketService from "../services/ticketService";

/**
 * Handle ticket creation from modal submission
 */
export async function handleTicketCreate(
  interaction: TicketModalSubmitInteraction,
  ticketType: string
) {
  const reason = interaction.fields.getTextInputValue("ticket_reason");
  const user = interaction.user;
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  // Check if user already has an open ticket
  const existingTicket = await ticketService.findOpenTicketByUser(
    user.id,
    guild.id
  );

  if (existingTicket) {
    await interaction.reply({
      content: `You already have an open ticket <#${existingTicket.channelId}>`,
      ephemeral: true,
    });
    return;
  }

  // Get or create ticket configuration
  const config = await ticketService.getOrCreateConfig(guild.id);

  // Create ticket channel
  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: ChannelType.GuildText,
    parent: config.categoryId || undefined,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      // Add support role permissions if configured
      ...(config.supportRoleId
        ? [
            {
              id: config.supportRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
          ]
        : []),
    ],
  });

  // Create ticket in database
  const ticket = await ticketService.createTicket(
    ticketChannel.id,
    user.id,
    guild.id,
    ticketType
  );

  // Create welcome embed
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`${ticketType} Ticket`)
    .setDescription(config.welcomeMessage)
    .addFields(
      { name: "Created by", value: `<@${user.id}>` },
      { name: "Reason", value: reason }
    )
    .setTimestamp();

  // Create buttons for ticket actions
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    // Only add close button for regular users
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  // Create admin buttons row if support role is configured
  let adminRow = null;
  if (config.supportRoleId) {
    adminRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("lock_ticket")
        .setLabel("Lock Ticket (Admin Only)")
        .setStyle(ButtonStyle.Primary)
    );
  }

  // Send the message with appropriate components
  if (adminRow) {
    await (ticketChannel as TextChannel).send({
      content: `<@${user.id}> ${
        config.supportRoleId ? `<@&${config.supportRoleId}>` : ""
      }`,
      embeds: [welcomeEmbed],
      components: [row, adminRow],
    });
  } else {
    await (ticketChannel as TextChannel).send({
      content: `<@${user.id}> ${
        config.supportRoleId ? `<@&${config.supportRoleId}>` : ""
      }`,
      embeds: [welcomeEmbed],
      components: [row],
    });
  }

  // Log ticket creation if log channel is configured
  if (config.logChannelId) {
    const logChannel = (await guild.channels.fetch(
      config.logChannelId
    )) as TextChannel;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("Ticket Created")
        .addFields(
          { name: "Ticket", value: `<#${ticketChannel.id}>` },
          { name: "Created by", value: `<@${user.id}>` },
          { name: "Type", value: ticketType },
          { name: "Reason", value: reason }
        )
        .setTimestamp();

      await ticketService.logTicketEvent(guild, config.logChannelId, logEmbed);
    }
  }

  await interaction.reply({
    content: `Ticket created! <#${ticketChannel.id}>`,
    ephemeral: true,
  });
}
