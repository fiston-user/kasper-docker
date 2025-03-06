import {
  SlashCommandBuilder,
  CommandInteraction,
  ChannelType,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  PermissionFlagsBits,
} from "discord.js";
import { prisma } from "../index";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system commands")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new ticket")
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for creating the ticket")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type of ticket")
            .setRequired(true)
            .addChoices(
              { name: "Support", value: "SUPPORT" },
              { name: "Billing", value: "BILLING" },
              { name: "Technical", value: "TECHNICAL" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("close").setDescription("Close the current ticket")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("lock").setDescription("Lock the current ticket")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("unlock").setDescription("Unlock the current ticket")
    ),

  async execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await handleCreateTicket(interaction);
    } else if (subcommand === "close") {
      await handleCloseTicket(interaction);
    } else if (subcommand === "lock") {
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
      await handleLockTicket(interaction);
    } else if (subcommand === "unlock") {
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
      await handleUnlockTicket(interaction);
    }
  },
};

async function handleCreateTicket(interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) return;

  const reason = interaction.options.getString("reason", true);
  const ticketType = interaction.options.getString("type", true);
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
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      userId: user.id,
      guildId: guild.id,
      status: "OPEN",
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
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await (ticketChannel as TextChannel).send({
    content: `<@${user.id}> ${
      config.supportRoleId ? `<@&${config.supportRoleId}>` : ""
    }`,
    embeds: [welcomeEmbed],
    components: [row],
  });

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

async function handleCloseTicket(interaction: CommandInteraction) {
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
      status: "OPEN",
    },
  });

  if (!ticket) {
    await interaction.reply({
      content: "This channel is not an open ticket.",
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

async function handleLockTicket(interaction: CommandInteraction) {
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

    await interaction.reply({ embeds: [lockEmbed] });

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

async function handleUnlockTicket(interaction: CommandInteraction) {
  if (!interaction.channel) {
    await interaction.reply({
      content: "This command can only be used in a channel.",
      ephemeral: true,
    });
    return;
  }

  // Check if the channel is a locked ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      channelId: interaction.channel.id,
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

    await interaction.reply({ embeds: [unlockEmbed] });

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
