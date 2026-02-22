// src/features/welcome.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

function setupWelcome(client, store) {
  client.on("guildMemberAdd", async (member) => {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    const ch = member.guild.channels.cache.get(channelId);
    if (!ch) return;

    // inviter (نسخة مبسطة: لو ما تبي tracking الحين)
    const inviterText = "Unknown";

    // خيار 1: رابط صورة (CDN)
    const file = new AttachmentBuilder("assets/welcome.png");
embed.setImage("attachment://welcome.png");
await ch.send({ embeds:[embed], files:[file] });
    
    const embed = new EmbedBuilder()
      .setTitle(`Welcome to ${member.guild.name}`)
      .setDescription(
        `Welcome : ${member}\nInvited By : ${inviterText}`
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setImage(welcomeImageUrl)
      .setColor(0x00b0f4)
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  });
}

module.exports = { setupWelcome };
