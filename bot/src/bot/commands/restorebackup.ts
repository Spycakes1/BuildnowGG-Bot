import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { restoreBackup, getLatestBackupId } from "../backup.js";

export const data = new SlashCommandBuilder()
  .setName("restorebackup")
  .setDescription("Restore server roles and channels from the latest backup (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild) {
    await interaction.editReply({ content: "This command must be used in a server." });
    return;
  }

  const backupId = getLatestBackupId();
  if (!backupId) {
    await interaction.editReply({ content: "❌ No backup found. Run `/backupserver` first." });
    return;
  }

  await interaction.editReply({
    content: `⏳ Restoring from backup \`${backupId}\`... This may take a moment.`,
  });

  try {
    const result = await restoreBackup(interaction.guild, backupId);

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔄 Server Restored")
            .setDescription(
              `Server was restored from backup \`${backupId}\` by <@${interaction.user.id}>.\n` +
              `Roles restored: **${result.rolesRestored}** | Channels restored: **${result.channelsRestored}**`,
            )
            .setColor(0x00aaff)
            .setTimestamp(),
        ],
      });
    }
  } catch (err: any) {
    console.error("Restore error:", err);
    await interaction.editReply({ content: `❌ Restore failed: ${err.message}` });
  }
}
