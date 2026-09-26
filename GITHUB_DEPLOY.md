# Deploying the trading pipeline to GitHub Actions (free)

Read this whole thing before you touch anything. There are two things you must
fix that have nothing to do with GitHub.

---

## 0. STOP — rotate your Telegram bot token right now

Your uploaded zip contained `.data/trading_config.json` with a **real, live
Telegram bot token and chat ID sitting in plaintext**. That file never made it
into this rebuilt project (it's excluded and `.gitignore`'d), but it already
existed on your machine and now also in whatever you gave me. Treat that token
as burned:

1. Open Telegram, message **@BotFather**.
2. `/mybots` → select your bot → **API Token** → **Revoke current token**.
3. Take the new token and use it below. Never put a real token in a JSON file
   that sits inside a project folder — that's exactly how bots end up hijacked.

Also: your logs show Gemini returning `403 PERMISSION_DENIED — Your project
has been denied access`. That's not a bad key format, it's your **Google
Cloud project** being restricted (billing not enabled, API not enabled, or
the project got flagged). Go to https://aistudio.google.com/apikey, confirm
the key's project has the **Generative Language API** enabled and isn't
restricted. If you don't fix this, every run silently falls back to the
rule-based quantitative model — which still works, just isn't the AI you built.

---

## 1. What actually changed

| Original | Now |
|---|---|
| Express server, always running, in-process `node-cron` | GitHub Actions runs `scripts/run-pipeline.mjs` on a schedule, once, then exits |
| Config read from `.data/trading_config.json` (dashboard UI) | Config comes from **GitHub Secrets** (env vars) — no dashboard needed for automation |
| Live web dashboard (charts, buttons) | **Not deployed anywhere by this setup.** GitHub cannot host it for free — that's a hosting question, not a scheduling question. Ask me separately if you want the dashboard on Render/Railway's free tier. |
| Model `gemini-3.8-flash` | Fixed to `gemini-3.5-flash` (the old name doesn't exist and was silently failing every call) |
| No visibility between runs | `scripts/status.json` is rewritten every run and **committed back to the repo**, so you get a run history in your commit log for free, and it doubles as a keepalive so GitHub doesn't auto-disable the schedule after 60 days |

Nothing about your original `server/`, `src/` dashboard code was deleted — it's
still there if you later want to run it on a real host. The new `scripts/`
folder is a fully independent, decoupled automation path.

---

## 2. The free-tier math you need to actually believe

- GitHub Actions is **unlimited free minutes on public repos**. On private
  repos it's 2,000 min/month (Free plan) and every minute past that either
  gets blocked or billed depending on your spending limit.
- Each pipeline run (checkout + npm install + script) costs roughly 1–2
  minutes. At a 30-minute schedule that's 48 runs/day → **~50–95 hours... no —
  ~50–95 min/day → ~1,500–2,850 min/month.**
- That is at or past the private-repo free quota. **Your repo must be public**
  for this to be reliably free. Your secrets stay encrypted regardless of
  repo visibility — public repo does not mean public tokens.
- Scheduled workflows are **best-effort timing**, not guaranteed-to-the-minute.
  GitHub explicitly reserves the right to delay them under load. Don't build
  anything where a 5–10 minute delay would hurt you.
- GitHub auto-disables a public repo's scheduled workflows after **60 days
  with zero repo activity** (pushes/commits, not workflow runs). The
  status.json auto-commit in the 30m workflow provides that activity
  automatically — but only if the 30m workflow itself is running, which is
  circular if it ever silently stops. Check in on it at least once every
  couple months regardless.

If you don't want a public repo, your alternative is a private repo with a
much sparser schedule (e.g. hourly or every 4h instead of 30m) to stay under
2,000 min/month. That's a real tradeoff — pick one, don't pretend both.

---

## 3. Step-by-step setup

### 3.1 Create the repo
1. On GitHub, create a **new repository** — set it **Public** (see §2 for why).
2. Don't initialize it with a README (you already have one).

### 3.2 Push this code
```bash
cd deriv-ai-trading-analyst   # the folder you unzip from me
git init
git add .
git commit -m "Initial commit: Deriv AI trading analyst + GitHub Actions automation"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 3.3 Add your secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add each of these (names must match exactly):

| Secret name | Required? | Where to get it |
|---|---|---|
| `TG_BOT_TOKEN` | Yes, to receive alerts | BotFather → your bot → API Token (the **new** one you just rotated to) |
| `TG_CHAT_ID` | Yes, to receive alerts | Message your bot once, then open `https://api.telegram.org/bot<token>/getUpdates` in a browser — your chat id is in the JSON response (`message.chat.id`) |
| `GEMINI_API_KEY` | Recommended (else rule-based fallback only) | https://aistudio.google.com/apikey — fix the 403 first (see §0) |
| `DERIV_TOKEN` | Optional | https://app.deriv.com/account/api-token — only needed if you want *your* authenticated account context; public candle data works with no token at all |

Optional **repository variable** (Settings → Secrets and variables → Actions →
**Variables** tab, not Secrets): `SYMBOLS` = `R_75,R_100` (comma-separated,
no spaces required). If you don't set it, it defaults to `R_75,R_100`.

### 3.4 Test it manually before trusting the schedule
Repo → **Actions** tab → **Trading Pipeline (30m)** → **Run workflow** button
→ Run workflow. Watch the log. You should see Deriv connect, an analysis
verdict, and a Telegram send result. If Telegram says "not sent", your
secrets are wrong or not saved — go back to 3.3.

Do the same for **Daily Meta-Research Intelligence** to test that path too.

### 3.5 Let it run
Once the manual test works, the `*/30 * * * *` schedule takes over
automatically — no further action needed. Every run:
1. Fetches 50 candles per symbol from Deriv's public WebSocket.
2. Runs the 4-persona Gemini analysis (or the deterministic fallback).
3. Sends a formatted alert to your Telegram chat.
4. Commits `scripts/status.json` with the run result.

---

## 4. Enabling 1h / 4h cadences (optional)

`.github/workflows/pipeline-1h.yml.optional` has the full commented-out
workflow. Read the reasoning in that file first — running 1h/4h on the
**same** symbols as your 30m job is mostly redundant noise, not extra signal.
It only makes sense if you point a slower cadence at *different* symbols
(e.g. 30m on `R_75,R_100`, 1h on `R_10,R_25`).

---

## 5. What this setup does NOT give you

- **No live dashboard.** The charts, the config UI, the "test connection"
  buttons — none of that runs on GitHub, because GitHub doesn't host
  persistent servers for free, period. If you want the dashboard too, that's
  a separate deployment (Render/Railway/Fly.io free tier can run the
  original `server.ts` Express app as-is) — ask me and I'll set that up
  specifically, don't assume it's bundled in with this.
- **No guaranteed exact timing.** See §2.
- **No trading execution.** This only sends analysis alerts to Telegram. It
  does not place trades on Deriv. If that's actually what you want next, say
  so explicitly — it's a materially different (and materially riskier) system.

---

## 6. File map of what's new

```
scripts/
  package.json          # lean deps: ws, @google/genai, duckduckgo-search — no React/Express
  run-pipeline.mjs       # main orchestrator: fetch -> analyze -> alert, per symbol
  run-meta-research.mjs  # daily research orchestrator
  status.json            # auto-updated run history, committed by CI
  lib/
    deriv.mjs             # Deriv WS candle fetch + indicators (env-driven, no file storage)
    ai.mjs                # Gemini 4-persona analysis + deterministic fallback (model name fixed)
    telegram.mjs           # alert formatting + sending
    research.mjs           # duckduckgo-search + Gemini synthesis
.github/workflows/
  pipeline-30m.yml               # active — every 30 minutes
  pipeline-1h.yml.optional       # inactive template — rename to enable
  meta-research-daily.yml        # active — daily at 00:00 UTC
```
