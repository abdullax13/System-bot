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

function cfg(store, guildId, key) {
  return store.get(`cfg:${guildId}:${key}`);
}

// ===== Panel إرسال/تحديث (يناديه /setup) =====
async function sendLobbyPanel(client, store, guildId) {
  const lobbyChannelId = cfg(store, guildId, "lobbyChannelId");
  if (!lobbyChannelId) throw new Error("Lobby channel not configured. Run /setup type:lobby");

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(lobbyChannelId);

  const embed = new EmbedBuilder()
    .setTitle(guild.name || "Rising Ashes")
    .setDescription("اختار لعبتك عشان تسوي Lobby أو تلقى لاعبين.")
    .setColor(0xff5500);

  const banner = process.env.LOBBY_BANNER_URL;
  if (banner) embed.setImage(banner);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("lobby_game_select")
    .setPlaceholder("اختر لعبة")
    .addOptions(
      { label: "MOBILE LEGENDS", value: "ML" },
      { label: "CALL OF DUTY MOBILE", value: "CODM" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const key = `panel:${guildId}:lobbyMessageId`;
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

// ===== Helpers =====
function lobbyKey(channelId) { return `lobby:${channelId}`; }

function lobbyStatusEmoji(lobby) {
  const count = lobby.members?.length ?? 0;
  const full = count >= 5;
  const locked = !!lobby.locked;
  return (locked || full) ? "🔴" : "🟢";
}

function lobbyStatusText(lobby) {
  const count = lobby.members?.length ?? 0;
  if (count >= 5) return "ممتلئ";
  if (lobby.locked) return "مقفل";
  return "مفتوح";
}

// ===== Main Listener =====
function setupLobby(client, store) {
  client.on("interactionCreate", async (i) => {
    try {
      // 1) اختيار لعبة من Panel
      if (i.isStringSelectMenu() && (i.customId === "lobby_game_select" || i.customId === "game_select")) {
  await i.deferReply({ ephemeral: true });

  const picked = i.values[0]; // pick:CHANNELID
  const channelId = picked.split(":")[1];

  const data = store.get(`lobby:${channelId}`);
  if (!data) return i.editReply("اللوبي غير موجود.");

  const countNow = data.members?.length ?? 0;
  const full = countNow >= 5;
  const locked = !!data.locked;

  if (locked || full) {
    const reason = full ? "اللوبي ممتلئ 5/5" : "اللوبي مقفل";
    return i.editReply(`🔴 ما تقدر تدخل: ${reason}`);
  }

  // إذا أصلاً عضو داخل
  if (data.members?.includes(i.user.id)) {
    return i.editReply(`أنت داخل بالفعل. <#${channelId}>`);
  }

  // أدخله: نضيف صلاحيات + نحدث store
  const ch = await i.guild.channels.fetch(channelId).catch(() => null);
  if (!ch) return i.editReply("الروم مو موجود.");

  await ch.permissionOverwrites.edit(i.user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  }).catch(() => null);

  data.members = Array.from(new Set([...(data.members || []), i.user.id]));
  store.set(`lobby:${channelId}`, data);

  return i.editReply(`🟢 تم إدخالك اللوبي: ${ch}`);
}

      // 2) زر Create Lobby => Modal
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

      // 3) submit modal => إنشاء روم لوبي
      if (i.isModalSubmit() && i.customId.startsWith("lobby_modal:")) {
        await i.deferReply({ ephemeral: true });

        const guildId = i.guildId;
        const lobbyCategoryId = cfg(store, guildId, "lobbyCategoryId");
        if (!lobbyCategoryId) return i.editReply("Lobby category غير محدد. استخدم /setup type:lobby مع category.");

        const game = i.customId.split(":")[1];
        const playerId = i.fields.getTextInputValue("player_id");

        const guild = i.guild;

        const ch = await guild.channels.create({
          name: `${game.toLowerCase()}-${i.user.username}`.replace(/\s+/g, "-").slice(0, 90),
          type: ChannelType.GuildText,
          parent: lobbyCategoryId,
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

        store.set(lobbyKey(ch.id), {
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
          new ButtonBuilder().setCustomId("lobby_close").setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        await ch.send({
          content: `Lobby created by <@${i.user.id}>\nGame ID: **${playerId}**\n(Max 5 players)`,
          components: [controls],
        });

        return i.editReply({ content: `تم إنشاء اللوبي: ${ch}` });
      }

      // 4) زر Find Players => نعرض “صفحة” Select Menu (مثل ticket sheet)
      if (i.isButton() && i.customId.startsWith("lobby_find:")) {
        await i.deferReply({ ephemeral: true });

        const game = i.customId.split(":")[1];

        const all = store.all();
        const lobbies = all
          .filter(x => x.key.startsWith("lobby:") && x.value?.game === game)
          .map(x => ({ channelId: x.key.split(":")[1], ...x.value }));

        if (!lobbies.length) {
          return i.editReply({ content: `ماكو لوبيات حالياً لـ ${game}.` });
        }

        // خيارات (حد 25)
        const options = lobbies.slice(0, 25).map(l => {
          const count = `${(l.members?.length ?? 0)}/5`;
          const emoji = lobbyStatusEmoji(l);
          const state = lobbyStatusText(l);

          return {
            label: `#${l.channelId}`,
            value: `pick:${l.channelId}`,
            description: `${state} • ${count}`,
            emoji: { name: emoji }
          };
        });

        const menu = new StringSelectMenuBuilder()
          .setCustomId("lobby_list_select")
          .setPlaceholder("اختر لوبي")
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        return i.editReply({
          content: `لوبيات ${game}:`,
          components: [row],
        });
      }

      // 5) اختيار لوبي من القائمة
      if (i.isStringSelectMenu() && i.customId === "lobby_list_select") {
        const picked = i.values[0]; // pick:CHANNELID
        const channelId = picked.split(":")[1];

        const data = store.get(lobbyKey(channelId));
        if (!data) return i.reply({ content: "اللوبي غير موجود.", ephemeral: true });

        const count = `${(data.members?.length ?? 0)}/5`;
        const emoji = lobbyStatusEmoji(data);
        const state = lobbyStatusText(data);

        return i.reply({
          content: `${emoji} <#${channelId}>\nالحالة: ${state}\nالعدد: ${count}`,
          ephemeral: true
        });
      }

      // 6) أزرار التحكم داخل روم اللوبي
      if (i.isButton() && ["lobby_lock", "lobby_unlock", "lobby_close"].includes(i.customId)) {
        const data = store.get(lobbyKey(i.channelId));
        if (!data) return i.reply({ content: "هذا مو روم لوبي.", ephemeral: true });

        if (data.ownerId !== i.user.id) {
          return i.reply({ content: "بس صاحب اللوبي يقدر يتحكم.", ephemeral: true });
        }

        if (i.customId === "lobby_lock") {
          data.locked = true;
          store.set(lobbyKey(i.channelId), data);
          return i.reply({ content: "تم قفل اللوبي 🔴", ephemeral: true });
        }

        if (i.customId === "lobby_unlock") {
          data.locked = false;
          store.set(lobbyKey(i.channelId), data);
          return i.reply({ content: "تم فتح اللوبي 🟢", ephemeral: true });
        }

        if (i.customId === "lobby_close") {
          store.del(lobbyKey(i.channelId));
          await i.reply({ content: "تم إغلاق اللوبي.", ephemeral: true }).catch(() => {});
          return i.channel.delete().catch(() => {});
        }
      }

    } catch (e) {
      console.error("Lobby error:", e);
      if (i.isRepliable()) {
        if (i.deferred) return i.editReply({ content: "صار خطأ." }).catch(() => {});
        return i.reply({ content: "صار خطأ.", ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = { setupLobby, sendLobbyPanel };
