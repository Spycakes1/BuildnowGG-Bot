import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("addpr")
  .setDescription("Add PR points to a registered player (Admin only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to add PR to").setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt.setName("amount").setDescription("Amount of PR to add").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.get("user")?.user;
  const amount = interaction.options.get("amount")?.value as number;

  if (!targetUser) {
    await interaction.editReply({ content: "Please specify a valid user." });
    return;
  }

  const result = await pool.query(
    `UPDATE registered_players
     SET power_ranking = power_ranking + $1
     WHERE discord_id = $2
     RETURNING buildnowgg_name, power_ranking`,
    [amount, targetUser.id],
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
    content: `Added **${amount}** PR to **${buildnowgg_name}**. Their new PR is **${power_ranking}**.`,
  });

  if (interaction.channel && "send" in interaction.channel) {
    await interaction.channel.send(
      `🏆 **${buildnowgg_name}** (<@${targetUser.id}>) gained **${amount}** PR! New PR: **${power_ranking}**`,
    );
  }
}
