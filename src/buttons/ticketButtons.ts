import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  CommandInteraction,
  ButtonInteraction,
} from "discord.js";
import * as ticketService from "../services/ticketService";
import * as transcriptService from "../services/transcriptService";

// Define a type that can be either a button or command interaction
type TicketInteraction = ButtonInteraction | CommandInteraction;

/**
 * Handle the close ticket button
 */
export async function handleCloseTicket(interaction: TicketInteraction) {
  // Check if the channel is a ticket
  const channelId = interaction.channel?.id;
  if (!channelId) {
    await interaction.reply({
      content: "This command can only be used in a channel.",
      ephemeral: true,
    });
    return;
  }

  const ticket = await ticketService.findTicketByChannel(channelId, [
    "OPEN",
    "LOCKED",
  ]);

  if (!ticket) {
    await interaction.reply({
      content: "This channel is not an open or locked ticket.",
      ephemeral: true,
    });
    return;
  }

  // Get ticket configuration
  const config = await ticketService.getOrCreateConfig(
    interaction.guild?.id || ""
  );

  // Create close embed
  const closeEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("Ticket Closed")
    .setDescription(`This ticket has been closed by <@${interaction.user.id}>`)
    .setTimestamp();

  await interaction.reply({ embeds: [closeEmbed] });

  // Save transcript if enabled
  let transcriptUrl = null;
  if (config.saveTranscripts && interaction.channel) {
    const textChannel = interaction.channel as TextChannel;
    await textChannel.send("Saving transcript...");
    transcriptUrl = await transcriptService.saveTranscript(
      textChannel,
      ticket.id,
      interaction.user
    );
  }

  // Update ticket status
  await ticketService.updateTicketStatus(ticket.id, "CLOSED");

  // Log ticket closure if log channel is configured
  if (config?.logChannelId) {
    const guild = interaction.guild;
    if (guild) {
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

      // Add transcript link if available
      if (transcriptUrl) {
        logEmbed.addFields({
          name: "Transcript",
          value: `[View Transcript](${transcriptUrl})`,
        });
      }

      await ticketService.logTicketEvent(guild, config.logChannelId, logEmbed);
    }
  }

  // Send transcript link to user if available
  if (transcriptUrl) {
    try {
      const creator = await interaction.client.users.fetch(ticket.userId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Ticket Closed")
        .setDescription(
          `Your ticket in ${interaction.guild?.name} has been closed.`
        )
        .addFields(
          {
            name: "Ticket",
            value:
              interaction.channel && "name" in interaction.channel
                ? `#${interaction.channel.name}`
                : `#unknown-channel`,
          },
          { name: "Transcript", value: `[View Transcript](${transcriptUrl})` }
        )
        .setTimestamp();

      await creator.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.error("Failed to send transcript to user:", error);
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

/**
 * Handle the lock ticket button
 */
export async function handleLockTicket(interaction: TicketInteraction) {
  // Check if the channel is a ticket
  const channelId = interaction.channel?.id;
  if (!channelId) {
    await interaction.reply({
      content: "This command can only be used in a channel.",
      ephemeral: true,
    });
    return;
  }

  const ticket = await ticketService.findTicketByChannel(channelId, "OPEN");

  if (!ticket) {
    await interaction.reply({
      content:
        "This channel is not an open ticket or is already locked/closed.",
      ephemeral: true,
    });
    return;
  }

  // Update ticket status
  await ticketService.updateTicketStatus(ticket.id, "LOCKED");

  // Get ticket configuration
  const config = await ticketService.getOrCreateConfig(
    interaction.guild?.id || ""
  );

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

        await ticketService.logTicketEvent(
          guild,
          config.logChannelId,
          logEmbed
        );
      }
    }
  }
}

/**
 * Handle the unlock ticket button
 */
export async function handleUnlockTicket(interaction: TicketInteraction) {
  // Check if the channel is a locked ticket
  const channelId = interaction.channel?.id;
  if (!channelId) {
    await interaction.reply({
      content: "This command can only be used in a channel.",
      ephemeral: true,
    });
    return;
  }

  const ticket = await ticketService.findTicketByChannel(channelId, "LOCKED");

  if (!ticket) {
    await interaction.reply({
      content: "This channel is not a locked ticket.",
      ephemeral: true,
    });
    return;
  }

  // Update ticket status
  await ticketService.updateTicketStatus(ticket.id, "OPEN");

  // Get ticket configuration
  const config = await ticketService.getOrCreateConfig(
    interaction.guild?.id || ""
  );

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

        await ticketService.logTicketEvent(
          guild,
          config.logChannelId,
          logEmbed
        );
      }
    }
  }
}
