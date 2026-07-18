# KOSMIC — Ocean Freight Leak Detector: Build Spec for Claude Code

## What this is
An enterprise-grade demo of an AI agent that finds hidden overcharges in ocean-freight invoices. Built for a business-school AI case competition (Kearney/KOSMIC). Static/mock data — no real backend, no auth, no upload parsing.

**Persona:** Aarav Textiles & Industries (shipper) auditing carriers Odyssey Maritime Lines (OML) and Atlas Sea Carriers (ASC).

**Two-pass detection architecture:**
- **Pass 1 — Contract Compliance:** Line-by-line invoice-vs-contract matching. Catches rate misapplication, surcharge errors, D&D overcharges, accessorial duplicates.
- **Pass 2 — Spend Intelligence:** Cross-invoice pattern analysis. Catches off-contract spot bookings on contracted lanes and volume rebate shortfalls by aggregating data across invoices/shipments.

## Stack
- **Framework:** React 18 + Vite
- **Routing:** React Router v6 (5 routes)
- **Styling:** Tailwind CSS v3
- **Icons:** lucide-react
- **Charts:** recharts
- **State:** URL search params only (`?inv=...&leak=...`). All data is mock/synchronous.
- **Fonts (Google Fonts):**
  - Display: `Archivo` 500/600/700/800
  - Sans: `Inter` 400/500/600/700
  - Mono: `IBM Plex Mono` 400/500/600
- **No backend / no DB / no auth.**
- **Deploy target:** Vercel (static SPA)

## Design System

### Palette (CSS custom properties on :root)
```
--ink:         #0A1B36    (primary text, top bar, buttons)
--ink2:        #13294B    (secondary text, gradient)
--steel:       #4A5B72    (muted text, mono labels)
--steel-soft:  #A0AABC    (faint chrome)
--paper:       #FFFFFF    (page background)
--mist:        #F3F5F8    (sub-header band, hover, chips)
--mist2:       #E8ECF1    (slightly darker mist)
--line:        #DDE1E8    (all borders)
--leak:        #E1492B    (red — mismatch / leak)
--leak-soft:   #FDE8E4    (leak pill background)
--green:       #1F8A5B    (green — matched / clean)
--green-soft:  #E4F5ED    (matched pill background)
--gold:        #C9962F    (amber — needs review)
--gold-soft:   #FBF3E0    (needs-review pill background)
```

### Typography
- `.display` → Archivo, letter-spacing: -0.01em. Used for screen titles, KPIs, panel titles.
- `.mono` → IBM Plex Mono, uppercase, tracking-[0.12em]. Used for labels, kickers, codes, tabular numbers.
- Body → Inter, with font-feature-settings: "ss01","cv11","tnum".
- `.tabular` → font-variant-numeric: tabular-nums for aligned digits.

### Radii
`--radius-sm: 2px`, `--radius-md: 4px`, `--radius-lg: 6px`, `--radius-xl: 8px`.
Square-ish radii for enterprise/terminal feel.

### Three-state match indicator
| Status         | Color    | Meaning                                        |
|----------------|----------|------------------------------------------------|
| `matched`      | --green  | Clean line — matches contract                  |
| `needs_review` | --gold   | Low-confidence extraction — routed to human    |
| `mismatch`     | --leak   | Leak the agent can justify with an exact clause |

Rendered by: `StatusDot` (small colored circle) and `StatusPill` (small badge with dot + label).

## File Structure
```
src/
  components/
    AppShell.tsx          # Shell + TopBar + StepperNav + ScreenFrame + shared atoms
    StatusDot.tsx         # Three-state colored dot
    StatusPill.tsx        # Badge with dot + label
    StepFooter.tsx        # Bottom nav with prev/next
    Panel.tsx             # Standard bordered white card
  lib/
    freight-data.ts       # ALL seed data + helpers (already built — see attached file)
    dispute.ts            # collectLeaks, faultTrail, draftDispute, clauseFor (already built)
    nav.ts                # STEPS[], route config
  pages/
    PortfolioOverview.tsx  # Screen 1 — Macro KPIs + concentration breakdown
    SourceDocuments.tsx    # Screen 2 — Side-by-side contract vs invoice
    AIReasoning.tsx        # Screen 3 — Matcher with SVG connectors
    LeakDetail.tsx         # Screen 4 — Single leak deep-dive
    RecoveryAction.tsx     # Screen 5 — Recovery register + auto-drafted dispute
  App.tsx
  main.tsx
  index.css               # Tailwind entry + CSS custom properties
```

## Routing
```ts
const STEPS = [
  { n: 1, path: "/",           label: "Portfolio Overview", altitude: "Macro" },
  { n: 2, path: "/documents",  label: "Source Documents",   altitude: "How it works" },
  { n: 3, path: "/reasoning",  label: "AI Reasoning",       altitude: "How it works" },
  { n: 4, path: "/detail",     label: "Leak Detail",        altitude: "Micro" },
  { n: 5, path: "/recovery",   label: "Recovery & Action",  altitude: "Action" },
];
```

URL search params: `?inv=INV-OML-88213&leak=0` — preserved across all route navigations.

## App Shell (renders on all screens)

### TopBar (48px, dark gradient --ink → --ink2)
- Left: Waves icon in bg-white/10 square, "KOSMIC" brand, sub-label "Leak Detector v0.4"
- Right: green sync dot "SYNC · 04:12 AGO", shipper name "Aarav Textiles & Industries", "AT" avatar circle

### StepperNav (sticky top, white + backdrop blur, 5-column grid)
Each step: 28×28 mono number square (dark bg when active), label, sub-label = altitude.
Active step gets dark background. All steps are clickable links.

### ScreenFrame (mist-band sub-header at top of every screen)
- Mono kicker: "SCREEN 0N · {altitude}"
- h1 (Archivo 26px bold) — the framing sentence
- 14.5px paragraph — "what to look at" copy
- Optional right slot (invoice pickers, prev/next controls)

### StepFooter (bottom nav)
max-width 1600px, back button (white with border) + next button (dark ink). Both carry URL search params forward.

## Screen Specs

### Screen 1 — Portfolio Overview (`/`)
**Framing:** "How big is the problem, and where does it concentrate?"

Body:
1. **KPI hero row** — 4 white cards:
   - "Leakage identified" — $3,171 total, leak color, "+18.4% vs May" trend chip
   - "Pass 1 · Compliance" — $1,321, with sub "rate, surcharge, D&D, duplicate errors"
   - "Pass 2 · Intelligence" — $1,850, with sub "spot exposure, rebate shortfall"
   - "Invoice coverage" — 100%, sub "40 lines audited · 10 invoices"

2. **Concentration Panel** — segmented control (by category | by carrier | by lane):
   - Horizontal bar breakdown of leak $ per key
   - Right side: 6-month sparkline from LEAK_TREND data

3. **Pass 2 Spotlight** — two insight cards:
   - "Spot Booking Exposure": 2 spot bookings on contracted lanes, $1,630 avoidable premium
   - "Volume Rebate Gap": ASC Q2 — 2,600/2,500 TEU, threshold crossed, $220 rebate missed

Footer: next → /documents

### Screen 2 — Source Documents (`/documents`)
**Framing:** "Every reconciliation starts with two documents that were never designed to talk to each other."

Right slot: invoice dropdown (all 10 invoices). Default: INV-OML-88213.

Body — 2-column grid:
- Left: Rate card panel (contract terms for selected invoice's lane)
- Right: Invoice panel (all charge lines as billed)

Footer: prev /, next /reasoning

### Screen 3 — AI Reasoning (`/reasoning`)
**Framing:** "The agent connects every line to a clause — and colors each connection green, amber, or red."

Pipeline strip: 5 tiles (Read → Normalize → Match → Judge fault → Quantify)

Body — 3-column grid:
- Left (ContractSide): contract summary + clickable rows with contracted values
- Middle (Matcher): SVG bezier connectors colored by match status (green/gold/red)
- Right (InvoiceSide): invoice lines with StatusDots + billed amounts + leak deltas

Footer: prev /documents, next /detail

### Screen 4 — Leak Detail (`/detail`)
**Framing:** "One leak, fully explained."

Right slot: scope dropdown (ALL | specific invoice) + prev/next carousel.

Body:
- Hero card with 6px leak-colored left rail: charge description, metadata, evidence note, recoverable amount
- Below: "Fault reasoning · step by step" — numbered vertical list from faultTrail()
- Side panels: "Contract clause cited" + "Source invoice" metadata

Footer: prev /reasoning, next /recovery

### Screen 5 — Recovery & Action (`/recovery`)
**Framing:** "Prioritized register, one owner per leak, dispute already drafted."

Body — 2-column grid:
- Left (col-7): Recovery register table — sortable by $ at stake, columns: invoice, carrier/lane, category, $ at stake, priority pill, owner
- Right (col-5): Evidence pack for selected leak — metadata, contracted/invoiced/overage stats, contract clause, auto-drafted dispute email with Copy button

Footer: prev /detail only (end of journey)

## Data Model Reference
The complete data is in `freight-data.ts` and `dispute.ts` (already built). Key exports:
- `RATE_CARD` — 5 contract rows (2 carriers, 4 lanes)
- `INVOICE_LINES` — 40 lines across 10 invoices
- `VOLUME_REBATE_TERMS` — 2 rebate agreements
- `SHIPMENT_LOG` — 10 shipment records (for Pass 2 analysis)
- `getInvoices()` — groups lines into InvoiceSummary[]
- `getPortfolioStats()` — all aggregate stats for Screen 1
- `collectLeaks()` — all mismatch lines as Leak[]
- `faultTrail(leak)` — 5-step reasoning for Screen 4
- `draftDispute(leak, contractId)` — email body for Screen 5

## Key Numbers (hardcoded in data, do not invent new ones)
- Total spend: $24,571
- Total leakage: $3,170.85
- Pass 1: $1,320.85 | Pass 2: $1,850.00
- Leak rate: 12.9%
- 10 invoices, 40 lines, 10 leak lines
- Spot premium: $1,630 (2 bookings)
- ASC rebate missed: $220 (2,600/2,500 TEU crossed)
