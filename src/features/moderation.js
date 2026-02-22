// src/features/moderation.js
const { PermissionFlagsBits, ChannelType } = require("discord.js");

function setupModeration(client) {
  client.on("interactionCreate", async (i) => {
    try {
      if (!i.isChatInputCommand()) return;

      // Helpers
      const mustHavePerm = (perm) =>
        i.memberPermissions && i.memberPermissions.has(perm);

      if (i.commandName === "clear") {
        if (!mustHavePerm(PermissionFlagsBits.ManageMessages)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const amount = i.options.getInteger("amount", true);
        const ch = i.channel;
        if (!ch || ch.type !== ChannelType.GuildText) {
          return i.reply({ content: "هذا الأمر للرومات الكتابية فقط.", ephemeral: true });
        }
        const clamped = Math.max(1, Math.min(100, amount));
        const deleted = await ch.bulkDelete(clamped, true);
        return i.reply({ content: `تم مسح ${deleted.size} رسالة.`, ephemeral: true });
      }

      if (i.commandName === "kick") {
        if (!mustHavePerm(PermissionFlagsBits.KickMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const user = i.options.getUser("user", true);
        const reason = i.options.getString("reason") || "No reason";
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: "ما لقيت العضو.", ephemeral: true });
        await member.kick(reason).catch((e) => { throw e; });
        return i.reply({ content: `تم طرد ${user.tag}.`, ephemeral: true });
      }

      if (i.commandName === "ban") {
        if (!mustHavePerm(PermissionFlagsBits.BanMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const user = i.options.getUser("user", true);
        const reason = i.options.getString("reason") || "No reason";
        await i.guild.members.ban(user.id, { reason }).catch((e) => { throw e; });
        return i.reply({ content: `تم باند ${user.tag}.`, ephemeral: true });
      }

      if (i.commandName === "timeout") {
        if (!mustHavePerm(PermissionFlagsBits.ModerateMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const user = i.options.getUser("user", true);
        const minutes = i.options.getInteger("minutes", true);
        const reason = i.options.getString("reason") || "No reason";
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: "ما لقيت العضو.", ephemeral: true });

        const ms = Math.max(1, minutes) * 60 * 1000;
        await member.timeout(ms, reason).catch((e) => { throw e; });
        return i.reply({ content: `تم تايم اوت ${user.tag} لمدة ${minutes} دقيقة.`, ephemeral: true });
      }

      if (i.commandName === "untimeout") {
        if (!mustHavePerm(PermissionFlagsBits.ModerateMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const user = i.options.getUser("user", true);
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: "ما لقيت العضو.", ephemeral: true });

        await member.timeout(null).catch((e) => { throw e; });
        return i.reply({ content: `تم فك التايم اوت عن ${user.tag}.`, ephemeral: true });
      }

      if (i.commandName === "move") {
        if (!mustHavePerm(PermissionFlagsBits.MoveMembers)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const user = i.options.getUser("user", true);
        const channel = i.options.getChannel("channel", true);

        if (channel.type !== ChannelType.GuildVoice) {
          return i.reply({ content: "لازم تختار روم صوتي.", ephemeral: true });
        }

        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: "ما لقيت العضو.", ephemeral: true });
        if (!member.voice.channelId) return i.reply({ content: "العضو مو داخل فويس.", ephemeral: true });

        await member.voice.setChannel(channel.id).catch((e) => { throw e; });
        return i.reply({ content: `تم سحب ${user.tag} إلى ${channel.name}.`, ephemeral: true });
      }

      if (i.commandName === "lock" || i.commandName === "unlock") {
        if (!mustHavePerm(PermissionFlagsBits.ManageChannels)) {
          return i.reply({ content: "ما عندك صلاحية.", ephemeral: true });
        }
        const target = i.options.getChannel("channel") || i.channel;

        if (!target || target.type !== ChannelType.GuildText) {
          return i.reply({ content: "هذا الأمر للرومات الكتابية فقط.", ephemeral: true });
        }

        const allowSend = (i.commandName === "unlock");
        await target.permissionOverwrites.edit(i.guild.roles.everyone, {
          SendMessages: allowSend,
        });

        return i.reply({ content: allowSend ? "تم فتح الروم." : "تم قفل الروم.", ephemeral: true });
      }

    } catch (e) {
      console.error("Moderation error:", e);
      if (i.isRepliable()) {
        await i.reply({ content: "صار خطأ بالأمر.", ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = { setupModeration };
