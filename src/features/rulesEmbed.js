// src/features/rulesEmbed.js
const { EmbedBuilder } = require("discord.js");

async function ensureRulesEmbed(client, store) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(process.env.RULES_CHANNEL_ID);

  const serverIcon = guild.iconURL({ size: 256 });
  const bannerUrl = process.env.RULES_BANNER_URL; // رابط البنر الكبير

  const embed = new EmbedBuilder()
    .setAuthor({ name: guild.name, iconURL: serverIcon })
    .setTitle("Rules")
    .setThumbnail(serverIcon)
    .setImage(bannerUrl)
    .setDescription("حط قوانينك هنا…")
    .setColor(0xff5500);

  const key = `rulesMessageId:${guild.id}`;
  const existingId = store.get(key);

  if (existingId) {
    try {
      const msg = await channel.messages.fetch(existingId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch (e) {
      // لو انحذف، نعيد الإرسال
    }
  }

  const msg = await channel.send({ embeds: [embed] });
  store.set(key, msg.id);
}

module.exports = { ensureRulesEmbed };
