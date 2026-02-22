// src/features/mod.js
const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

async function registerModCommands() {
  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  const cmds = [
    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("مسح رسائل")
      .addIntegerOption(o =>
        o.setName("amount").setDescription("عدد الرسائل (1-100)").setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
      .setName("lock")
      .setDescription("قفل روم كتابي (منع إرسال للكل)")
      .addChannelOption(o =>
        o.setName("channel").setDescription("الروم").setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("فتح روم كتابي")
      .addChannelOption(o =>
        o.setName("channel").setDescription("الروم").setRequired(false)
          .addChannelTypes(ChannelType.GuildText)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName("move")
      .setDescription("سحب شخص إلى روم صوتي")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .addChannelOption(o =>
        o.setName("voice").setDescription("الروم الصوتي").setRequired(true)
          .addChannelTypes(ChannelType.GuildVoice)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  // ⚠️ مهم: لا تسوي PUT هنا لوحده إذا setup.js يسوي PUT لوحده
  // عشان ما يصير overwrite. لذلك بنسوي التسجيل من setup.js نفسه (تحت بشرح)
  return cmds;
}

function setupMod(client) {
  client.on("interactionCreate", async (i) => {
    try {
      if (!i.isChatInputCommand()) return;

      // /clear
      if (i.commandName === "clear") {
        const amount = i.options.getInteger("amount", true);
        const n = Math.max(1, Math.min(100, amount));

        if (!i.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }

        await i.deferReply({ ephemeral: true });
        const deleted = await i.channel.bulkDelete(n, true).catch(() => null);
        return i.editReply(deleted ? `تم مسح ${deleted.size} رسالة.` : "ما قدرت أمسح (يمكن رسائل قديمة).");
      }

      // /lock /unlock
      if (i.commandName === "lock" || i.commandName === "unlock") {
        if (!i.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }

        const channel = i.options.getChannel("channel") || i.channel;

        await i.deferReply({ ephemeral: true });

        const deny = (i.commandName === "lock");
        await channel.permissionOverwrites.edit(i.guild.roles.everyone.id, {
          SendMessages: deny ? false : null,
        }).catch(() => null);

        return i.editReply(deny ? `تم قفل ${channel}` : `تم فتح ${channel}`);
      }

      // /move
      if (i.commandName === "move") {
        if (!i.memberPermissions.has(PermissionFlagsBits.MoveMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }

        const user = i.options.getUser("user", true);
        const voice = i.options.getChannel("voice", true);

        await i.deferReply({ ephemeral: true });

        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.editReply("العضو غير موجود.");

        if (!member.voice?.channel) return i.editReply("العضو مو داخل روم صوتي.");

        await member.voice.setChannel(voice).catch(() => null);
        return i.editReply(`تم سحب ${user} إلى ${voice}`);
      }

    } catch (e) {
      console.error("Mod error:", e);
      if (i.deferred) return i.editReply("صار خطأ.").catch(() => {});
      return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
    }
  });
}

module.exports = { registerModCommands, setupMod };
