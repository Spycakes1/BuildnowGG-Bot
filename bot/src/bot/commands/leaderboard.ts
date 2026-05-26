import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { pool } from "../schema.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the Buildnow.gg power ranking leaderboard");

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const result = await pool.query(
    `SELECT buildnowgg_name, discord_id, region, country, power_ranking
     FROM registered_players
     ORDER BY power_ranking DESC
     LIMIT 25`,
  );

  if (result.rows.length === 0) {
    await interaction.editReply({
      content: "No players are registered yet. Use `/register` to get started!",
    });
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  const description = result.rows
    .map((row, i) => {
      const medal = medals[i] ?? `**#${i + 1}**`;
      return `${medal} **${row.buildnowgg_name}** (<@${row.discord_id}>) — PR: **${row.power_ranking}** | ${row.region} | ${row.country}`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🏆 Buildnow.gg Power Rankings Leaderboard")
    .setDescription(description)
    .setColor(0xffd700)
    .setFooter({ text: `${result.rows.length} registered player(s)` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
