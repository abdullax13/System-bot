// src/features/welcome.js
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

function cfg(store, guildId, key) {
  return store.get(`cfg:${guildId}:${key}`);
}

function setupWelcome(client, store) {
  client.on("guildMemberAdd", async (member) => {
    try {
      const channelId = cfg(store, member.guild.id, "welcomeChannelId");
      if (!channelId) return;

      const ch = await member.guild.channels.fetch(channelId).catch(() => null);
      if (!ch) return;

      const bgUrl = process.env.WELCOME_BG_URL;
      if (!bgUrl) {
        await ch.send(`• Welcome : ${member}\n• invited by : Unknown`);
        return;
      }

      const W = 1024, H = 1024;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      // القالب
      const template = await loadImage(bgUrl);

      // overlay: نسخة من القالب بنفرغ داخل الدائرة (حتى الأسود)
      const overlayCanvas = createCanvas(W, H);
      const octx = overlayCanvas.getContext("2d");
      octx.drawImage(template, 0, 0, W, H);

      // ✅ إحداثيات دائرتك (حسب صورة RA اللي أرسلتها)
      const centerX = 544;
      const centerY = 649;
      const innerRadius = 185;      // داخل الإطار
      const clipRadius = 185;       // قص الأفاتار بنفسها

      // فرّغ داخل الدائرة من أي لون داكن/رمادي (عشان الأفاتار يبان)
      const img = octx.getImageData(0, 0, W, H);
      const data = img.data;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > innerRadius) continue;

          const idx = (y * W + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a === 0) continue;

          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          // أي شي غامق/رمادي داخل الدائرة نخليه شفاف
          if (lum < 95) {
            data[idx + 3] = 0;
          }
        }
      }
      octx.putImageData(img, 0, 0);

      // الأفاتار
      const avatar = await loadImage(
        member.user.displayAvatarURL({ extension: "png", size: 512 })
      );

      // ارسم الأفاتار داخل الدائرة
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // نكبر شوي عشان يغطي كامل الدائرة
      const drawRadius = 205;
      const offsetX = 0;
      const offsetY = 0;

      ctx.drawImage(
        avatar,
        centerX - drawRadius + offsetX,
        centerY - drawRadius + offsetY,
        drawRadius * 2,
        drawRadius * 2
      );

      ctx.restore();

      // overlay فوق الأفاتار (الإطار + النار)
      ctx.drawImage(overlayCanvas, 0, 0);

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
