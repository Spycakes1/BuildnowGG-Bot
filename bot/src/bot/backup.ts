import {
  Guild,
  ChannelType,
  OverwriteType,
  CategoryChannel,
  TextChannel,
  VoiceChannel,
  Role,
} from "discord.js";
import { pool } from "./schema.js";

export interface BackupData {
  id: string;
  createdAt: string;
  roles: RoleBackup[];
  channels: ChannelBackup[];
}

export interface RoleBackup {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
}

export interface ChannelBackup {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId: string | null;
  topic: string | null;
  nsfw: boolean;
  rateLimitPerUser: number;
  permissionOverwrites: PermOverwrite[];
}

export interface PermOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

let latestBackupId: string | null = null;

export function getLatestBackupId(): string | null {
  return latestBackupId;
}

export async function saveBackup(guild: Guild): Promise<string> {
  const backupId = `backup_${Date.now()}`;

  await guild.roles.fetch();
  await guild.channels.fetch();

  const roles: RoleBackup[] = guild.roles.cache
    .filter((r) => !r.managed && r.name !== "@everyone")
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
    }))
    .sort((a, b) => a.position - b.position);

  const channels: ChannelBackup[] = guild.channels.cache.map((ch) => {
    const overwrites: PermOverwrite[] = [];
    if ("permissionOverwrites" in ch) {
      ch.permissionOverwrites.cache.forEach((ow) => {
        overwrites.push({
          id: ow.id,
          type: ow.type,
          allow: ow.allow.bitfield.toString(),
          deny: ow.deny.bitfield.toString(),
        });
      });
    }
    return {
      id: ch.id,
      name: ch.name,
      type: ch.type,
      position: "position" in ch ? (ch.position ?? 0) : 0,
      parentId: "parentId" in ch ? (ch.parentId ?? null) : null,
      topic: "topic" in ch ? (ch.topic ?? null) : null,
      nsfw: "nsfw" in ch ? (ch.nsfw ?? false) : false,
      rateLimitPerUser: "rateLimitPerUser" in ch ? (ch.rateLimitPerUser ?? 0) : 0,
      permissionOverwrites: overwrites,
    };
  });

  const backupData: BackupData = {
    id: backupId,
    createdAt: new Date().toISOString(),
    roles,
    channels,
  };

  await pool.query(
    `INSERT INTO server_backups (backup_id, guild_id, data, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (backup_id) DO UPDATE SET data = EXCLUDED.data, created_at = EXCLUDED.created_at`,
    [backupId, guild.id, JSON.stringify(backupData), backupData.createdAt],
  );

  latestBackupId = backupId;
  console.log(`✅ Backup saved: ${backupId}`);
  return backupId;
}

export async function restoreBackup(
  guild: Guild,
  backupId: string,
): Promise<{ rolesRestored: number; channelsRestored: number }> {
  const result = await pool.query(
    `SELECT data FROM server_backups WHERE backup_id = $1`,
    [backupId],
  );

  if (result.rows.length === 0) throw new Error(`Backup ${backupId} not found`);

  const backup: BackupData = JSON.parse(result.rows[0].data);

  await guild.roles.fetch();
  await guild.channels.fetch();

  let rolesRestored = 0;
  for (const rb of backup.roles) {
    const existing = guild.roles.cache.find(
      (r) => r.name === rb.name && !r.managed && r.name !== "@everyone",
    );
    if (!existing) {
      try {
        await guild.roles.create({
          name: rb.name,
          color: rb.color,
          hoist: rb.hoist,
          mentionable: rb.mentionable,
          permissions: BigInt(rb.permissions),
          reason: `Restored from backup ${backupId}`,
        });
        rolesRestored++;
      } catch (err: any) {
        console.error(`Failed to restore role ${rb.name}:`, err.message);
      }
    }
  }

  let channelsRestored = 0;
  for (const cb of backup.channels) {
    const existing = guild.channels.cache.find((c) => c.name === cb.name);
    if (!existing) {
      try {
        if (cb.type === ChannelType.GuildCategory) {
          await guild.channels.create({
            name: cb.name,
            type: ChannelType.GuildCategory,
            reason: `Restored from backup ${backupId}`,
          });
          channelsRestored++;
        } else if (cb.type === ChannelType.GuildText) {
          await guild.channels.create({
            name: cb.name,
            type: ChannelType.GuildText,
            topic: cb.topic ?? undefined,
            nsfw: cb.nsfw,
            rateLimitPerUser: cb.rateLimitPerUser,
            reason: `Restored from backup ${backupId}`,
          });
          channelsRestored++;
        } else if (cb.type === ChannelType.GuildVoice) {
          await guild.channels.create({
            name: cb.name,
            type: ChannelType.GuildVoice,
            reason: `Restored from backup ${backupId}`,
          });
          channelsRestored++;
        }
      } catch (err: any) {
        console.error(`Failed to restore channel ${cb.name}:`, err.message);
      }
    }
  }

  console.log(`✅ Restore complete: ${rolesRestored} roles, ${channelsRestored} channels`);
  return { rolesRestored, channelsRestored };
}
