# Weekly PM Loop (PickFast)

## Current Baseline (last 30 days)

- Funnel:
  - Discovery sessions: `0`
  - Engaged sessions: `0`
  - Shortlist sessions: `0`
  - Affiliate click sessions: `0`
  - Total affiliate clicks: `1`
- Experiment `hero_cta_v1`:
  - Lifecycle: `running`
  - Winner: `none`
  - Variant impressions/conversions: effectively `0`
- Revenue model snapshot:
  - Projected 30-day base revenue: `~4.71`
  - Projected clicks: `~1.08`

Because top-of-funnel data is still thin, this loop uses **bootstrapping targets** for the next 4 weeks.

---

## 3 KPI Targets (weekly)

1. **Discovery Sessions (Activation KPI)**
   - Definition: unique sessions with `catalog_load` or `intent_apply`
   - Target: `>= 50` per week (ramp to `>= 150` by week 4)
   - Why: experiment significance is impossible without top-of-funnel volume

2. **Discovery → Affiliate Click Rate (Conversion KPI)**
   - Definition: `affiliateClickSessions / discoverySessions`
   - Target: `>= 2.5%` once discovery sessions are at least `50`
   - Why: ties UX changes directly to monetization behavior

3. **Email Capture Rate (Retention KPI)**
   - Definition: `newsletter signups / discoverySessions`
   - Target: `>= 4%`
   - Why: builds low-cost remarketing + repeat conversion inventory

---

## 2 Weekly Experiment Ideas

### Experiment 1: Hero CTA Value Framing

- Variants:
  - Control: existing CTA copy
  - Variant: value-focused copy + social proof line (e.g., “Top EPC picks this week”)
- Primary metric: `affiliate_click` conversion per impression
- Secondary metric: `cta_click` CTR
- Expected impact: increase first interaction depth and downstream click sessions

### Experiment 2: Recommendation Panel Position

- Variants:
  - Control: recommendation panel below feed
  - Variant: recommendation panel directly under hero (above fold)
- Primary metric: `affiliate_click` sessions from recommendation placements
- Secondary metric: `similar_open` and `compare_run` rates
- Expected impact: faster path to high-intent product interactions

---

## 1 Rollout Decision Rule (enforced weekly)

Roll out winner only if **all** conditions pass:

1. Runtime and sample guardrails pass:
   - `runtimeDays >= minRuntimeDays`
   - each variant `impressions >= minSampleSize`
2. Statistical gate passes:
   - one-tailed z-test `pValueOneTailed <= alpha (0.05)`
   - Bayesian `P(variant > control) >= 0.95`
3. Business lift gate passes:
   - conversion lift vs control `>= 10%`
4. Safety gate passes:
   - no funnel stage drops worse than `-15%` week-over-week on discovery→engaged or shortlist→affiliate-click

If any gate fails: keep state as `learning`, log blocker, and queue one focused follow-up test.

---

## Weekly Operating Cadence (45 minutes)

1. **Read metrics (10 min)**
   - `/api/admin/funnel/summary?days=30`
   - `/api/admin/experiments/hero_cta_v1/summary?days=30`
   - `/api/admin/revenue/simulation?lookbackDays=30&horizonDays=30`
   - `/api/admin/newsletter/signups?limit=100`

2. **Diagnose bottleneck (10 min)**
   - Pick the largest conversion drop in funnel
   - Choose one page/placement to change

3. **Run experiment decision (10 min)**
   - Apply rollout rule above
   - Either roll out, continue learning, or archive

4. **Plan next sprint test (15 min)**
   - Commit exactly one new hypothesis and one primary metric

---

## Notes

- Until discovery sessions are consistently above `50/week`, prioritize traffic and first-click UX over deep personalization.
- Revisit KPI thresholds every 4 weeks and tighten targets once sample sizes are stable.
