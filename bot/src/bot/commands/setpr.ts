import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("setpr")
  .setDescription("Set a player's PR to a specific value (Admin only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to set PR for").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt.setName("pr").setDescription("The PR value to set").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.get("user")?.user;
  const pr = interaction.options.get("pr")?.value as number;

  if (!targetUser) {
    await interaction.editReply({ content: "Please specify a valid user." });
    return;
  }

  const result = await pool.query(
    `UPDATE registered_players
     SET power_ranking = $1
     WHERE discord_id = $2
     RETURNING buildnowgg_name, power_ranking`,
    [pr, targetUser.id],
  );

  if (result.rows.length === 0) {
    await interaction.editReply({
      content: `<@${targetUser.id}> is not registered. They need to use \`/register\` first.`,
    });
    return;
  }

  const { buildnowgg_name, power_ranking } = result.rows[0];

  const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;
  if (member && interaction.guild?.members.me?.permissions.has("ManageNicknames")) {
    try {
      const newNick = `${buildnowgg_name} [${power_ranking}]`;
      await member.setNickname(newNick.slice(0, 32));
    } catch {
      // No permission to change that user's nickname
    }
  }

  await interaction.editReply({
    content: `Set PR for **${buildnowgg_name}** to **${power_ranking}**.`,
  });

  if (interaction.channel && "send" in interaction.channel) {
    await interaction.channel.send(
      `📊 **${buildnowgg_name}** (<@${targetUser.id}>) PR has been set to **${power_ranking}**`,
    );
  }
}
