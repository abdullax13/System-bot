// src/features/welcome.js
const { EmbedBuilder } = require("discord.js");

function setupWelcome(client) {
  client.on("guildMemberAdd", async (member) => {
    try {
      const channelId = process.env.WELCOME_CHANNEL_ID;
      if (!channelId) return;

      const ch = await member.guild.channels.fetch(channelId).catch(() => null);
      if (!ch) return;

      const inviterText = "Unknown"; // لاحقاً نركب invite tracking

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name}`)
        .setDescription(`Welcome : ${member}\nInvited By : ${inviterText}`)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setColor(0x00b0f4)
        .setTimestamp();

      const welcomeImageUrl = process.env.WELCOME_IMAGE_URL;
      if (welcomeImageUrl) embed.setImage(welcomeImageUrl);

      await ch.send({ embeds: [embed] });
    } catch (e) {
      console.error("Welcome error:", e);
    }
  });
}

module.exports = { setupWelcome };
