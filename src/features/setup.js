// src/features/setup.js
const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

async function registerSetupCommand() {
  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error("Missing BOT_TOKEN / CLIENT_ID / GUILD_ID");
  }

  const cmd = new SlashCommandBuilder()
    .setName("setup")
    .setDescription("تحديد الرومات وإرسال Panels")
    .addStringOption(o =>
      o.setName("type")
        .setDescription("نوع النظام")
        .setRequired(true)
        .addChoices(
          { name: "welcome", value: "welcome" },
          { name: "rules", value: "rules" },
          { name: "lobby", value: "lobby" },
          { name: "ticket", value: "ticket" },
        )
    )
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("الروم اللي ينرسل فيه الـ Panel")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption(o =>
      o.setName("category")
        .setDescription("كاتيجوري (مطلوب للـ lobby/ticket)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [cmd.toJSON()] });
}

function setupSetupCommand(client, store) {
  client.once("ready", async () => {
    try {
      await registerSetupCommand();
      console.log("Setup command registered.");
    } catch (e) {
      console.error("Failed to register setup command:", e);
    }
  });

  client.on("interactionCreate", async (i) => {
    try {
      if (!i.isChatInputCommand()) return;
      if (i.commandName !== "setup") return;

      await i.deferReply({ ephemeral: true });

      const type = i.options.getString("type", true);
      const channel = i.options.getChannel("channel", true);
      const category = i.options.getChannel("category", false);

      // خزّن الإعدادات
      if (type === "welcome") {
        store.set(`cfg:${i.guildId}:welcomeChannelId`, channel.id);
        return i.editReply(`تم تعيين روم الترحيب: ${channel}`);
      }

      if (type === "rules") {
        store.set(`cfg:${i.guildId}:rulesChannelId`, channel.id);
        // نطلب من rulesEmbed.js يسوي إرسال
        const { sendRulesPanel } = require("./rulesEmbed");
        await sendRulesPanel(client, store, i.guildId);
        return i.editReply(`تم إرسال rules في ${channel}`);
      }

      if (type === "lobby") {
        if (!category) return i.editReply("لازم تختار category للـ lobby.");
        store.set(`cfg:${i.guildId}:lobbyChannelId`, channel.id);
        store.set(`cfg:${i.guildId}:lobbyCategoryId`, category.id);

        const { sendLobbyPanel } = require("./lobby");
        await sendLobbyPanel(client, store, i.guildId);
        return i.editReply(`تم إرسال lobby panel في ${channel} و تعيين كاتيجوري ${category}`);
      }

      if (type === "ticket") {
        if (!category) return i.editReply("لازم تختار category للـ ticket.");
        store.set(`cfg:${i.guildId}:ticketsChannelId`, channel.id);
        store.set(`cfg:${i.guildId}:ticketsCategoryId`, category.id);

        const { sendTicketsPanel } = require("./tickets");
        await sendTicketsPanel(client, store, i.guildId);
        return i.editReply(`تم إرسال tickets panel في ${channel} و تعيين كاتيجوري ${category}`);
      }

    } catch (e) {
      console.error("Setup command error:", e);
      if (i.deferred) return i.editReply("صار خطأ.");
      return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
    }
  });
}

module.exports = { setupSetupCommand };
