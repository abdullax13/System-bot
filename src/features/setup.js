// src/features/setup.js
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

const { sendTicketsPanel } = require("./tickets");
const { sendLobbyPanel } = require("./lobby");

// إذا عندك rulesEmbed.js ويصدّر sendRulesPanel خلّه
let sendRulesPanel = null;
try {
  ({ sendRulesPanel } = require("./rulesEmbed"));
} catch (_) {
  sendRulesPanel = null;
}

const { registerModCommands } = require("./mod");

function setCfg(store, guildId, key, value) {
  store.set(`cfg:${guildId}:${key}`, value);
}

async function registerAllCommands() {
  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error("Missing BOT_TOKEN / CLIENT_ID / GUILD_ID in environment variables.");
  }

  const setupCmd = new SlashCommandBuilder()
    .setName("setup")
    .setDescription("تحديد الرومات وإرسال Panels")
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("نوع الإعداد")
        .setRequired(true)
        .addChoices(
          { name: "welcome", value: "welcome" },
          { name: "ticket", value: "ticket" },
          { name: "lobby", value: "lobby" },
          { name: "rules", value: "rules" }
        )
    )
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("الروم المستهدف")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((o) =>
      o
        .setName("category")
        .setDescription("Category (مطلوبة للـ ticket و lobby)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  // أوامر الإدارة (clear/lock/unlock/move)
  const modCmds = await registerModCommands();

  const rest = new REST({ version: "10" }).setToken(token);

  // ✅ تسجيل كل الأوامر مع بعض (بدون overwrite لاحق)
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: [setupCmd.toJSON(), ...modCmds],
  });

  console.log("Slash commands registered (setup + mod).");
}

function setupSetupCommand(client, store) {
  // سجّل الأوامر عند التشغيل
  registerAllCommands().catch((e) => {
    console.error("Command registration error:", e);
  });

  client.on("interactionCreate", async (i) => {
    try {
      if (!i.isChatInputCommand()) return;
      if (i.commandName !== "setup") return;

      // صلاحية
      if (!i.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return i.reply({ content: "لازم Administrator.", ephemeral: true });
      }

      const type = i.options.getString("type", true);
      const channel = i.options.getChannel("channel", true);
      const category = i.options.getChannel("category", false);

      await i.deferReply({ ephemeral: true });

      const guildId = i.guildId;

      if (type === "welcome") {
        setCfg(store, guildId, "welcomeChannelId", channel.id);
        return i.editReply(`تم تعيين روم الترحيب: ${channel}`);
      }

      if (type === "ticket") {
        if (!category) return i.editReply("لازم تختار category للـ ticket.");
        setCfg(store, guildId, "ticketsChannelId", channel.id);
        setCfg(store, guildId, "ticketsCategoryId", category.id);

        // إرسال/تحديث Panel
        await sendTicketsPanel(client, store, guildId);

        return i.editReply(`تم تعيين روم التيكت: ${channel} وتعيين كاتيجوري: ${category} وإرسال Panel.`);
      }

      if (type === "lobby") {
        if (!category) return i.editReply("لازم تختار category للـ lobby.");
        setCfg(store, guildId, "lobbyChannelId", channel.id);
        setCfg(store, guildId, "lobbyCategoryId", category.id);

        // إرسال/تحديث Panel
        await sendLobbyPanel(client, store, guildId);

        return i.editReply(`تم إرسال lobby panel في ${channel} وتعيين كاتيجوري: ${category}`);
      }

      if (type === "rules") {
        setCfg(store, guildId, "rulesChannelId", channel.id);

        if (sendRulesPanel) {
          await sendRulesPanel(client, store, guildId);
          return i.editReply(`تم تعيين روم القوانين: ${channel} وإرسال Panel.`);
        }

        return i.editReply(`تم تعيين روم القوانين: ${channel} (ملف rulesEmbed.js غير موجود لإرسال Panel).`);
      }
    } catch (e) {
      console.error("Setup command error:", e);
      if (i.deferred) return i.editReply("صار خطأ.").catch(() => {});
      return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
    }
  });
}

module.exports = { setupSetupCommand };
