// index.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { createStore } = require("./src/store");

const { setupWelcome } = require("./src/features/welcome");
const { setupLobby } = require("./src/features/lobby");
const { setupTickets } = require("./src/features/tickets");
const { setupSetupCommand } = require("./src/features/setup");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

const store = createStore("data.json");

// listeners
setupWelcome(client, store);
setupLobby(client, store);
setupTickets(client, store);
setupSetupCommand(client, store);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
