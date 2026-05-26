import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getAntiNukeStats } from "../antinuke.js";

export const data = new SlashCommandBuilder()
  .setName("antinuke")
  .setDescription("View anti-nuke protection status (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const stats = getAntiNukeStats();

  const embed = new EmbedBuilder()
    .setTitle("🛡️ Anti-Nuke Status")
    .setColor(0xff4400)
    .setDescription("Anti-nuke protection is **active** and monitoring your server.")
    .addFields(
      { name: "Channel Delete Threshold", value: `3 deletions / 10s`, inline: true },
      { name: "Role Delete Threshold", value: `3 deletions / 10s`, inline: true },
      { name: "Ban Threshold", value: `3 bans / 10s`, inline: true },
      { name: "Kick Threshold", value: `5 kicks / 10s`, inline: true },
      { name: "Webhook Create Threshold", value: `3 / 10s`, inline: true },
      { name: "Bot Add Threshold", value: `Instant flag`, inline: true },
      { name: "Total Incidents Blocked", value: `${stats.incidents}`, inline: true },
      { name: "Last Incident", value: stats.lastIncident ?? "None", inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
