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
    .setTitle(guild.name)
    .setDescription("اختر لعبتك عشان تسوي Lobby أو تلقى لاعبين.")
    .setColor(0xff5500);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("game_select")
    .setPlaceholder("اختر لعبة")
    .addOptions(
      { label: "MOBILE LEGENDS", value: "ML" },
      { label: "CALL OF DUTY MOBILE", value: "CODM" }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const msg = await channel.send({ embeds: [embed], components: [row] });
  store.set("lobbyPanel", msg.id);
}

function setupLobby(client, store) {

  client.on("interactionCreate", async (i) => {

    if (i.isButton()) {

      if (i.customId === "lobby_lock") {
        const data = store.get(`lobby:${i.channel.id}`);
        if (!data || data.ownerId !== i.user.id)
          return i.reply({ content: "مو صاحب اللوبي.", ephemeral: true });

        data.locked = true;
        store.set(`lobby:${i.channel.id}`, data);

        return i.reply({ content: "تم قفل اللوبي 🔒", ephemeral: true });
      }

      if (i.customId === "lobby_unlock") {
        const data = store.get(`lobby:${i.channel.id}`);
        if (!data || data.ownerId !== i.user.id)
          return i.reply({ content: "مو صاحب اللوبي.", ephemeral: true });

        data.locked = false;
        store.set(`lobby:${i.channel.id}`, data);

        return i.reply({ content: "تم فتح اللوبي 🔓", ephemeral: true });
      }

      if (i.customId === "lobby_close") {
        const data = store.get(`lobby:${i.channel.id}`);
        if (!data || data.ownerId !== i.user.id)
          return i.reply({ content: "مو صاحب اللوبي.", ephemeral: true });

        store.del(`lobby:${i.channel.id}`);
        await i.channel.delete();
      }
    }

    if (i.isModalSubmit() && i.customId.startsWith("createLobby")) {

      const game = i.customId.split(":")[1];
      const playerId = i.fields.getTextInputValue("player_id");

      const ch = await i.guild.channels.create({
        name: `${game}-${i.user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.LOBBY_CATEGORY_ID,
        permissionOverwrites: [
          { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
      });

      store.set(`lobby:${ch.id}`, {
        ownerId: i.user.id,
        members: [i.user.id],
        locked: false,
      });

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("lobby_lock").setLabel("Lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("lobby_unlock").setLabel("Unlock").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("lobby_close").setLabel("Close").setStyle(ButtonStyle.Danger),
      );

      await ch.send({
        content: `Lobby by ${i.user}\nGame ID: ${playerId}`,
        components: [controls],
      });

      return i.reply({ content: `تم إنشاء ${ch}`, ephemeral: true });
    }

    if (i.customId === "lobby_find") {

      const all = store.all().filter(x => x.key.startsWith("lobby:"));

      if (!all.length)
        return i.reply({ content: "ماكو لوبيات.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("Available Lobbies")
        .setColor(0xff5500);

      all.forEach(l => {
        const count = l.value.members.length;
        const status = l.value.locked || count >= 5 ? "🔴" : "🟢";
        embed.addFields({
          name: `<#${l.key.split(":")[1]}>`,
          value: `${status} ${count}/5`,
        });
      });

      return i.reply({ embeds: [embed], ephemeral: true });
    }

  });

}

module.exports = { setupLobby, ensureLobbyPanel };
