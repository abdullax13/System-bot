// src/features/welcome.js
const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

function cfg(store, guildId, key) {
  return store.get(`cfg:${guildId}:${key}`);
}

function setupWelcome(client, store) {
  client.on("guildMemberAdd", async (member) => {
    try {
      // الروم من /setup
      const channelId = cfg(store, member.guild.id, "welcomeChannelId");
      if (!channelId) return;

      const ch = await member.guild.channels.fetch(channelId).catch(() => null);
      if (!ch) return;

      const bgUrl = process.env.WELCOME_BG_URL;
      if (!bgUrl) {
        await ch.send(`• Welcome : ${member}\n• invited by : Unknown`);
        return;
      }

      const W = 1024,
        H = 1024;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      const template = await loadImage(bgUrl);

      // overlay لتنظيف checker داخل الدائرة
      const overlayCanvas = createCanvas(W, H);
      const octx = overlayCanvas.getContext("2d");
      octx.drawImage(template, 0, 0, W, H);

      // موقع الدائرة (قالبك)
      const centerX = 512;
      const centerY = 600;
      const outerRadius = 220; // حد القص (clip)
      const cleanRadius = 190; // ننظف داخلها فقط ونحافظ على الإطار

      // شيل checker (الرمادي) داخل الدائرة عشان الأفاتار يبان
      const img = octx.getImageData(0, 0, W, H);
      const data = img.data;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > cleanRadius) continue;

          const idx = (y * W + x) * 4;
          const r = data[idx],
            g = data[idx + 1],
            b = data[idx + 2],
            a = data[idx + 3];
          if (a === 0) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const satLike = max - min;

          // رمادي/قريب من الرمادي => غالباً checker
          if (
            satLike < 18 &&
            r > 60 &&
            r < 220 &&
            g > 60 &&
            g < 220 &&
            b > 60 &&
            b < 220
          ) {
            data[idx + 3] = 0; // شفّاف
          }
        }
      }
      octx.putImageData(img, 0, 0);

      // صورة العضو
      const avatar = await loadImage(
        member.user.displayAvatarURL({ extension: "png", size: 512 })
      );

      // قص دائرة + رسم الأفاتار داخلها
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // ✅ تعديلات لتغطية الدائرة بالكامل (حل الفراغ)
      const drawRadius = 255;
      const offsetY = -18;

      ctx.drawImage(
        avatar,
        centerX - drawRadius,
        centerY - drawRadius + offsetY,
        drawRadius * 2,
        drawRadius * 2
      );

      ctx.restore();

      // overlay فوق الأفاتار عشان الإطار/النار يطلعون فوق
      ctx.drawImage(overlayCanvas, 0, 0);

      // إرسال الصورة
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
