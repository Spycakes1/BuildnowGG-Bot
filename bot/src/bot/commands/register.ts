import {
  SlashCommandBuilder,
  CommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalSubmitInteraction,
  GuildMember,
  TextChannel,
  Message,
} from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register yourself as a Buildnow.gg player");

const ANNOUNCE_CHANNEL_ID = "1508785338800279562";

export interface PendingRegistration {
  buildnowggName: string;
  region: string;
  country: string;
  discordUsername: string;
  channelId: string;
  guildId: string;
}

export const pendingRegistrations = new Map<string, PendingRegistration>();

export async function execute(interaction: CommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId("register_modal")
    .setTitle("Buildnow.gg Player Registration");

  const buildnowggName = new TextInputBuilder()
    .setCustomId("buildnowgg_name")
    .setLabel("Buildnow.gg Username")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("Your Buildnow.gg username");

  const region = new TextInputBuilder()
    .setCustomId("region")
    .setLabel("Region")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("e.g. NA, EU, ASIA");

  const country = new TextInputBuilder()
    .setCustomId("country")
    .setLabel("Country")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder("e.g. United States");

  modal.addComponents(
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(buildnowggName),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(region),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(country),
  );

  await interaction.showModal(modal);
}

export async function handleRegisterModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const buildnowggName = interaction.fields.getTextInputValue("buildnowgg_name");
  const region = interaction.fields.getTextInputValue("region");
  const country = interaction.fields.getTextInputValue("country");

  const discordId = interaction.user.id;
  const discordUsername = interaction.user.username;

  const existing = await pool.query(
    "SELECT discord_id FROM registered_players WHERE discord_id = $1",
    [discordId],
  );
  if (existing.rows.length > 0) {
    await interaction.editReply({
      content: "You are already registered! Ask an admin to update your PR.",
    });
    return;
  }

  pendingRegistrations.set(discordId, {
    buildnowggName,
    region,
    country,
    discordUsername,
    channelId: interaction.channelId,
    guildId: interaction.guildId!,
  });

  await interaction.editReply({
    content:
      `✅ Got your info! Now please **upload your Buildnow.gg in-game ID as an image attachment** in this channel to complete registration.\n\n> Take a screenshot of your in-game profile showing your ID and send it here.`,
  });
}

export async function handleAttachment(message: Message) {
  const discordId = message.author.id;
  const pending = pendingRegistrations.get(discordId);
  if (!pending) return;

  if (message.channelId !== pending.channelId) return;

  const attachment = message.attachments.first();
  if (!attachment) return;

  pendingRegistrations.delete(discordId);

  const { buildnowggName, region, country, discordUsername, guildId } = pending;
  const attachmentUrl = attachment.url;

  await pool.query(
    `INSERT INTO registered_players (discord_id, discord_username, buildnowgg_name, region, country, buildnowgg_ingame_id, power_ranking)
     VALUES ($1, $2, $3, $4, $5, $6, 0)
     ON CONFLICT (discord_id) DO NOTHING`,
    [discordId, discordUsername, buildnowggName, region, country, attachmentUrl],
  );

  const guild = message.client.guilds.cache.get(guildId);
  const member = guild?.members.cache.get(discordId) as GuildMember | undefined;
  if (member && guild?.members.me?.permissions.has("ManageNicknames")) {
    try {
      const newNick = `${buildnowggName} [0]`;
      await member.setNickname(newNick.slice(0, 32));
    } catch {
      // No permission
    }
  }

  const announceChannel = guild?.channels.cache.get(ANNOUNCE_CHANNEL_ID) as TextChannel | undefined;
  if (announceChannel) {
    await announceChannel.send({
      content: `**${buildnowggName}** has registered on **${discordUsername}** | Region: **${region}** | Country: **${country}** | In-Game ID:`,
      files: [{ attachment: attachmentUrl, name: "ingame-id.png" }],
    });
  }

  await message.reply(
    `🎉 Registration complete! Welcome, **${buildnowggName}**! Your nickname has been updated to \`${buildnowggName} [0]\`.`,
  );
}
