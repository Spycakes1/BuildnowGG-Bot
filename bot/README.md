# Wooting Competitive Discord Bot

A full-featured Discord bot for competitive gaming communities. Built with **discord.js**, **Express**, and **SQLite**.

## Features

- **Registration** (`/register`) — Modal-based player registration with Buildnow.gg name, region, country, and in-game ID.
- **PR Management** (`/addpr`, `/setpr`, `/resetpr`) — Add, set, or reset player Power Rankings.
- **Leaderboard** (`/leaderboard`) — Top 25 PR rankings with medals.
- **Scrim Hosting** (`/createscrim`) — Post formatted scrim announcements.
- **Force Register** (`/forceregister`) — Admin command to register players manually.
- **Backup** (`/backupserver`, `/restorebackup`) — Save/restore server roles and channels.
- **Anti-Nuke** — Automatic protection against mass deletions, bans, kicks, unauthorized bot adds. Auto-restores from backup.
- **Web Dashboard** — Basic health endpoint + landing page at root.
- **24/7 Watchdog** — Auto-reconnects if the bot disconnects.

## Prerequisites

- Node.js 22+
- pnpm or npm
- Discord Bot Token + Client ID

## Setup

1. **Clone & install:**
```bash
git clone https://github.com/YOUR_USER/wooting-competitive.git
cd wooting-competitive/bot
pnpm install
```

2. **Environment variables:**
```bash
cp .env.example .env
# Edit .env with your DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID
```

3. **Build & run:**
```bash
pnpm run build
pnpm start
```

## VPS Deployment

### Option 1: Docker
```bash
docker-compose up -d
```

### Option 2: Systemd
```bash
# Copy service file
sudo cp wooting-competitive.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wooting-competitive
sudo systemctl start wooting-competitive
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application Client ID |
| `PORT` | No | HTTP server port (default: 8080) |
| `DATA_DIR` | No | SQLite data directory (default: `./data`) |
| `NODE_ENV` | No | `production` or `development` |

## Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/register` | Register as a player | Everyone |
| `/addpr` | Add PR points to a player | Admin |
| `/setpr` | Set exact PR value | Admin |
| `/leaderboard` | View PR leaderboard | Everyone |
| `/createscrim` | Host a scrim | Admin |
| `/forceregister` | Force-register a player | Admin |
| `/resetpr` | Reset a player's PR | Admin |
| `/backupserver` | Backup roles & channels | Admin |
| `/restorebackup` | Restore from backup | Admin |
| `/antinukestatus` | View anti-nuke stats | Everyone |

## Anti-Nuke Thresholds

| Action | Count | Window |
|--------|-------|--------|
| Channel delete | 3 | 10s |
| Role delete | 3 | 10s |
| Ban | 3 | 10s |
| Kick | 5 | 10s |
| Webhook create | 3 | 10s |
| Unauthorized bot add | 1 | Immediate |

On trigger: offender is banned, server auto-restored from latest backup.

## License

MIT
