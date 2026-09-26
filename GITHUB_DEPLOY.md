# Deploying the trading pipeline to GitHub Actions (free)

Read this whole thing before you touch anything.

---

## 0. STOP — rotate your Telegram bot token right now

Your originally uploaded zip contained `.data/trading_config.json` with a
**real, live Telegram bot token and chat ID sitting in plaintext**. That file
never made it into this project and `.data/` is now `.gitignore`'d, but the
token already existed unprotected. Treat it as burned:

1. Telegram → **@BotFather** → `/mybots` → your bot → **API Token** → **Revoke current token**.
2. Use the new token everywhere below.

---

## 1. What actually changed (v1.1)

| Area | What's true now |
|---|---|
| Hosting | GitHub Actions runs `scripts/run-pipeline.mjs` on a schedule, once, then exits. No persistent server — GitHub doesn't offer one for free. |
| Config | GitHub Secrets/Variables, not a JSON file on disk. |
| **AI provider** | **Provider-agnostic.** Switching from Gemini to OpenAI/Groq/OpenRouter/Anthropic/anything-OpenAI-compatible is a **secrets change, not a code change**. See §3. |
| **Candle data accuracy** | **Fixed a real bug:** the original request never sent `granularity`, so Deriv silently returned 1-minute candles labeled as "30-minute." Now `granularity` is explicit and configurable, and must match whatever timeframe you compare against on MT5. See §4. |
| **Fake-data safety** | If the live Deriv feed is unreachable, the bot used to fall back to randomly generated candles and send an alert that looked identical to a real one. It now sends a loud, unmissable "SIMULATED DATA — DO NOT TRADE" banner instead. |
| **Remote control** | Optional: control the bot's AI provider/key/model and Deriv token **from Telegram itself**, without touching the GitHub UI. See §5 — read the security tradeoff before you turn this on. |

---

## 2. The free-tier math (unchanged from before, still true)

Public repo = unlimited free Actions minutes. Private repo = 2,000 min/month
free. At a 30-min cadence you'll burn through the private quota — **keep the
repo public.** Secrets stay encrypted regardless of repo visibility.

---

## 3. Switching AI providers — the actual "global config" you asked for

There is no code to edit. Four secrets control everything:

| Secret | Purpose | Example |
|---|---|---|
| `AI_PROVIDER` | Which provider | `gemini`, `openai`, `groq`, `openrouter`, `together`, `deepseek`, `mistral`, `fireworks`, `anthropic`, or `custom` |
| `AI_API_KEY` | That provider's API key | — |
| `AI_MODEL` | Exact model name for that provider | e.g. `gemini-3.5-flash`, or whatever your provider currently calls its model — **I'm not going to guess a model name for a provider I haven't verified today; check that provider's own docs** |
| `AI_BASE_URL` | Only used when `AI_PROVIDER=custom` | e.g. your own OpenAI-compatible endpoint (self-hosted Ollama, an enterprise gateway, etc.) |

How this works under the hood: every provider except Anthropic speaks the
same "OpenAI Chat Completions" schema, so `scripts/lib/ai-dispatch.mjs` has
one generic adapter (`openai-compatible.mjs`) that just points at a different
base URL per provider. Google's own Gemini API now has an OpenAI-compatible
endpoint too, so even the "default" provider goes through the same code path.
Anthropic uses a different schema (no OpenAI-compat layer), so it gets its
own small adapter — set `AI_PROVIDER=anthropic` to use it.

**To switch, right now:** GitHub repo → Settings → Secrets and variables →
Actions → update `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`. Nothing else. Your
old `GEMINI_API_KEY` secret still works as a fallback if `AI_API_KEY` isn't
set, so you don't have to touch anything if you're staying on Gemini.

**Adding a provider that isn't in the list:** if it's OpenAI-compatible, set
`AI_PROVIDER=custom` and `AI_BASE_URL=<their /v1 base URL>` — still zero code.
If it's genuinely a different API shape (like Anthropic), that needs a new
adapter file — ask me and I'll add it, or open `scripts/lib/ai-providers/`
and follow the pattern in `anthropic.mjs`.

---

## 4. The data-accuracy fix, in full

### What was wrong
The Deriv `ticks_history` request never specified `granularity`. Per Deriv's
documented default, that means **60 seconds (M1)** — regardless of what the
app called the candles. Every indicator (SMA9, SMA21, RSI14) was computed
over 1-minute bars while you were comparing the result against an MT5 M30
chart. That's not "a bit inaccurate" — it's a different dataset entirely.

### What's fixed
- `granularity` is now sent explicitly, defaulting to `1800` (30 minutes),
  and is fully configurable via the `CANDLE_GRANULARITY_SECONDS` **variable**
  (not secret — it's not sensitive). **Set this to match whatever timeframe
  you're comparing against on MT5:** `60`=M1, `300`=M5, `900`=M15, `1800`=M30,
  `3600`=H1, `14400`=H4, `86400`=D1.
- Symbols are now validated against Deriv's live `active_symbols` list before
  each run. A typo'd or renamed symbol produces a loud log error with
  suggested matches, instead of silently failing and falling back to fake data.
- If the live feed genuinely is unreachable, the Telegram alert now says so
  in a banner you cannot miss, instead of looking like a normal alert.

### What will still not match perfectly, and that's not a bug
Even with granularity fixed, don't expect **pixel-identical** candles versus
a third-party MT5 broker's mirror of Deriv's synthetic indices:
- **Candle boundary alignment**: Deriv's own API aligns candles to UTC epoch
  boundaries. Many MT5 brokers display "server time," commonly offset by
  UTC+2 or UTC+3. A M30 candle on Deriv's feed and a M30 candle on a
  UTC+2-server MT5 broker can be time-shifted by up to half an hour, which
  will make the *open/close* of any single candle look different even though
  the underlying tick data is identical.
- **The only fully authoritative comparison** is Deriv's own MT5 platform
  (same company, same feed) — not a third-party broker's white-labeled mirror.
  If you're matching against a non-Deriv MT5, expect drift as a matter of
  course, not a defect in this bot.
- Tick-level timing differences (a few hundred ms of feed latency) are normal
  and will occasionally shift which side of a candle boundary a print lands on.

If after fixing granularity you're still seeing large (not boundary-alignment)
discrepancies, the next thing to check is **which exact symbol code** you're
comparing — Deriv has renamed some Boom/Crash symbols over time (e.g. legacy
`CRASH_500`/`BOOM_500` vs newer suffixed variants). The active_symbols
validation added above will tell you definitively, from Deriv itself, whether
your configured symbol still exists and what it's currently called — don't
trust any hardcoded list (including mine) over that live check.

---

## 5. Remote control from Telegram (optional — read the tradeoff first)

**The honest case against this feature:** editing a GitHub Secret in the web
UI takes about 15 seconds and requires no extra credentials. What this
feature buys you is not having to open a browser. What it costs you is a
**GitHub Personal Access Token capable of rewriting every secret in this
repo**, sitting in this repo's own secrets. If that PAT leaks — through a
workflow logging bug, a compromised dependency, anything — the blast radius
is total: every credential you have here can be silently replaced. If your
actual need is "I want to change the API key without a laptop handy," a
phone browser hitting github.com does that with zero extra attack surface.
Only proceed if the convenience is genuinely worth that trade to you.

### If you still want it

**5.1 Create a fine-grained PAT** (GitHub avatar → Settings → Developer
settings → Personal access tokens → Fine-grained tokens → Generate new token):
- Resource owner: you.
- Repository access: **Only select repositories** → this repo. Never "all repositories."
- Permissions → Repository permissions → **Secrets: Read and write**,
  **Variables: Read and write**. Leave everything else at "No access."
- Set an expiration (max 1 year) — you will need to regenerate and re-save
  it when it expires, or the listener silently stops being able to write.
- Copy the token once; you won't see it again.

**5.2 Add secrets:**
- `GH_PAT` = the token from 5.1.
- `CONTROL_PASSPHRASE` = a long random string only you know (this is a
  second gate on top of "message came from your own Telegram chat" — pick
  something you'd be fine typing into Telegram, e.g. a 20+ character
  passphrase, not "1234").

**5.3 Enable the workflow.** `telegram-listener.yml` is already active by
default, polling every 15 minutes. Tighten to `*/5 * * * *` if you want
faster pickup — still free on a public repo, just noisier in your Actions tab.

**5.4 Commands** (message your bot directly — not a group chat, since the
security model is "this message came from your private chat with your own
bot"):

```
/help
/setaiprovider <passphrase> <provider>
/setaikey <passphrase> <apiKey>
/setaimodel <passphrase> <model>
/setaibaseurl <passphrase> <url>        (only for custom provider)
/setderivtoken <passphrase> <token>
/setsymbols <passphrase> R_75,R_100
/setgranularity <passphrase> 1800
```

Changes take effect on the **next scheduled pipeline run** — this is polling,
not a live connection, so budget up to ~15 minutes for the listener to pick
up your message, plus however long until the next 30-min pipeline run after that.

---

## 6. Step-by-step setup (repo, secrets, first run)

### 6.1 Create the repo
Public. Don't auto-initialize with a README (you already have one).

### 6.2 Push this code
```bash
cd deriv-ai-trading-analyst
git init
git add .
git commit -m "Initial commit: Deriv AI trading analyst + GitHub Actions automation"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 6.3 Add secrets
Repo → Settings → Secrets and variables → Actions → **Secrets** tab:

| Secret | Required? | Notes |
|---|---|---|
| `TG_BOT_TOKEN` | Yes | The **rotated** token from §0 |
| `TG_CHAT_ID` | Yes | `https://api.telegram.org/bot<token>/getUpdates` after messaging your bot once — `message.chat.id` |
| `AI_API_KEY` | Recommended | Your chosen provider's key (§3) |
| `AI_PROVIDER` | Optional | Defaults to `gemini` |
| `AI_MODEL` | Recommended | Provider's current model name |
| `AI_BASE_URL` | Only if `AI_PROVIDER=custom` | |
| `DERIV_TOKEN` | Optional | Public candle data works without one |
| `GH_PAT`, `CONTROL_PASSPHRASE` | Only if using §5 | |

**Variables** tab (not Secrets — these aren't sensitive):

| Variable | Default | Notes |
|---|---|---|
| `SYMBOLS` | `R_75,R_100` | Comma-separated |
| `CANDLE_GRANULARITY_SECONDS` | `1800` | Must match your MT5 comparison timeframe — see §4 |

### 6.4 Test manually
Actions tab → **Trading Pipeline (30m)** → Run workflow. Watch for the
granularity line in the log, a real verdict, and a Telegram delivery result.

### 6.5 Let it run
The `*/30 * * * *` schedule takes over automatically after that.

---

## 7. What this setup does NOT give you

- No live dashboard (separate hosting question — ask if you want it).
- No guaranteed exact timing on schedules.
- No trade execution — alerts only.

---

## 8. File map

```
scripts/
  package.json                    # ws, duckduckgo-search, libsodium-wrappers - no AI SDK needed
  run-pipeline.mjs                 # main orchestrator
  run-meta-research.mjs            # daily research orchestrator
  update-config-from-telegram.mjs  # optional remote-control listener
  status.json                      # auto-updated run history, committed by CI
  telegram-offset.json             # tracks last processed Telegram update_id
  lib/
    deriv.mjs                       # Deriv WS candles (granularity fix + active_symbols validation)
    ai.mjs                          # 4-persona orchestration + deterministic fallback
    ai-dispatch.mjs                 # provider router - the "one place" for provider logic
    ai-providers/
      openai-compatible.mjs          # generic adapter: openai, groq, openrouter, together, deepseek, mistral, fireworks, gemini
      anthropic.mjs                   # Claude Messages API adapter
    telegram.mjs                    # alert formatting (+ fake-data banner) and sending
    research.mjs                    # duckduckgo-search + AI synthesis
    github-secrets.mjs              # GitHub Secrets/Variables API helpers (libsodium sealed-box encryption)
.github/workflows/
  pipeline-30m.yml               # active - every 30 minutes
  pipeline-1h.yml.optional       # inactive template
  meta-research-daily.yml        # active - daily at 00:00 UTC
  telegram-listener.yml          # active by default - polls every 15 min (needs GH_PAT + CONTROL_PASSPHRASE to do anything)
```
