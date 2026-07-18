# KOSMIC — Ocean Freight Leak Detector

An AI-agent demo that audits ocean-freight invoices for Aarav Textiles &
Industries against carrier contracts (OML, ASC), surfacing overcharges
through a two-pass detection pipeline:

- **Pass 1 — Contract Compliance**: single-invoice checks against the
  contracted rate card (rate misapplication, surcharge errors, duplicate
  accessorials, demurrage/detention).
- **Pass 2 — Spend Intelligence**: cross-invoice analysis (off-contract spot
  bookings on contracted lanes, volume rebate shortfalls) that a line-by-line
  audit would miss.

## Local development

```bash
npm install
cp .env.example .env   # then fill in VITE_GROQ_API_KEY
npm run dev
```

Sign in with the demo credentials shown on the login screen
(`member` / `member123`).

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_GROQ_API_KEY` | Powers the AI reasoning chat on the Recovery & Action screen (Groq `llama-3.3-70b-versatile`). Without it, the chat shows a clean error state — the rest of the app works normally. |

## Deploying to Vercel

The repo includes a `vercel.json` with a SPA rewrite (all routes fall back to
`index.html`), which the client-side router (`react-router-dom`) needs so
deep links like `/detail` or `/recovery` don't 404 on refresh.

1. Import the repo into Vercel — it auto-detects the Vite framework preset
   (build command `npm run build`, output directory `dist`).
2. Add `VITE_GROQ_API_KEY` under Project Settings → Environment Variables.
3. Deploy.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
