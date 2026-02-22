// src/registerCommands.js
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName("clear")
      .setDescription("مسح عدد من الرسائل")
      .addIntegerOption(o =>
        o.setName("amount").setDescription("عدد الرسائل (1-100)").setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("طرد عضو")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("السبب").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("باند عضو")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("السبب").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("ميوت كتابي (Timeout)")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("بالدقايق").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("السبب").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
      .setName("untimeout")
      .setDescription("فك التايم اوت")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    new SlashCommandBuilder()
      .setName("move")
      .setDescription("سحب عضو لروم صوتي")
      .addUserOption(o => o.setName("user").setDescription("العضو").setRequired(true))
      .addChannelOption(o => o.setName("channel").setDescription("الروم الصوتي").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    new SlashCommandBuilder()
      .setName("lock")
      .setDescription("قفل روم كتابي")
      .addChannelOption(o => o.setName("channel").setDescription("الروم").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("فتح روم كتابي")
      .addChannelOption(o => o.setName("channel").setDescription("الروم").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  ].map(c => c.toJSON());
}

async function registerGuildCommands() {
  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error("Missing BOT_TOKEN / CLIENT_ID / GUILD_ID in env.");
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = buildCommands();

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
}

module.exports = { registerGuildCommands };
