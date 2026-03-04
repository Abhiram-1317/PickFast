# PickFast (Next.js + Express)

PickFast is now organized as:

- `frontend`: Next.js/React UI
- `backend`: Node.js/Express APIs + sync jobs + SQLite

## Run Locally

1. Install root tooling (runs both apps together):

```bash
npm install
```

2. Backend env setup:

```bash
copy backend\.env.example backend\.env
```

3. Frontend env setup:

```bash
copy frontend\.env.example frontend\.env.local
```

4. Start both apps:

```bash
npm run dev
```

URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Backend API Highlights

Public APIs:

- `GET /api/health`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/top?limit=6`
- `GET /api/products/:id`
- `GET /api/products/:id/similar?limit=4`
- `GET /api/products/:id/affiliate-link?region=US`
- `POST /api/compare`
- `GET /api/recommendations`
- `GET /api/experiments/:key/assignment?sessionId=<id>`
- `POST /api/experiments/:key/events`
- `POST /api/track/click`
- `POST /api/behavior/track`
- `GET /api/recommendations/personalized?sessionId=<id>&limit=6`
- `GET /api/seo/intents?region=US&limit=8`
- `GET /api/seo/intents/:slug`
- `POST /api/shortlists`
- `PUT /api/shortlists/:slug`
- `GET /api/shortlists/:slug`
- `POST /api/alerts/subscribe`
- `POST /api/newsletter/signup`

Admin APIs:

- `POST /api/admin/sync/run`
- `GET /api/admin/sync/logs?limit=20`
- `GET /api/admin/price-changes?limit=50`
- `GET /api/admin/duplicates?limit=50`
- `GET /api/admin/commission-rules`
- `GET /api/admin/clicks/recent?limit=50`
- `GET /api/admin/clicks/summary?days=30`
- `GET /api/admin/funnel/summary?days=30`
- `GET /api/admin/experiments/:key/summary?days=14`
- `GET /api/admin/experiments/:key/config`
- `PATCH /api/admin/experiments/:key/lifecycle`
- `PATCH /api/admin/experiments/:key/guardrails`
- `POST /api/admin/experiments/:key/evaluate`
- `POST /api/admin/experiments/evaluate-auto`
- `GET /api/admin/experiments/:key/actions?limit=50`
- `GET /api/admin/revenue/simulation?lookbackDays=30&horizonDays=30&clickGrowthRate=0.08`
- `GET /api/admin/revenue/model-signals?lookbackDays=90`
- `GET /api/admin/weekly-pm-report?windowDays=7&experimentKey=hero_cta_v1`
- `GET /api/admin/db-overview`
- `GET /api/admin/alerts/subscriptions?limit=100`
- `GET /api/admin/newsletter/signups?limit=100`
- `GET /api/admin/alerts/notifications?limit=100`
- `POST /api/admin/alerts/check`
- `POST /api/admin/reminders/check?hours=24`
- `GET /api/admin/reminders/notifications?limit=100`

If `ADMIN_API_KEY` is set, send header: `x-admin-key: <your-key>`.

## Amazon Ingestion Notes

Set credentials in `backend/.env`:

- `AMAZON_ACCESS_KEY`
- `AMAZON_SECRET_KEY`
- `AMAZON_PARTNER_TAG`
- `AMAZON_HOST`
- `AMAZON_REGION`
- `AMAZON_MARKETPLACE`

Optional temporary toggle:

- `AMAZON_PAAPI_ENABLED=false` to skip Amazon PA-API sync calls (manual + cron) and log `skipped` instead of failing.

Without valid credentials, sync endpoints fail safely and log errors while the rest of the app remains operational.

## Implemented Advanced Features (Batch 1)

- EPC scoring v2 in ranking model (`epcScore`, `expectedRevenuePerClick`)
- Region-aware affiliate URLs (US/UK/IN/CA tag + host switching)
- Affiliate click attribution tracking with admin analytics summary

## Implemented Advanced Features (Batch 2)

- Intent SEO page engine (`/api/seo/intents` + slug detail)
- Shareable shortlist engine (`/api/shortlists`)
- Price-drop alerts with trigger/evaluation pipeline (`/api/alerts/subscribe` + admin checks)

## Implemented Advanced Features (Batch 3)

- Session behavior tracking (`/api/behavior/track`)
- Personalized recommendation profile and ranking (`/api/recommendations/personalized`)
- Abandoned-shortlist reminder pipeline (`/api/admin/reminders/check` + reminder notifications)

## Implemented Advanced Features (Batch 4)

- A/B experiment assignment + event tracking (`/api/experiments/:key/assignment`, `/api/experiments/:key/events`)
- Conversion funnel summary API (`/api/admin/funnel/summary`)
- Frontend funnel dashboard with experiment variant metrics

## Implemented Advanced Features (Batch 5)

- Winner auto-rollout evaluator with weighted traffic flip to winning variant
- Guardrails: minimum runtime, minimum sample size, minimum lift threshold
- Auto-pause guardrail when variant CTR materially underperforms control
- Rollout action audit trail (`/api/admin/experiments/:key/actions`)

## Implemented Advanced Features (Batch 6)

- Statistical rollout gating using one-tailed two-proportion z-test (`p <= alpha`)
- Bayesian posterior gate using probability(variant > control) threshold
- Rollout now requires: lift threshold + z-test significance + Bayesian confidence
- Experiment summary now includes significance diagnostics per variant vs control

## Implemented Advanced Features (Batch 7)

- Multi-armed bandit traffic allocation via Thompson Sampling for active experiments
- Bandit activation only after warmup impressions and significance-qualified challenger variants
- Exploration control with configurable random exploration rate
- Assignment API now returns allocation metadata (`strategy`, `selectionMode`, candidate diagnostics)

## Implemented Advanced Features (Batch 8)

- Lifecycle state machine: `draft -> running -> learning -> winner -> archived`
- Dynamic stop criteria: min runtime, min sample, min learning evaluations, max runtime auto-archive
- Winner auto-archive after configurable cooling period
- Admin lifecycle controls (`PATCH /api/admin/experiments/:key/lifecycle`) and guardrail controls (`PATCH /api/admin/experiments/:key/guardrails`)

## Implemented Advanced Features (Batch 9)

- Revenue simulation engine using click history and EPC to forecast earnings
- Scenario projections: conservative, base, aggressive
- Region-category breakdown and top projected revenue segments
- Configurable model defaults from environment variables

## Implemented Advanced Features (Batch 10)

- Real-data tuned EPC model using click + behavior signals with Bayesian smoothing
- Modeled commission rate and conversion probability persisted per product
- Dynamic category-aware hot-deal trigger thresholds calibrated from historical price drops
- Revenue simulation now blends observed EPC with modeled EPC using click-volume confidence
- Admin diagnostics endpoint for revenue calibration inputs (`/api/admin/revenue/model-signals`)