import {
  TextChannel,
  EmbedBuilder,
  AttachmentBuilder,
  Message,
  Collection,
  Guild,
  User,
} from "discord.js";
import { prisma } from "../index";
import * as ticketService from "./ticketService";
import * as fs from "fs";
import * as path from "path";

/**
 * Generate an HTML transcript of a ticket's messages
 */
export async function generateTranscript(
  messages: Collection<string, Message>,
  ticketId: string,
  guild: Guild,
  ticketCreator: User
): Promise<string> {
  // Create transcripts directory if it doesn't exist
  const transcriptsDir = path.join(process.cwd(), "transcripts");
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  // Get ticket information
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error(`Ticket with ID ${ticketId} not found`);
  }

  // Create HTML content
  let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Transcript - ${ticket.id}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      .header {
        background-color: #5865F2;
        color: white;
        padding: 20px;
        border-radius: 5px;
        margin-bottom: 20px;
      }
      .ticket-info {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f5f5f5;
        border-radius: 5px;
      }
      .message {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 5px;
        background-color: #f9f9f9;
      }
      .message-header {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
      }
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 10px;
      }
      .username {
        font-weight: bold;
        color: #5865F2;
      }
      .timestamp {
        color: #999;
        font-size: 0.8em;
        margin-left: 10px;
      }
      .content {
        margin-left: 50px;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        color: #999;
        font-size: 0.8em;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Ticket Transcript</h1>
    </div>
    <div class="ticket-info">
      <p><strong>Ticket ID:</strong> ${ticket.id}</p>
      <p><strong>Created by:</strong> ${ticketCreator.tag} (${
    ticketCreator.id
  })</p>
      <p><strong>Type:</strong> ${ticket.ticketType}</p>
      <p><strong>Created at:</strong> ${new Date(
        ticket.createdAt
      ).toLocaleString()}</p>
      <p><strong>Closed at:</strong> ${
        ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : "N/A"
      }</p>
    </div>
    <div class="messages">
  `;

  // Sort messages by timestamp
  const sortedMessages = Array.from(messages.values()).sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  // Add each message to the HTML
  for (const message of sortedMessages) {
    if (message.author.bot && message.embeds.length > 0) continue; // Skip bot messages with embeds

    const author = message.author;
    const avatarUrl = author.displayAvatarURL({ extension: "png", size: 128 });
    const content = message.content.replace(/\n/g, "<br>");

    html += `
      <div class="message">
        <div class="message-header">
          <img src="${avatarUrl}" alt="${author.tag}" class="avatar">
          <span class="username">${author.tag}</span>
          <span class="timestamp">${message.createdAt.toLocaleString()}</span>
        </div>
        <div class="content">
          ${content || "[No content - may contain attachments or embeds]"}
        </div>
      </div>
    `;
  }

  // Close HTML
  html += `
    </div>
    <div class="footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
  </body>
  </html>
  `;

  // Save HTML to file
  const fileName = `ticket-${ticket.id}-${Date.now()}.html`;
  const filePath = path.join(transcriptsDir, fileName);
  fs.writeFileSync(filePath, html);

  return filePath;
}

/**
 * Save a transcript of a ticket
 */
export async function saveTranscript(
  channel: TextChannel,
  ticketId: string,
  closedBy: User
): Promise<string | null> {
  try {
    // Get ticket information
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Get ticket creator
    const ticketCreator = await channel.client.users.fetch(ticket.userId);

    // Fetch all messages in the channel
    const messages = await fetchAllMessages(channel);

    // Generate transcript
    const transcriptPath = await generateTranscript(
      messages,
      ticketId,
      channel.guild,
      ticketCreator
    );

    // Get ticket configuration
    const config = await ticketService.getOrCreateConfig(channel.guild.id);

    // If transcript channel is configured, send the transcript there
    if (config.transcriptChannelId && config.saveTranscripts) {
      const transcriptChannel = (await channel.guild.channels.fetch(
        config.transcriptChannelId
      )) as TextChannel;

      if (transcriptChannel) {
        const attachment = new AttachmentBuilder(transcriptPath, {
          name: path.basename(transcriptPath),
        });

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("Ticket Transcript")
          .setDescription(`Transcript for ticket ${ticket.id}`)
          .addFields(
            { name: "Ticket", value: channel.name },
            { name: "Created by", value: `<@${ticket.userId}>` },
            { name: "Closed by", value: `<@${closedBy.id}>` },
            { name: "Type", value: ticket.ticketType }
          )
          .setTimestamp();

        const message = await transcriptChannel.send({
          embeds: [embed],
          files: [attachment],
        });

        // Save transcript URL to ticket
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { transcriptUrl: message.attachments.first()?.url },
        });

        return message.attachments.first()?.url || null;
      }
    }

    return null;
  } catch (error) {
    console.error("Error saving transcript:", error);
    return null;
  }
}

/**
 * Fetch all messages in a channel
 */
async function fetchAllMessages(
  channel: TextChannel
): Promise<Collection<string, Message>> {
  let allMessages = new Collection<string, Message>();
  let lastId: string | undefined;

  while (true) {
    const options = { limit: 100 } as { limit: number; before?: string };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    allMessages = allMessages.concat(messages);
    lastId = messages.last()?.id;

    if (messages.size < 100) break;
  }

  return allMessages;
}
