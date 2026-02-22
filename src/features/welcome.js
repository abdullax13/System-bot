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
    const welcomeImageUrl = process.env.https://cdn.discordapp.com/attachments/1475184112556966040/1475191306576724081/EFBB5ABD-0077-4291-8284-5179EC2F7B1E.png?ex=699c9677&is=699b44f7&hm=4d7947944e3dc2232a2d712faceac8097b156c3345d7f812ad961428e4415c4a&; // حط رابط الصورة هنا

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
