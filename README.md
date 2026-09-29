# ⚠️ Personal Research Experiment Financial Disclaimer & Liability Waiver:
This is not Tool or Service: This is a private, experimental sandbox, not intended for outside or public use, replication or distribution. It is not a financial tool, software service, or product designed for public use. Not Financial Advice: The author is not a licensed financial advisor, accountant, or broker. Nothing in this repository constitutes professional financial, investment, or legal advice. No Warranties: This repository is provided "as-is" for display purposes only. The author makes no representations or warranties of any kind regarding the accuracy, completeness, or reliability of the data, code, or experimental models. Absolute Limitation of Liability: Under no circumstances shall the author be liable for any claims, damages, or financial losses (direct or indirect) if you violate these terms and attempt to use, replicate, or rely on any part of this experiment.

# U.S. Economic Mirror — THIS IS A LEARNING TOOL, FOR EDUCATIONAL AND ENTERTAINMENT PURPOSES 

A free, self-hosted copy of the U.S. Economic Mirror dashboard. It shows live
Federal Reserve (FRED) indicators, an interactive what-if simulator, and an
AI-powered Tetlock-style economic forecast — running entirely on **GitHub
Pages** (free static hosting) with **GitHub Actions** (free scheduled compute)
keeping the data fresh automatically.

## How it works

This app has no server. Everything you see is pre-built as static JSON files
under `public/data/`, and the React app just reads them:

- `public/data/indicators.json` — latest values for 11 FRED indicators
- `public/data/history.json` — 10 years of history per indicator (also powers
  the client-side what-if slider math, ported directly from the original
  Express backend)
- `public/data/tetlock-forecast.json` — the AI-generated scenario analysis and
  weighted forecast chart data

A scheduled GitHub Actions workflow (`.github/workflows/update-data.yml`)
regenerates these files every 6 hours (configurable) by calling the FRED API
and OpenAI directly, then commits the results. A second workflow
(`.github/workflows/deploy.yml`) rebuilds and republishes the site to GitHub
Pages on every push (including the automated data-refresh commits), so the
live site always reflects the latest data.

> **Why scheduled instead of live-on-click?** GitHub Pages only serves static
> files — there's no server to safely hold your OpenAI/FRED API keys. Calling
> those APIs directly from a visitor's browser would expose your keys to
> everyone. Running the fetch on a schedule in GitHub Actions (where the keys
> stay secret) is the standard, secure way to get "live data" on pure static
> hosting, at zero cost.

## One-time setup

### 1. Get your API keys

- **FRED API key** (free): https://fred.stlouisfed.org/docs/api/api_key.html
- **OpenAI API key**: https://platform.openai.com/api-keys (this uses your own
  OpenAI account/billing — the Tetlock forecast calls `gpt-4o` by default,
  configurable via the `OPENAI_MODEL` repo variable)

### 2. Push this folder to a new GitHub repository

```bash
cd github-export
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 3. Add your API keys as repository secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New
repository secret**

- `FRED_API_KEY` → your FRED key
- `OPENAI_API_KEY` → your OpenAI key

### 4. Enable GitHub Pages

**Settings → Pages → Build and deployment → Source → GitHub Actions**

### 5. Allow Actions to push commits

**Settings → Actions → General → Workflow permissions → Read and write
permissions** (needed so the data-refresh workflow can commit updated JSON)

### 6. Run the workflows once

**Actions tab → "Update economic data" → Run workflow**, then
**Actions tab → "Deploy to GitHub Pages" → Run workflow** (or just wait — the
data-refresh commit will trigger deploy automatically).

Your site will be live at `https://<your-username>.github.io/<your-repo>/`.

## Local development

```bash
npm install
cp .env.example .env   # fill in FRED_API_KEY and OPENAI_API_KEY
npm run fetch-data          # populate public/data/indicators.json + history.json
npm run generate-forecast   # populate public/data/tetlock-forecast.json (uses OpenAI)
npm run dev                 # start the Vite dev server
```

## Customizing the refresh schedule

Edit the `cron` line in `.github/workflows/update-data.yml`. The default is
every 6 hours (`0 */6 * * *`). GitHub Actions free tier includes 2,000
minutes/month for private repos and unlimited minutes for public repos —
this workflow takes well under a minute per run.

## Notes on parity with the original app

- All UI, charts, and what-if slider logic are ported as-is from the original
  React app.
- The what-if calculation runs entirely in the browser against the bundled
  10-year history, so it stays instant and interactive with no backend.
- The Tetlock AI forecast is generated on the schedule above rather than
  on-demand per visitor, since there's no server to call OpenAI safely from
  a static site.

  ***This tool is not financial advice***
