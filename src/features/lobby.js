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

function setupLobby(client, store) {
  client.on("interactionCreate", async (i) => {
    if (i.isStringSelectMenu() && i.customId === "game_select") {
      const game = i.values[0];

      const embed = new EmbedBuilder()
        .setTitle(`Lobby • ${game}`)
        .setDescription("اختر:")
        .setColor(0xff5500);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`lobby_create:${game}`).setLabel("Create Lobby").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`lobby_find:${game}`).setLabel("Find Players").setStyle(ButtonStyle.Primary)
      );

      return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

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

    if (i.isModalSubmit() && i.customId.startsWith("lobby_modal:")) {
      const game = i.customId.split(":")[1];
      const playerId = i.fields.getTextInputValue("player_id");

      const guild = i.guild;
      const categoryId = process.env.LOBBY_CATEGORY_ID;

      // إنشاء روم
      const ch = await guild.channels.create({
        name: `${game.toLowerCase().replace(/\s+/g, "-")}-${i.user.username}`.slice(0, 90),
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      // تخزين
      const lobbyId = `lobby:${ch.id}`;
      store.set(lobbyId, {
        game,
        ownerId: i.user.id,
        playerId,
        members: [i.user.id],
        locked: false,
        createdAt: Date.now(),
      });

      await ch.send(
        `Lobby created by <@${i.user.id}>\nGame ID: **${playerId}**\n(Max 5 players)`
      );

      return i.reply({ content: `تم إنشاء اللوبي: ${ch}`, ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("lobby_find:")) {
      const game = i.customId.split(":")[1];

      // جمع اللوبّيات من store (حسب طريقتك بالتخزين)
      const all = store.all(); // بنسويها بالـ store.js
      const lobbies = all
        .filter(x => x.key.startsWith("lobby:") && x.value.game === game)
        .map(x => ({ channelId: x.key.split(":")[1], ...x.value }));

      if (!lobbies.length) {
        return i.reply({ content: "ماكو لوبيات حالياً.", ephemeral: true });
      }

      const lines = lobbies.map(l => {
        const count = `${l.members.length}/5`;
        const status = l.locked ? "🔒" : (l.members.length >= 5 ? "⛔" : "✅");
        return `${status} <#${l.channelId}> — **${count}**`;
      });

      return i.reply({ content: lines.join("\n"), ephemeral: true });
    }
  });
}

module.exports = { setupLobby };
