// index.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { createStore } = require("./src/store");
const { setupWelcome } = require("./src/features/welcome");
const { ensureRulesEmbed } = require("./src/features/rulesEmbed");
const { setupLobby } = require("./src/features/lobby");

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

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Features
  setupWelcome(client, store);
  setupLobby(client, store);

  // ثابتات (Rules / Ticket panel لاحقاً)
  try { await ensureRulesEmbed(client, store); } catch (e) { console.error(e); }
});

client.login(process.env.BOT_TOKEN);
