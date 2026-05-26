import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("resetpr")
  .setDescription("Reset ALL players' PR to 0 on the leaderboard (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const count = await pool.query(`SELECT COUNT(*) as total FROM registered_players`);
  const total = count.rows[0]?.total ?? 0;

  await pool.query(`UPDATE registered_players SET power_ranking = 0`);

  await interaction.editReply({
    content: `✅ Reset PR to **0** for all **${total}** registered player(s).`,
  });

  if (interaction.channel && "send" in interaction.channel) {
    await interaction.channel.send(
      `🔄 **Leaderboard Reset** — All PRs have been wiped to **0** by <@${interaction.user.id}>.`,
    );
  }
}
