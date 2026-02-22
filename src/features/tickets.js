// src/features/tickets.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

function setupTickets(client, store) {

  client.on("interactionCreate", async (i) => {

    if (i.isButton() && i.customId === "ticket_create") {

      const modal = new ModalBuilder()
        .setCustomId("ticket_modal")
        .setTitle("اكتب مشكلتك");

      const input = new TextInputBuilder()
        .setCustomId("problem")
        .setLabel("اكتب مشكلتك كاملة")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "ticket_modal") {

      const text = i.fields.getTextInputValue("problem");

      const ch = await i.guild.channels.create({
        name: `ticket-${i.user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.TICKETS_CATEGORY_ID,
        permissionOverwrites: [
          { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle("New Ticket")
        .setDescription(text)
        .addFields({ name: "Owner", value: `${i.user}` })
        .setColor(0xff5500);

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Close").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("ticket_delete").setLabel("Delete").setStyle(ButtonStyle.Danger),
      );

      await ch.send({ embeds: [embed], components: [controls] });

      return i.reply({ content: `تم فتح التذكرة ${ch}`, ephemeral: true });
    }

    if (i.isButton() && i.customId === "ticket_claim") {
      return i.reply({ content: `${i.user} استلم التذكرة`, ephemeral: false });
    }

    if (i.isButton() && i.customId === "ticket_close") {
      return i.channel.send("تم إغلاق التذكرة.");
    }

    if (i.isButton() && i.customId === "ticket_delete") {
      await i.channel.delete();
    }

  });

}

module.exports = { setupTickets };
