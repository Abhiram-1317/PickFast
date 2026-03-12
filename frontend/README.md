# PickFast Frontend

Premium product discovery frontend built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:4000` (see `../backend/`)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route | Description |
|---|---|
| `/` | Home — hero, categories, spotlight, hot deals, top picks, shopping guides |
| `/discover` | Product discovery with filters (category, budget, rating, sort, region) |
| `/product/[id]` | Product detail with specs, use cases, similar products |
| `/recommendations` | Personalized recommendations + hot deals |
| `/compare` | Side-by-side product comparison with winner badges |
| `/shortlist` | Save & share product shortlists |
| `/category/[slug]` | Category-filtered product listing |
| `/intent/[slug]` | SEO intent pages with curated product sets |
| `/admin` | Admin dashboard — login, health, sync logs, price changes, clicks, experiments |

## Architecture

```
src/
├── app/             # Next.js App Router pages
├── components/      # Shared UI components
│   ├── Navbar.js          # Sticky header with nav links
│   ├── ProductCard.js     # Product card with affiliate links
│   ├── FilterBar.js       # Configurable filter dropdowns
│   ├── Skeletons.js       # Loading placeholders
│   ├── StatusStates.js    # Empty & error states
│   ├── HomeEngagementPanel.js  # Quick compare, recommendations, newsletter
│   └── WeeklyPmCard.js    # Weekly PM report widget
└── lib/
    ├── api.js       # API client (all backend endpoints)
    └── analytics.js # Client-side event tracking
```

## Backend API

All API calls go to `http://localhost:4000/api`. The API client is in `src/lib/api.js` with timeout handling and safe fetching for server components.

## Build

```bash
npm run build   # Production build
npm run lint    # Lint check
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
