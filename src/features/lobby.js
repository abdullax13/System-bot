// src/features/lobby.js
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

async function ensureLobbyPanel(client, store) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const channel = await guild.channels.fetch(process.env.LOBBY_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle(guild.name || "Rising Ashes")
    .setDescription("اختار لعبتك عشان تسوي Lobby أو تلقى لاعبين.")
    .setColor(0xff5500);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("game_select")
    .setPlaceholder("اختر لعبة")
    .addOptions(
      { label: "MOBILE LEGENDS", value: "ML" },
      { label: "CALL OF DUTY MOBILE", value: "CODM" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const key = `lobbyPanel:${guild.id}`;
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

function setupLobby(client, store) {
  client.on("interactionCreate", async (i) => {
    try {
      // 1) اختيار اللعبة
      if (i.isStringSelectMenu() && i.customId === "game_select") {
        await i.deferReply({ ephemeral: true });

        const game = i.values[0];

        const embed = new EmbedBuilder()
          .setTitle(`Lobby • ${game}`)
          .setDescription("اختر:")
          .setColor(0xff5500);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`lobby_create:${game}`)
            .setLabel("Create Lobby")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`lobby_find:${game}`)
            .setLabel("Find Players")
            .setStyle(ButtonStyle.Primary)
        );

        return i.editReply({ embeds: [embed], components: [row] });
      }

      // 2) فتح مودال Create Lobby
      if (i.isButton() && i.customId.startsWith("lobby_create:")) {
        const game = i.customId.split(":")[1];

        const modal = new ModalBuilder()
          .setCustomId(`lobby_modal:${game}`)
          .setTitle(`Create Lobby • ${game}`);

        const idInput = new TextInputBuilder()
          .setCustomId("player_id")
          .setLabel("اكتب ID مالك داخل اللعبة")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(idInput));
        return i.showModal(modal);
      }

      // 3) إنشاء روم اللوبي + إرسال أزرار التحكم
      if (i.isModalSubmit() && i.customId.startsWith("lobby_modal:")) {
        await i.deferReply({ ephemeral: true });

        const game = i.customId.split(":")[1];
        const playerId = i.fields.getTextInputValue("player_id");

        const guild = i.guild;
        const categoryId = process.env.LOBBY_CATEGORY_ID;

        const ch = await guild.channels.create({
          name: `${game.toLowerCase()}-${i.user.username}`.replace(/\s+/g, "-").slice(0, 90),
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

        store.set(`lobby:${ch.id}`, {
          game,
          ownerId: i.user.id,
          playerId,
          members: [i.user.id],
          locked: false,
          createdAt: Date.now(),
        });

        const controls = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("lobby_lock").setLabel("Lock").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("lobby_unlock").setLabel("Unlock").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("lobby_close").setLabel("Close").setStyle(ButtonStyle.Danger),
        );

        await ch.send({
          content: `Lobby created by <@${i.user.id}>\nGame ID: **${playerId}**\n(Max 5 players)`,
          components: [controls],
        });

        return i.editReply({ content: `تم إنشاء اللوبي: ${ch}` });
      }

      // 4) Find Players: Embed “بوكس” منظم
      if (i.isButton() && i.customId.startsWith("lobby_find:")) {
        await i.deferReply({ ephemeral: true });

        const game = i.customId.split(":")[1];

        const all = store.all();
        const lobbies = all
          .filter(x => x.key.startsWith("lobby:") && x.value?.game === game)
          .map(x => ({ channelId: x.key.split(":")[1], ...x.value }));

        const embed = new EmbedBuilder()
          .setTitle(`Find Players • ${game}`)
          .setColor(0xff5500);

        if (!lobbies.length) {
          embed.setDescription("ماكو لوبيات حالياً.");
          return i.editReply({ embeds: [embed] });
        }

        // ترتيب وعرض
        for (const l of lobbies) {
          const count = `${(l.members?.length ?? 0)}/5`;
          const full = (l.members?.length ?? 0) >= 5;
          const locked = !!l.locked;

          const status = (locked || full) ? "🔴" : "🟢";
          const stateText = full ? "ممتلئ" : locked ? "مقفل" : "مفتوح";

          embed.addFields({
            name: `${status} <#${l.channelId}>`,
            value: `الحالة: **${stateText}**\nالعدد: **${count}**`,
            inline: false
          });
        }

        return i.editReply({ embeds: [embed] });
      }

      // 5) أزرار التحكم داخل روم اللوبي
      if (i.isButton() && ["lobby_lock", "lobby_unlock", "lobby_close"].includes(i.customId)) {
        const data = store.get(`lobby:${i.channel.id}`);
        if (!data) return i.reply({ content: "هذا الروم مو لوبي.", ephemeral: true });
        if (data.ownerId !== i.user.id) return i.reply({ content: "بس صاحب اللوبي يقدر يتحكم.", ephemeral: true });

        if (i.customId === "lobby_lock") {
          data.locked = true;
          store.set(`lobby:${i.channel.id}`, data);
          return i.reply({ content: "تم قفل اللوبي 🔴", ephemeral: true });
        }

        if (i.customId === "lobby_unlock") {
          data.locked = false;
          store.set(`lobby:${i.channel.id}`, data);
          return i.reply({ content: "تم فتح اللوبي 🟢", ephemeral: true });
        }

        if (i.customId === "lobby_close") {
          store.del(`lobby:${i.channel.id}`);
          await i.reply({ content: "تم إغلاق اللوبي.", ephemeral: true }).catch(() => {});
          return i.channel.delete().catch(() => {});
        }
      }

    } catch (e) {
      console.error("Lobby error:", e);
      if (i.isRepliable()) {
        // نحاول نرد بأي شكل عشان ما يظهر Interaction failed
        if (i.deferred) return i.editReply({ content: "صار خطأ." }).catch(() => {});
        return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = { setupLobby, ensureLobbyPanel };
