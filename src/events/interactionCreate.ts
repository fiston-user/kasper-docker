import {
  Events,
  Interaction,
  EmbedBuilder,
  TextChannel,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "../index";
import * as ticketButtons from "../buttons/ticketButtons";
import * as ticketModals from "../modals/ticketModals";

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Handle button interactions
    if (interaction.isButton()) {
      // Handle close ticket button
      if (interaction.customId === "close_ticket") {
        await ticketButtons.handleCloseTicket(interaction);
      }

      // Handle lock ticket button
      if (interaction.customId === "lock_ticket") {
        // Check if user has administrator permissions
        if (
          !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
          await interaction.reply({
            content:
              "You don't have permission to lock tickets. Only administrators can use this command.",
            ephemeral: true,
          });
          return;
        }
        await ticketButtons.handleLockTicket(interaction);
      }

      // Handle unlock ticket button
      if (interaction.customId === "unlock_ticket") {
        // Check if user has administrator permissions
        if (
          !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
        ) {
          await interaction.reply({
            content:
              "You don't have permission to unlock tickets. Only administrators can use this command.",
            ephemeral: true,
          });
          return;
        }
        await ticketButtons.handleUnlockTicket(interaction);
      }

      // Handle create ticket buttons from panel
      if (interaction.customId.startsWith("create_ticket_")) {
        const ticketType = interaction.customId.replace("create_ticket_", "");

        // Create a modal for the user to enter the reason
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${ticketType}`)
          .setTitle(
            `Create a ${
              ticketType.charAt(0) + ticketType.slice(1).toLowerCase()
            } Ticket`
          );

        // Add inputs to the modal
        const reasonInput = new TextInputBuilder()
          .setCustomId("ticket_reason")
          .setLabel("Please describe your issue")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Enter the reason for creating this ticket...")
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000);

        // Add inputs to the modal
        const firstActionRow =
          new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
        modal.addComponents(firstActionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal_")) {
        const ticketType = interaction.customId.replace("ticket_modal_", "");
        await ticketModals.handleTicketCreate(interaction, ticketType);
      }
    }
  },
};

// Handle closing a ticket
async function handleCloseTicket(interaction: any) {
  // Check if the channel is a ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      channelId: interaction.channel?.id,
      status: { in: ["OPEN", "LOCKED"] },
    },
  });

  if (!ticket) {
    await interaction.reply({
      content: "This channel is not an open or locked ticket.",
      ephemeral: true,
    });
    return;
  }

  // Update ticket status
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  // Get ticket configuration
  const config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  // Create close embed
  const closeEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("Ticket Closed")
    .setDescription(`This ticket has been closed by <@${interaction.user.id}>`)
    .setTimestamp();

  await interaction.reply({ embeds: [closeEmbed] });

  // Log ticket closure if log channel is configured
  if (config?.logChannelId) {
    const guild = interaction.guild;
    if (guild) {
      const logChannel = (await guild.channels.fetch(
        config.logChannelId
      )) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Ticket Closed")
          .addFields(
            {
              name: "Ticket",
              value:
                interaction.channel && "name" in interaction.channel
                  ? `#${interaction.channel.name}`
                  : `#unknown-channel`,
            },
            { name: "Closed by", value: `<@${interaction.user.id}>` },
            { name: "Created by", value: `<@${ticket.userId}>` }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  }

  // Archive the channel
  setTimeout(async () => {
    if (interaction.channel?.isTextBased()) {
      await (interaction.channel as TextChannel).send(
        "This channel will be deleted in 5 seconds..."
      );

      setTimeout(async () => {
        await interaction.channel?.delete();
      }, 5000);
    }
  }, 5000);
}

// Handle locking a ticket
async function handleLockTicket(interaction: any) {
  // Check if the channel is a ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      channelId: interaction.channel?.id,
      status: "OPEN",
    },
  });

  if (!ticket) {
    await interaction.reply({
      content:
        "This channel is not an open ticket or is already locked/closed.",
      ephemeral: true,
    });
    return;
  }

  // Update ticket status
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "LOCKED",
      lockedAt: new Date(),
    },
  });

  // Get ticket configuration
  const config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  // Update channel permissions to prevent user from sending messages
  if (interaction.guild) {
    const channel = interaction.channel as TextChannel;
    await channel.permissionOverwrites.edit(ticket.userId, {
      SendMessages: false,
    });

    // Create lock embed
    const lockEmbed = new EmbedBuilder()
      .setColor(0xffa500) // Orange color
      .setTitle("Ticket Locked")
      .setDescription(
        `This ticket has been locked by <@${interaction.user.id}>. Users can no longer send messages.`
      )
      .setTimestamp();

    // Create buttons for ticket actions - only admins can see these buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("unlock_ticket")
        .setLabel("Unlock Ticket (Admin Only)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [lockEmbed], components: [row] });

    // Log ticket lock if log channel is configured
    if (config?.logChannelId) {
      const guild = interaction.guild;
      if (guild) {
        const logChannel = (await guild.channels.fetch(
          config.logChannelId
        )) as TextChannel;
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0xffa500)
            .setTitle("Ticket Locked")
            .addFields(
              {
                name: "Ticket",
                value:
                  interaction.channel && "name" in interaction.channel
                    ? `#${interaction.channel.name}`
                    : `#unknown-channel`,
              },
              { name: "Locked by", value: `<@${interaction.user.id}>` },
              { name: "Created by", value: `<@${ticket.userId}>` }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    }
  }
}

// Handle unlocking a ticket
async function handleUnlockTicket(interaction: any) {
  // Check if the channel is a locked ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      channelId: interaction.channel?.id,
      status: "LOCKED",
    },
  });

  if (!ticket) {
    await interaction.reply({
      content: "This channel is not a locked ticket.",
      ephemeral: true,
    });
    return;
  }

  // Update ticket status
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "OPEN",
      lockedAt: null,
    },
  });

  // Get ticket configuration
  const config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  // Update channel permissions to allow user to send messages again
  if (interaction.guild) {
    const channel = interaction.channel as TextChannel;
    await channel.permissionOverwrites.edit(ticket.userId, {
      SendMessages: true,
    });

    // Create unlock embed
    const unlockEmbed = new EmbedBuilder()
      .setColor(0x00ff00) // Green color
      .setTitle("Ticket Unlocked")
      .setDescription(
        `This ticket has been unlocked by <@${interaction.user.id}>. Users can now send messages again.`
      )
      .setTimestamp();

    // Create buttons for ticket actions - only admins can see lock button
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("lock_ticket")
        .setLabel("Lock Ticket (Admin Only)")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [unlockEmbed], components: [row] });

    // Log ticket unlock if log channel is configured
    if (config?.logChannelId) {
      const guild = interaction.guild;
      if (guild) {
        const logChannel = (await guild.channels.fetch(
          config.logChannelId
        )) as TextChannel;
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle("Ticket Unlocked")
            .addFields(
              {
                name: "Ticket",
                value:
                  interaction.channel && "name" in interaction.channel
                    ? `#${interaction.channel.name}`
                    : `#unknown-channel`,
              },
              { name: "Unlocked by", value: `<@${interaction.user.id}>` },
              { name: "Created by", value: `<@${ticket.userId}>` }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    }
  }
}

// Create a new ticket from panel interaction
async function createTicket(
  interaction: any,
  ticketType: string,
  reason: string
) {
  const user = interaction.user;
  const guild = interaction.guild;

  // Check if user already has an open ticket
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      userId: user.id,
      guildId: guild.id,
      status: { in: ["OPEN", "LOCKED"] },
    },
  });

  if (existingTicket) {
    await interaction.reply({
      content: `You already have an open ticket <#${existingTicket.channelId}>`,
      ephemeral: true,
    });
    return;
  }

  // Get or create ticket configuration
  let config = await prisma.ticketConfig.findUnique({
    where: { id: "config" },
  });

  if (!config) {
    config = await prisma.ticketConfig.create({
      data: {
        id: "config",
        guildId: guild.id,
      },
    });
  }

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
  const ticket = await prisma.ticket.create({
    data: {
      channelId: ticketChannel.id,
      userId: user.id,
      guildId: guild.id,
      ticketType: ticketType,
    },
  });

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

      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  await interaction.reply({
    content: `Ticket created! <#${ticketChannel.id}>`,
    ephemeral: true,
  });
}
