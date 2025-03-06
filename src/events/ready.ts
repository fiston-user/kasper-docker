import { ActivityType, Client, Events } from "discord.js";

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);

    // Set the bot's presence
    client.user?.setPresence({
      activities: [{ name: "for tickets", type: ActivityType.Listening }],
      status: "online",
    });
  },
};
