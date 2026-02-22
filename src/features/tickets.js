// src/features/tickets.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

async function ensureTicketsPanel(client, store) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(process.env.TICKETS_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("Tickets")
    .setDescription("اختر نوع التذكرة: اقتراح أو شكوى")
    .setColor(0xff5500);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("اختر نوع التذكرة")
    .addOptions(
      { label: "اقتراح", value: "suggestion" },
      { label: "شكوى", value: "complaint" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const key = `ticketsPanelMessageId:${guild.id}`;
  const existingId = store.get(key);

  if (existingId) {
    const msg = await channel.messages.fetch(existingId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed], components: [row] });
      return;
    }
  }

  const msg = await channel.send({ embeds: [embed], components: [row] });
  store.set(key, msg.id);
}

function setupTickets(client, store) {
  client.on("interactionCreate", async (i) => {
    try {
      if (!i.isStringSelectMenu()) return;
      if (i.customId !== "ticket_select") return;

      const kind = i.values[0]; // suggestion | complaint
      const guild = i.guild;
      const categoryId = process.env.TICKETS_CATEGORY_ID;

      const existing = store.all().find(x =>
        x.key.startsWith("ticket:") && x.value?.ownerId === i.user.id && x.value?.status === "open"
      );
      if (existing) {
        return i.reply({ content: "عندك تذكرة مفتوحة بالفعل.", ephemeral: true });
      }

      const ch = await guild.channels.create({
        name: `ticket-${i.user.username}`.slice(0, 90),
        type: ChannelType.GuildText,
        parent: categoryId || null,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: i.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      store.set(`ticket:${ch.id}`, {
        ownerId: i.user.id,
        kind,
        status: "open",
        createdAt: Date.now(),
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket • ${kind === "suggestion" ? "اقتراح" : "شكوى"}`)
        .setDescription(`صاحب التذكرة: <@${i.user.id}>\nاكتب التفاصيل هنا.`)
        .setColor(0xff5500);

      await ch.send({ embeds: [embed] });
      await i.reply({ content: `تم فتح تذكرة: ${ch}`, ephemeral: true });
    } catch (e) {
      console.error("Tickets error:", e);
      if (i.isRepliable()) {
        await i.reply({ content: "صار خطأ بالتذاكر.", ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = { setupTickets, ensureTicketsPanel };
