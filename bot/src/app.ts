import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wooting Competitive</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: radial-gradient(circle at top, #0f172a, #020617 60%); color: white; }
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
      .card { max-width: 900px; }
      .pill { display: inline-block; padding: 10px 18px; border: 1px solid rgba(34,211,238,.3); background: rgba(34,211,238,.08); border-radius: 999px; color: #a5f3fc; font-size: 14px; margin-bottom: 20px; }
      h1 { font-size: clamp(3rem, 10vw, 6rem); line-height: 0.95; margin: 0; font-weight: 900; }
      p { font-size: clamp(1.1rem, 3vw, 1.5rem); color: #cbd5e1; max-width: 720px; margin: 24px auto 0; }
      a { display: inline-block; margin-top: 34px; padding: 16px 28px; border-radius: 18px; background: #22d3ee; color: #020617; text-decoration: none; font-weight: 800; font-size: 18px; box-shadow: 0 20px 40px rgba(34,211,238,.2); }
      a:hover { background: #67e8f9; transform: translateY(-1px); }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="pill">Wooting Competitive</div>
        <h1>Welcome to Wooting Competitive</h1>
        <p>Join Wooting Competitive and this Discord server.</p>
        <a href="https://discord.gg/JgTtNra7QZ" target="_blank" rel="noreferrer">Join the Discord server</a>
      </div>
    </div>
  </body>
</html>`);
});

app.use("/api", router);

export default app;
