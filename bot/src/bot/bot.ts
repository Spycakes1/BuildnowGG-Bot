import {
  Client,
  GatewayIntentBits,
  Events,
  CommandInteraction,
  ModalSubmitInteraction,
  ActivityType,
} from "discord.js";
import { initDbWithRetry, isDbReady } from "./schema.js";
import { deployCommands } from "./deploy-commands.js";
import * as registerCmd from "./commands/register.js";
import * as addprCmd from "./commands/addpr.js";
import * as setprCmd from "./commands/setpr.js";
import * as leaderboardCmd from "./commands/leaderboard.js";
import * as createscrimCmd from "./commands/createscrim.js";
import * as forceregisterCmd from "./commands/forceregister.js";
import * as resetprCmd from "./commands/resetpr.js";
import * as backupserverCmd from "./commands/backupserver.js";
import * as restorebackupCmd from "./commands/restorebackup.js";
import * as antinukestatusCmd from "./commands/antinukestatus.js";
import { registerAntiNuke } from "./antinuke.js";

const ACTIVITIES = [
  "Yasir Is Goated",
  "Amzy Has Aura",
  "Amzy Is goated",
  "made by Big daddy Yasir",
  "Shimmz Get's Full pieced by Yasir",
  "200",
  "BNCL On top!",
];

const commands = new Map([
  [registerCmd.data.name, registerCmd.execute],
  [addprCmd.data.name, addprCmd.execute],
  [setprCmd.data.name, setprCmd.execute],
  [leaderboardCmd.data.name, leaderboardCmd.execute],
  [createscrimCmd.data.name, createscrimCmd.execute],
  [forceregisterCmd.data.name, forceregisterCmd.execute],
  [resetprCmd.data.name, resetprCmd.execute],
  [backupserverCmd.data.name, backupserverCmd.execute],
  [restorebackupCmd.data.name, restorebackupCmd.execute],
  [antinukestatusCmd.data.name, antinukestatusCmd.execute],
]);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
  ],
});

registerAntiNuke(client);

function startActivityRotation() {
  let index = 0;
  const setActivity = () => {
    client.user?.setPresence({
      activities: [{ name: ACTIVITIES[index], type: ActivityType.Playing }],
      status: "online",
    });
    index = (index + 1) % ACTIVITIES.length;
  };
  setActivity();
  setInterval(setActivity, 5000);
}

async function safeRun(interaction: CommandInteraction, fn: () => Promise<void>) {
  if (!isDbReady()) {
    const msg = { content: "⚠️ Database not ready yet, please try again in a moment.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
    return;
  }
  try {
    await fn();
  } catch (err) {
    console.error(`Error in command ${interaction.commandName}:`, err);
    const msg = { content: "An error occurred. Please try again.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Discord bot ready! Logged in as ${c.user.tag}`);

  try {
    await c.user.setUsername("Wooting Competitive");
    console.log("✅ Bot username set to: Wooting Competitive");
  } catch (err: any) {
    console.warn("⚠️ Could not set username (rate limited or unchanged):", err.message);
  }

  try {
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const avatarBuffer = readFileSync(join(__dirname, "avatar.png"));
    await c.user.setAvatar(avatarBuffer);
    console.log("✅ Bot avatar updated");
  } catch (err: any) {
    console.warn("⚠️ Could not set avatar (rate limited or unchanged):", err.message);
  }

  startActivityRotation();
  await deployCommands().catch((err) => console.error("Failed to register commands:", err));

  for (const guild of c.guilds.cache.values()) {
    try {
      const { saveBackup } = await import("./backup.js");
      await saveBackup(guild);
      console.log(`✅ Auto-backup created for guild: ${guild.name}`);
    } catch (err: any) {
      console.error(`Auto-backup failed for ${guild.name}:`, err.message);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.attachments.size > 0 && isDbReady()) {
    await registerCmd.handleAttachment(message).catch((err) =>
      console.error("Error handling attachment:", err),
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (cmd) {
      await safeRun(interaction as CommandInteraction, () =>
        cmd(interaction as CommandInteraction),
      );
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    const modalInteraction = interaction as ModalSubmitInteraction;
    if (modalInteraction.customId === "register_modal") {
      if (!isDbReady()) {
        await modalInteraction.reply({ content: "⚠️ Database not ready, please try again shortly.", ephemeral: true }).catch(() => {});
        return;
      }
      try {
        await registerCmd.handleRegisterModal(modalInteraction);
      } catch (err) {
        console.error("Error handling register modal:", err);
        const reply = { content: "An error occurred during registration.", ephemeral: true };
        if (modalInteraction.replied || modalInteraction.deferred) {
          await modalInteraction.followUp(reply).catch(() => {});
        } else {
          await modalInteraction.reply(reply).catch(() => {});
        }
      }
    }
  }
});

async function main() {
  const TOKEN = process.env.DISCORD_BOT_TOKEN_OVERRIDE ?? process.env.DISCORD_BOT_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

  if (!TOKEN) {
    console.error("❌ DISCORD_BOT_TOKEN is not set!");
    process.exit(1);
  }
  if (!CLIENT_ID) {
    console.error("❌ DISCORD_CLIENT_ID is not set!");
    process.exit(1);
  }

  await initDbWithRetry();
  await client.login(TOKEN);

  setInterval(async () => {
    if (!client.isReady()) {
      console.warn("⚠️ Watchdog: bot is offline — attempting reconnect...");
      try {
        await client.login(TOKEN!);
        console.log("✅ Watchdog: bot reconnected successfully.");
      } catch (err: any) {
        console.error("❌ Watchdog: reconnect failed:", err.message);
      }
    } else {
      console.log(`💓 Watchdog: bot online as ${client.user?.tag}`);
    }
  }, 30_000);
}

main().catch((err) => {
  console.error("Fatal bot error:", err);
  process.exit(1);
});
