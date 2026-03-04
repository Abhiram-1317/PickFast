const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for Postgres connection");
}

const pool = new Pool({
  connectionString,
  ssl: /
    (localhost|127\.0\.0\.1)/.test(connectionString)
      ? false
      : { rejectUnauthorized: false }
});

async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return { rowCount: result.rowCount, rows: result.rows };
}

async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function initDb() {
  // Core tables
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      asin TEXT,
      price NUMERIC NOT NULL,
      original_price NUMERIC,
      rating NUMERIC DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      commission_rate NUMERIC DEFAULT 0,
      monthly_sales_estimate INTEGER DEFAULT 0,
      stock_status TEXT DEFAULT 'in_stock',
      trend_score NUMERIC DEFAULT 50,
      specs_json JSONB,
      use_cases_json JSONB,
      amazon_url TEXT,
      image TEXT,
      source VARCHAR(20) DEFAULT 'manual',
      slug TEXT,
      description TEXT,
      score NUMERIC DEFAULT 0,
      epc_score NUMERIC DEFAULT 0,
      expected_revenue_per_click NUMERIC DEFAULT 0,
      conversion_probability NUMERIC DEFAULT 0,
      modeled_commission_rate NUMERIC DEFAULT 0,
      estimated_commission_value NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`ALTER TABLE products ALTER COLUMN source TYPE VARCHAR(20)`);
  await run(`ALTER TABLE products ALTER COLUMN source SET DEFAULT 'manual'`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS asin TEXT`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS specs_json JSONB DEFAULT '{}'`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS use_cases_json JSONB DEFAULT '[]'`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock'`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS trend_score NUMERIC DEFAULT 50`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0`);
  await run(`ALTER TABLE products ADD COLUMN IF NOT EXISTS monthly_sales_estimate INTEGER DEFAULT 0`);

  await run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      imported_count INTEGER DEFAULT 0,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS price_change_logs (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      old_price NUMERIC NOT NULL,
      new_price NUMERIC NOT NULL,
      source TEXT NOT NULL,
      changed_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS price_tracking (
      id SERIAL PRIMARY KEY,
      product_id TEXT UNIQUE NOT NULL,
      last_price NUMERIC NOT NULL,
      current_price NUMERIC NOT NULL,
      drop_percent NUMERIC DEFAULT 0,
      is_hot_deal BOOLEAN DEFAULT FALSE,
      source TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS duplicate_events (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      source TEXT NOT NULL,
      duplicate_count INTEGER NOT NULL,
      context_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS affiliate_click_events (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      page_type TEXT,
      placement TEXT,
      region TEXT,
      device_type TEXT,
      source_url TEXT,
      referrer TEXT,
      affiliate_url TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS shortlists (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT,
      product_ids_json JSONB NOT NULL,
      contact_email TEXT,
      region TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      product_id TEXT NOT NULL,
      target_price NUMERIC NOT NULL,
      region TEXT,
      status TEXT DEFAULT 'active',
      last_triggered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS newsletter_signups (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      source TEXT,
      status TEXT DEFAULT 'active',
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS alert_notifications (
      id SERIAL PRIMARY KEY,
      alert_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      email TEXT NOT NULL,
      target_price NUMERIC NOT NULL,
      current_price NUMERIC NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(alert_id) REFERENCES price_alerts(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS behavior_events (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      product_id TEXT,
      category TEXT,
      price NUMERIC,
      region TEXT,
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      session_id TEXT PRIMARY KEY,
      top_categories_json JSONB,
      preferred_price NUMERIC,
      preferred_region TEXT,
      confidence_score NUMERIC DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS shortlist_reminder_notifications (
      id SERIAL PRIMARY KEY,
      shortlist_slug TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_experiments (
      id SERIAL PRIMARY KEY,
      experiment_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      lifecycle_state TEXT DEFAULT 'running',
      allocation_json JSONB,
      winner_variant_key TEXT,
      min_sample_size INTEGER DEFAULT 50,
      min_runtime_days INTEGER DEFAULT 3,
      max_runtime_days INTEGER DEFAULT 30,
      min_learning_evaluations INTEGER DEFAULT 3,
      evaluations_count INTEGER DEFAULT 0,
      min_lift_threshold NUMERIC DEFAULT 0.1,
      auto_rollout_enabled BOOLEAN DEFAULT TRUE,
      auto_pause_enabled BOOLEAN DEFAULT TRUE,
      auto_archive_enabled BOOLEAN DEFAULT TRUE,
      auto_archive_after_days INTEGER DEFAULT 14,
      paused_reason TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_variants (
      id SERIAL PRIMARY KEY,
      experiment_id INTEGER NOT NULL,
      variant_key TEXT NOT NULL,
      name TEXT NOT NULL,
      weight NUMERIC DEFAULT 50,
      config_json JSONB,
      is_control BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(experiment_id, variant_key),
      FOREIGN KEY(experiment_id) REFERENCES ab_experiments(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_assignments (
      id SERIAL PRIMARY KEY,
      experiment_key TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(experiment_key, session_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_events (
      id SERIAL PRIMARY KEY,
      experiment_key TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_rollout_actions (
      id SERIAL PRIMARY KEY,
      experiment_key TEXT NOT NULL,
      action_type TEXT NOT NULL,
      reason TEXT,
      details_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed hero experiment if missing
  await run(
    `INSERT INTO ab_experiments (
      experiment_key, name, status, allocation_json,
      min_sample_size, min_runtime_days, min_lift_threshold,
      auto_rollout_enabled, auto_pause_enabled,
      lifecycle_state, max_runtime_days, min_learning_evaluations,
      auto_archive_enabled, auto_archive_after_days,
      started_at, updated_at
    )
    VALUES ($1, $2, 'active', $3, 50, 3, 0.1, TRUE, TRUE, 'running', 30, 3, TRUE, 14, NOW(), NOW())
    ON CONFLICT (experiment_key) DO NOTHING`,
    [
      "hero_cta_v1",
      "Hero CTA Copy Test",
      JSON.stringify({ goal: "affiliate_click", strategy: "weighted_random" })
    ]
  );

  const hero = await get(
    "SELECT id FROM ab_experiments WHERE experiment_key = $1",
    ["hero_cta_v1"]
  );

  if (hero) {
    await run(
      `INSERT INTO ab_variants (experiment_id, variant_key, name, weight, config_json, is_control)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (experiment_id, variant_key) DO NOTHING`,
      [
        hero.id,
        "control",
        "Control CTA",
        50,
        JSON.stringify({ ctaText: "Load Products" }),
        true
      ]
    );

    await run(
      `INSERT INTO ab_variants (experiment_id, variant_key, name, weight, config_json, is_control)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (experiment_id, variant_key) DO NOTHING`,
      [
        hero.id,
        "value_focus",
        "Value Focus CTA",
        50,
        JSON.stringify({ ctaText: "Find Best Value Picks" }),
        false
      ]
    );
  }

  // Indexes
  await run("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)");
  await run("CREATE INDEX IF NOT EXISTS idx_products_score ON products(score DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_change_product_id ON price_change_logs(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_change_changed_at ON price_change_logs(changed_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_product_id ON price_tracking(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_hot_deal ON price_tracking(is_hot_deal)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_updated_at ON price_tracking(updated_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_duplicate_product_id ON duplicate_events(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_click_events_product_id ON affiliate_click_events(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON affiliate_click_events(created_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_shortlists_slug ON shortlists(slug)");
  await run("CREATE INDEX IF NOT EXISTS idx_shortlists_contact_email ON shortlists(contact_email)");
  await run("CREATE INDEX IF NOT EXISTS idx_newsletter_signups_email ON newsletter_signups(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_newsletter_signups_status ON newsletter_signups(status)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_alerts_email ON price_alerts(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_behavior_events_session ON behavior_events(session_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_behavior_events_created_at ON behavior_events(created_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_shortlist_reminders_slug ON shortlist_reminder_notifications(shortlist_slug)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_experiments_key ON ab_experiments(experiment_key)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON ab_variants(experiment_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_assignments_lookup ON ab_assignments(experiment_key, session_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_events_experiment_time ON ab_events(experiment_key, created_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_events_session ON ab_events(session_id, created_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_rollout_actions_key ON ab_rollout_actions(experiment_key, created_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_ab_experiments_lifecycle ON ab_experiments(lifecycle_state)");
}

module.exports = {
  pool,
  run,
  get,
  all,
  initDb
};