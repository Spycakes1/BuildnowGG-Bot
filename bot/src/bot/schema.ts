import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

const db = new Database(path.join(DATA_DIR, "bot.db"));
db.pragma("journal_mode = WAL");

let _dbReady = false;

export function isDbReady() { return _dbReady; }

function pgToSqlite(text: string): string {
  return text.replace(/\$\d+/g, "?");
}

export const pool = {
  query: async (text: string, params?: any[]): Promise<{ rows: any[] }> => {
    const sql = pgToSqlite(text);
    const upper = sql.trim().toUpperCase();
    try {
      if (upper.startsWith("CREATE") || upper.startsWith("DROP") || upper.startsWith("ALTER")) {
        db.exec(sql);
        return { rows: [] };
      }
      const stmt = db.prepare(sql);
      if (upper.startsWith("SELECT") || upper.includes("RETURNING")) {
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows: Array.isArray(rows) ? rows : rows ? [rows] : [] };
      } else {
        params ? stmt.run(...params) : stmt.run();
        return { rows: [] };
      }
    } catch (err: any) {
      console.error(`DB error: ${err.message} | SQL: ${sql}`);
      throw err;
    }
  },
};

export async function initDb(): Promise<boolean> {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS registered_players (
        discord_id TEXT PRIMARY KEY,
        discord_username TEXT NOT NULL,
        buildnowgg_name TEXT NOT NULL,
        region TEXT NOT NULL,
        country TEXT NOT NULL,
        buildnowgg_ingame_id TEXT NOT NULL,
        power_ranking INTEGER NOT NULL DEFAULT 0,
        registered_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS server_backups (
        backup_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    _dbReady = true;
    return true;
  } catch (err: any) {
    console.error("Failed to init DB:", err.message);
    return false;
  }
}

export async function initDbWithRetry(): Promise<void> {
  const ok = await initDb();
  if (ok) console.log(`✅ SQLite database ready at ${path.join(DATA_DIR, "bot.db")}`);
}
