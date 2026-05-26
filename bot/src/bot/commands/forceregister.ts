import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, GuildMember, TextChannel } from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("forceregister")
  .setDescription("Force register a player and overwrite existing data (Admin only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Discord user to register").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("buildnowggname").setDescription("Buildnow.gg name").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("region").setDescription("Region").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("country").setDescription("Country").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("buildnowggingameid").setDescription("Buildnow.gg in-game ID or attachment URL").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt.setName("pr").setDescription("Initial PR").setRequired(false),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const ANNOUNCE_CHANNEL_ID = "1508785338800279562";

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.get("user")?.user;
  const buildnowggName = interaction.options.get("buildnowggname")?.value as string;
  const region = interaction.options.get("region")?.value as string;
  const country = interaction.options.get("country")?.value as string;
  const buildnowggingameid = interaction.options.get("buildnowggingameid")?.value as string;
  const pr = (interaction.options.get("pr")?.value as number | undefined) ?? 0;

  if (!targetUser || !interaction.guild) {
    await interaction.editReply({ content: "Invalid user or guild." });
    return;
  }

  await pool.query(
    `INSERT INTO registered_players (discord_id, discord_username, buildnowgg_name, region, country, buildnowgg_ingame_id, power_ranking)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (discord_id) DO UPDATE SET
       discord_username = EXCLUDED.discord_username,
       buildnowgg_name = EXCLUDED.buildnowgg_name,
       region = EXCLUDED.region,
       country = EXCLUDED.country,
       buildnowgg_ingame_id = EXCLUDED.buildnowgg_ingame_id,
       power_ranking = EXCLUDED.power_ranking`,
    [targetUser.id, targetUser.username, buildnowggName, region, country, buildnowggingameid, pr],
  );

  const member = interaction.guild.members.cache.get(targetUser.id) as GuildMember | undefined;
  if (member && interaction.guild.members.me?.permissions.has("ManageNicknames")) {
    try {
      await member.setNickname(`${buildnowggName} [${pr}]`.slice(0, 32));
    } catch {}
  }

  const announceChannel = interaction.guild.channels.cache.get(ANNOUNCE_CHANNEL_ID) as TextChannel | undefined;
  if (announceChannel) {
    await announceChannel.send(
      `**${buildnowggName}** has registered on **${targetUser.username}** | Region: **${region}** | Country: **${country}** | In-Game ID: **${buildnowggingameid}**`,
    );
  }

  await interaction.editReply({
    content: `✅ Force registered **${buildnowggName}** for <@${targetUser.id}> with PR **${pr}**.`,
  });
}
