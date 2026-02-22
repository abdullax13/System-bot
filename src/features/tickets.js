// src/features/tickets.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

function cfg(store, guildId, key) {
  return store.get(`cfg:${guildId}:${key}`);
}

function isStaff(i) {
  const supportRoleId = process.env.SUPPORT_ROLE_ID;
  if (supportRoleId && i.member?.roles?.cache?.has(supportRoleId)) return true;
  return i.memberPermissions?.has(PermissionFlagsBits.ManageChannels);
}

// ✅ هذه الدالة اللي /setup يحتاجها
async function sendTicketsPanel(client, store, guildId) {
  const ticketsChannelId = cfg(store, guildId, "ticketsChannelId");
  if (!ticketsChannelId) throw new Error("Tickets channel not configured. Run /setup type:ticket");

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(ticketsChannelId);

  const embed = new EmbedBuilder()
    .setTitle("Tickets")
    .setDescription("اختر نوع التذكرة (اقتراح/شكوى) ثم اكتب التفاصيل.")
    .setColor(0xff5500);

  const banner = process.env.TICKETS_BANNER_URL;
  if (banner) embed.setImage(banner);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_type_select")
    .setPlaceholder("اختر نوع التذكرة")
    .addOptions(
      { label: "اقتراح", value: "suggestion" },
      { label: "شكوى", value: "complaint" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const key = `panel:${guildId}:ticketsMessageId`;
  const existingId = store.get(key);

  if (existingId) {
    const msg = await channel.messages.fetch(existingId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed], components: [row] });
      return msg;
    }
  }

  const msg = await channel.send({ embeds: [embed], components: [row] });
  store.set(key, msg.id);
  return msg;
}

function setupTickets(client, store) {
  client.on("interactionCreate", async (i) => {
    try {
      // اختيار نوع التذكرة -> Modal
      if (i.isStringSelectMenu() && i.customId === "ticket_type_select") {
        const kind = i.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal:${kind}`)
          .setTitle(kind === "suggestion" ? "اقتراح" : "شكوى");

        const input = new TextInputBuilder()
          .setCustomId("problem")
          .setLabel("اكتب التفاصيل كاملة")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return i.showModal(modal);
      }

      // submit modal -> إنشاء روم
      if (i.isModalSubmit() && i.customId.startsWith("ticket_modal:")) {
        await i.deferReply({ ephemeral: true });

        const guildId = i.guildId;
        const categoryId = cfg(store, guildId, "ticketsCategoryId");
        if (!categoryId) return i.editReply("لازم تسوي /setup type:ticket وتختار category.");

        const kind = i.customId.split(":")[1];
        const text = i.fields.getTextInputValue("problem");

        const guild = i.guild;
        const supportRoleId = process.env.SUPPORT_ROLE_ID;

        const overwrites = [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: i.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
        ];

        if (supportRoleId) {
          overwrites.push({
            id: supportRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
          });
        }

        const ch = await guild.channels.create({
          name: `ticket-${i.user.username}`.slice(0, 90),
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: overwrites,
        });

        store.set(`ticket:${ch.id}`, {
          ownerId: i.user.id,
          kind,
          status: "open",
          claimedBy: null,
          createdAt: Date.now(),
        });

        const embed = new EmbedBuilder()
          .setTitle(`Ticket • ${kind === "suggestion" ? "اقتراح" : "شكوى"}`)
          .setDescription(text)
          .addFields(
            { name: "Owner", value: `${i.user}`, inline: true },
            { name: "Status", value: "مفتوحة", inline: true }
          )
          .setColor(0xff5500);

        const controls = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_claim").setLabel("استلام").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ticket_close").setLabel("إغلاق").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("ticket_delete").setLabel("حذف").setStyle(ButtonStyle.Danger),
        );

        await ch.send({ embeds: [embed], components: [controls] });
        return i.editReply({ content: `تم فتح التذكرة: ${ch}` });
      }

      // أزرار التيكت
      if (i.isButton() && ["ticket_claim", "ticket_close", "ticket_delete"].includes(i.customId)) {
        const data = store.get(`ticket:${i.channelId}`);
        if (!data) return i.reply({ content: "هذا مو روم تذكرة.", ephemeral: true });

        if (!isStaff(i)) return i.reply({ content: "ما عندك صلاحية دعم.", ephemeral: true });

        if (i.customId === "ticket_claim") {
          data.claimedBy = i.user.id;
          store.set(`ticket:${i.channelId}`, data);
          return i.reply({ content: `✅ ${i.user} استلم التذكرة.` });
        }

        if (i.customId === "ticket_close") {
          data.status = "closed";
          store.set(`ticket:${i.channelId}`, data);
          await i.channel.permissionOverwrites.edit(data.ownerId, { SendMessages: false }).catch(() => {});
          return i.reply({ content: "🔒 تم إغلاق التذكرة." });
        }

        if (i.customId === "ticket_delete") {
          store.del(`ticket:${i.channelId}`);
          await i.reply({ content: "🗑️ سيتم حذف الروم." }).catch(() => {});
          return i.channel.delete().catch(() => {});
        }
      }

    } catch (e) {
      console.error("Tickets error:", e);
      if (i.isRepliable()) {
        if (i.deferred) return i.editReply("صار خطأ.").catch(() => {});
        return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = { setupTickets, sendTicketsPanel };
