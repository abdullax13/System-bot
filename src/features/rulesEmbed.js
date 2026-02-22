// src/features/rulesEmbed.js
const { EmbedBuilder } = require("discord.js");

function cfg(store, guildId, key) {
  return store.get(`cfg:${guildId}:${key}`);
}

async function sendRulesPanel(client, store, guildId) {
  const rulesChannelId = cfg(store, guildId, "rulesChannelId");
  if (!rulesChannelId) throw new Error("Rules channel not configured. Run /setup type:rules");

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(rulesChannelId);

  const serverIcon = guild.iconURL({ size: 256 }) || undefined;
  const banner = process.env.RULES_BANNER_URL;

  const embed = new EmbedBuilder()
    .setAuthor({ name: guild.name, iconURL: serverIcon })
    .setTitle("Rules")
    .setDescription("حط قوانينك هنا…")
    .setThumbnail(serverIcon)
    .setColor(0xff5500);

  if (banner) embed.setImage(banner);

  const key = `panel:${guildId}:rulesMessageId`;
  const existingId = store.get(key);

  if (existingId) {
    const msg = await channel.messages.fetch(existingId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] });
      return msg;
    }
  }

  const msg = await channel.send({ embeds: [embed] });
  store.set(key, msg.id);
  return msg;
}

// setupRules موجودة بس ما تسوي إرسال تلقائي (عشان ما يتكرر)
function setupRules() {
  // no-op (rules يتم عبر /setup)
}

module.exports = { setupRules, sendRulesPanel };
