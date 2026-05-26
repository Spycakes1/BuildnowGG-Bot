import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { saveBackup } from "../backup.js";

export const data = new SlashCommandBuilder()
  .setName("backupserver")
  .setDescription("Create a full backup of server roles and channels (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild) {
    await interaction.editReply({ content: "This command must be used in a server." });
    return;
  }

  try {
    const backupId = await saveBackup(interaction.guild);

    const embed = new EmbedBuilder()
      .setTitle("✅ Server Backup Created")
      .setColor(0x00ff88)
      .addFields(
        { name: "Backup ID", value: `\`${backupId}\``, inline: true },
        { name: "Roles", value: `${interaction.guild.roles.cache.size}`, inline: true },
        { name: "Channels", value: `${interaction.guild.channels.cache.size}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Backed up by ${interaction.user.username}` });

    await interaction.editReply({ embeds: [embed] });

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🛡️ Server Backup Created")
            .setDescription(`A full server backup was created by <@${interaction.user.id}>.\nBackup ID: \`${backupId}\``)
            .setColor(0x00ff88)
            .setTimestamp(),
        ],
      });
    }
  } catch (err: any) {
    console.error("Backup error:", err);
    await interaction.editReply({ content: `❌ Backup failed: ${err.message}` });
  }
}
