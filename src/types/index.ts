import { Ticket, TicketConfig } from "@prisma/client";
import { ModalSubmitInteraction } from "discord.js";

export type TicketStatus = "OPEN" | "CLOSED" | "LOCKED";
export type TicketType = "SUPPORT" | "BILLING" | "TECHNICAL";

export interface TicketWithRelations extends Ticket {
  // Add any relations we might need in the future
}

// Use Discord.js types directly
export type TicketModalSubmitInteraction = ModalSubmitInteraction;
