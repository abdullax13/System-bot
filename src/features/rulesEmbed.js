// src/features/rulesEmbed.js
const { EmbedBuilder } = require("discord.js");

async function ensureRulesEmbed(client, store) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(process.env.RULES_CHANNEL_ID);

  const serverIcon = guild.iconURL({ size: 256 });
  const bannerUrl = process.env.https://cdn.discordapp.com/attachments/1475184112556966040/1475193445088890910/C77AAEEA-8F3B-4B83-A6A4-A893F7019FE9.png?ex=699c9875&is=699b46f5&hm=523c0fffec89ff45cc6399da4b1749253cdee5616af466d93ed2b9dea8d75516&; // رابط البنر الكبير

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
