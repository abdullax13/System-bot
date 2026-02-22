// src/features/welcome.js
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

function setupWelcome(client) {
  client.on("guildMemberAdd", async (member) => {
    try {
      const channelId = process.env.WELCOME_CHANNEL_ID;
      if (!channelId) return;

      const ch = await member.guild.channels.fetch(channelId).catch(() => null);
      if (!ch) return;

      // Canvas مطابق لصورتك
      const canvas = createCanvas(1024, 1024);
      const ctx = canvas.getContext("2d");

      const bgUrl = process.env.WELCOME_BG_URL;
      if (!bgUrl) {
        // إذا ما حطيت رابط الخلفية، نرسل نص فقط
        await ch.send(`• Welcome : ${member}\n• invited by : Unknown`);
        return;
      }

      const background = await loadImage(bgUrl);
      ctx.drawImage(background, 0, 0, 1024, 1024);

      const avatar = await loadImage(
        member.user.displayAvatarURL({ extension: "png", size: 512 })
      );

      // إحداثيات الدائرة (مضبوطة كبداية على القالب)
      const centerX = 512;
      const centerY = 600;
      const radius = 220;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();

      const buffer = await canvas.encode("png");
      const file = new AttachmentBuilder(buffer, { name: "welcome.png" });

      await ch.send({
        content: `• Welcome : ${member}\n• invited by : Unknown`,
        files: [file],
      });
    } catch (e) {
      console.error("Welcome error:", e);
    }
  });
}

module.exports = { setupWelcome };
