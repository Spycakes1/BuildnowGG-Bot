import {
  Client,
  Guild,
  GuildAuditLogsEntry,
  AuditLogEvent,
  TextChannel,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { saveBackup, restoreBackup, getLatestBackupId } from "./backup.js";

const LOG_CHANNEL_ID = "1508785338800279562";

const THRESHOLDS = {
  channelDelete: { count: 3, windowMs: 10_000 },
  roleDelete: { count: 3, windowMs: 10_000 },
  ban: { count: 3, windowMs: 10_000 },
  kick: { count: 5, windowMs: 10_000 },
  webhookCreate: { count: 3, windowMs: 10_000 },
};

interface ActionEntry {
  userId: string;
  timestamps: number[];
}

const actionMap = new Map<string, ActionEntry[]>();

let incidentCount = 0;
let lastIncident: string | null = null;

export function getAntiNukeStats() {
  return { incidents: incidentCount, lastIncident };
}

function track(key: string, userId: string, threshold: { count: number; windowMs: number }): boolean {
  const now = Date.now();
  const list = actionMap.get(key) ?? [];
  let entry = list.find((e) => e.userId === userId);
  if (!entry) {
    entry = { userId, timestamps: [] };
    list.push(entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => now - t < threshold.windowMs);
  entry.timestamps.push(now);
  actionMap.set(key, list);
  return entry.timestamps.length >= threshold.count;
}

async function getLogChannel(guild: Guild): Promise<TextChannel | null> {
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID) as TextChannel | undefined;
  if (ch) return ch;
  try {
    const fetched = await guild.channels.fetch(LOG_CHANNEL_ID);
    if (fetched?.isTextBased()) return fetched as TextChannel;
  } catch {
    // channel not in this guild
  }
  return null;
}

async function punishAndRestore(
  guild: Guild,
  userId: string,
  reason: string,
  client: Client,
): Promise<void> {
  incidentCount++;
  lastIncident = new Date().toLocaleString();

  const logCh = await getLogChannel(guild);

  try {
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);

    if (member && guild.members.me) {
      const botHighest = guild.members.me.roles.highest.position;
      if (member.roles.highest.position < botHighest && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await guild.bans.create(userId, { reason: `[Anti-Nuke] ${reason}` });
        console.log(`🚨 Anti-nuke: Banned user ${userId} — ${reason}`);
      }
    }
  } catch (err: any) {
    console.error("Anti-nuke ban failed:", err.message);
  }

  if (logCh) {
    await logCh.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚨 Anti-Nuke Triggered")
          .setDescription(`**Reason:** ${reason}\n**Offender:** <@${userId}>`)
          .setColor(0xff0000)
          .setTimestamp(),
      ],
    }).catch(() => {});
  }

  const backupId = getLatestBackupId();
  if (backupId) {
    try {
      const restored = await restoreBackup(guild, backupId);
      if (logCh) {
        await logCh.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔄 Auto-Restore Complete")
              .setDescription(
                `Restored from backup \`${backupId}\`.\n` +
                `Roles: **${restored.rolesRestored}** | Channels: **${restored.channelsRestored}**`,
              )
              .setColor(0x00aaff)
              .setTimestamp(),
          ],
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error("Auto-restore failed:", err.message);
    }
  } else {
    if (logCh) {
      await logCh.send("⚠️ No backup found for auto-restore. Run `/backupserver` to create one.").catch(() => {});
    }
  }
}

async function checkAuditLog(
  guild: Guild,
  event: AuditLogEvent,
  key: string,
  threshold: { count: number; windowMs: number },
  reason: string,
  client: Client,
) {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: event });
    const entry = logs.entries.first();
    if (!entry || !entry.executor) return;

    const executorId = entry.executor.id;
    if (executorId === client.user?.id) return;

    const member = guild.members.cache.get(executorId);
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    const triggered = track(key, executorId, threshold);
    if (triggered) {
      await punishAndRestore(guild, executorId, reason, client);
    }
  } catch (err: any) {
    console.error(`Anti-nuke audit check failed (${key}):`, err.message);
  }
}

export function registerAntiNuke(client: Client) {
  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    await checkAuditLog(
      channel.guild,
      AuditLogEvent.ChannelDelete,
      "channelDelete",
      THRESHOLDS.channelDelete,
      "Mass channel deletion detected",
      client,
    );
  });

  client.on("roleDelete", async (role) => {
    await checkAuditLog(
      role.guild,
      AuditLogEvent.RoleDelete,
      "roleDelete",
      THRESHOLDS.roleDelete,
      "Mass role deletion detected",
      client,
    );
  });

  client.on("guildBanAdd", async (ban) => {
    await checkAuditLog(
      ban.guild,
      AuditLogEvent.MemberBanAdd,
      "ban",
      THRESHOLDS.ban,
      "Mass ban detected",
      client,
    );
  });

  client.on("guildMemberRemove", async (member) => {
    const guild = member.guild;
    await checkAuditLog(
      guild,
      AuditLogEvent.MemberKick,
      "kick",
      THRESHOLDS.kick,
      "Mass kick detected",
      client,
    );
  });

  client.on("webhookUpdate", async (channel) => {
    const guild = channel.guild;
    await checkAuditLog(
      guild,
      AuditLogEvent.WebhookCreate,
      "webhookCreate",
      THRESHOLDS.webhookCreate,
      "Mass webhook creation detected",
      client,
    );
  });

  client.on("guildMemberAdd", async (member) => {
    if (!member.user.bot) return;
    const guild = member.guild;
    try {
      const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd });
      const entry = logs.entries.first();
      if (!entry || !entry.executor) return;
      const executorId = entry.executor.id;
      if (executorId === client.user?.id) return;
      const executor = guild.members.cache.get(executorId);
      if (executor?.permissions.has(PermissionFlagsBits.Administrator)) return;

      await punishAndRestore(guild, executorId, `Unauthorized bot added: ${member.user.tag}`, client);
    } catch (err: any) {
      console.error("Anti-nuke bot-add check failed:", err.message);
    }
  });

  console.log("🛡️ Anti-nuke protection active");
}
