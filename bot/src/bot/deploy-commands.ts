import { REST, Routes } from "discord.js";
import * as register from "./commands/register.js";
import * as addpr from "./commands/addpr.js";
import * as setpr from "./commands/setpr.js";
import * as leaderboard from "./commands/leaderboard.js";
import * as createscrim from "./commands/createscrim.js";
import * as forceregister from "./commands/forceregister.js";
import * as resetpr from "./commands/resetpr.js";
import * as backupserver from "./commands/backupserver.js";
import * as restorebackup from "./commands/restorebackup.js";
import * as antinukestatus from "./commands/antinukestatus.js";

const commands = [
  register.data.toJSON(),
  addpr.data.toJSON(),
  setpr.data.toJSON(),
  leaderboard.data.toJSON(),
  createscrim.data.toJSON(),
  forceregister.data.toJSON(),
  resetpr.data.toJSON(),
  backupserver.data.toJSON(),
  restorebackup.data.toJSON(),
  antinukestatus.data.toJSON(),
];

export async function deployCommands() {
  const TOKEN = process.env.DISCORD_BOT_TOKEN_OVERRIDE ?? process.env.DISCORD_BOT_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

  if (!TOKEN || !CLIENT_ID) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set");
  }

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  console.log("Registering slash commands globally...");
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Slash commands registered.");
}
