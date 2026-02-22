// index.js
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { createStore } = require("./src/store");

const { setupWelcome } = require("./src/features/welcome");
const { ensureRulesEmbed } = require("./src/features/rulesEmbed");

const { setupLobby, ensureLobbyPanel } = require("./src/features/lobby");
const { setupTickets, ensureTicketsPanel } = require("./src/features/tickets");

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

// listeners لازم يكونون برا ready
setupWelcome(client, store);
setupLobby(client, store);
setupTickets(client, store);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // ثابتات: تعدّل الرسالة إذا موجودة بدل ما ترسل كل مرة
  try { await ensureRulesEmbed(client, store); } catch (e) { console.error("Rules error:", e); }
  try { await ensureLobbyPanel(client, store); } catch (e) { console.error("Lobby panel error:", e); }
  try { await ensureTicketsPanel(client, store); } catch (e) { console.error("Tickets panel error:", e); }
});

client.login(process.env.BOT_TOKEN);
