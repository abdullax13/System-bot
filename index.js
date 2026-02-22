// index.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { createStore } = require("./src/store");

const { registerGuildCommands } = require("./src/registerCommands");

const { setupWelcome } = require("./src/features/welcome");
const { ensureRulesEmbed } = require("./src/features/rulesEmbed");

const { setupLobby, ensureLobbyPanel } = require("./src/features/lobby");
const { setupTickets, ensureTicketsPanel } = require("./src/features/tickets");

const { setupModeration } = require("./src/features/moderation");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,     // مهم للـ welcome
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

const store = createStore("data.json");

// Features (listeners)
setupWelcome(client, store);
setupLobby(client, store);
setupTickets(client, store);
setupModeration(client, store);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // سجّل أوامر السلاش (Guild commands عشان تظهر فوراً)
  try {
    await registerGuildCommands();
    console.log("Slash commands registered.");
  } catch (e) {
    console.error("Failed to register slash commands:", e);
  }

  // Panels ثابتة
  try { await ensureRulesEmbed(client, store); } catch (e) { console.error("Rules error:", e); }
  try { await ensureLobbyPanel(client, store); } catch (e) { console.error("Lobby panel error:", e); }
  try { await ensureTicketsPanel(client, store); } catch (e) { console.error("Tickets panel error:", e); }
});

client.login(process.env.BOT_TOKEN);
