import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("createscrim")
  .setDescription("Create a solo scrim lobby (Admin only)")
  .addStringOption((opt) =>
    opt.setName("region").setDescription("Region for the scrim (e.g. EU, NA, ASIA)").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("code").setDescription("The scrim lobby code").setRequired(true),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const ANNOUNCE_CHANNEL_ID = "1483519978589261979";
const CODE_CHANNEL_ID = "1483520034906181798";
const ROLE_PING = "<@&1480638402599846063>";
const RULES_CHANNEL = "<#1477446393336430664>";

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const region = interaction.options.get("region")?.value as string;
  const code = interaction.options.get("code")?.value as string;

  const codeChannel = interaction.guild?.channels.cache.get(CODE_CHANNEL_ID) as TextChannel | undefined;
  if (codeChannel) {
    await codeChannel.send(`**Scrim Code:** \`${code}\``);
  }

  const announceChannel = interaction.guild?.channels.cache.get(ANNOUNCE_CHANNEL_ID) as TextChannel | undefined;
  if (announceChannel) {
    await announceChannel.send(
      `${ROLE_PING}   **Solo Scrims**\n` +
      `> Format : **Solos**\n` +
      `> Region : **${region}**\n` +
      `> Code : <#${CODE_CHANNEL_ID}>\n` +
      `> Games :**Unlimited**\n` +
      `> Rules : ${RULES_CHANNEL}`,
    );
  }

  await interaction.editReply({
    content: `✅ Scrim created! Announcement sent and code posted in <#${CODE_CHANNEL_ID}>.`,
  });
}
