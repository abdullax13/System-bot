// src/features/welcome.js
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

function setupWelcome(client) {
  client.on("guildMemberAdd", async (member) => {
    try {
      const channelId = process.env.WELCOME_CHANNEL_ID;
      if (!channelId) return;

      const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext("2d");

const background = await loadImage(process.env.WELCOME_BG_URL);
ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

const avatar = await loadImage(
  member.user.displayAvatarURL({ extension: "png", size: 512 })
);

// الإحداثيات الخاصة بصورتك
const centerX = 512;
const centerY = 600;
const radius = 220;

ctx.save();
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
ctx.closePath();
ctx.clip();

ctx.drawImage(
  avatar,
  centerX - radius,
  centerY - radius,
  radius * 2,
  radius * 2
);

ctx.restore();

      const attachment = new AttachmentBuilder(
        await canvas.encode("png"),
        { name: "welcome.png" }
      );

      await ch.send({
        content: `• Welcome : ${member}\n• Invited by : Unknown`,
        files: [attachment],
      });

    } catch (e) {
      console.error("Welcome error:", e);
    }
  });
}

module.exports = { setupWelcome };
