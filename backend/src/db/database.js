const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "../../data");
const dbFilePath = path.join(dataDir, "pickfast.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbFilePath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function ensureColumn(tableName, columnName, definition) {
  const rows = await all(`PRAGMA table_info(${tableName})`);
  const exists = rows.some((row) => row.name === columnName);
  if (!exists) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL,
      original_price REAL,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      commission_rate REAL DEFAULT 0,
      monthly_sales_estimate INTEGER DEFAULT 0,
      stock_status TEXT DEFAULT 'in_stock',
      trend_score REAL DEFAULT 50,
      specs_json TEXT,
      use_cases_json TEXT,
      amazon_url TEXT,
      image TEXT,
      source TEXT DEFAULT 'seed',
      score REAL DEFAULT 0,
      epc_score REAL DEFAULT 0,
      expected_revenue_per_click REAL DEFAULT 0,
      conversion_probability REAL DEFAULT 0,
      modeled_commission_rate REAL DEFAULT 0,
      estimated_commission_value REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("products", "epc_score", "REAL DEFAULT 0");
  await ensureColumn("products", "expected_revenue_per_click", "REAL DEFAULT 0");
  await ensureColumn("products", "conversion_probability", "REAL DEFAULT 0");
  await ensureColumn("products", "modeled_commission_rate", "REAL DEFAULT 0");

  await run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      imported_count INTEGER DEFAULT 0,
      message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS price_change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      old_price REAL NOT NULL,
      new_price REAL NOT NULL,
      source TEXT NOT NULL,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS price_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT UNIQUE NOT NULL,
      last_price REAL NOT NULL,
      current_price REAL NOT NULL,
      drop_percent REAL DEFAULT 0,
      is_hot_deal INTEGER DEFAULT 0,
      source TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS duplicate_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      source TEXT NOT NULL,
      duplicate_count INTEGER NOT NULL,
      context_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS affiliate_click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS shortlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT,
      product_ids_json TEXT NOT NULL,
      contact_email TEXT,
      region TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("shortlists", "contact_email", "TEXT");

  await run(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      product_id TEXT NOT NULL,
      target_price REAL NOT NULL,
      region TEXT,
      status TEXT DEFAULT 'active',
      last_triggered_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS newsletter_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      source TEXT,
      status TEXT DEFAULT 'active',
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS alert_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      email TEXT NOT NULL,
      target_price REAL NOT NULL,
      current_price REAL NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(alert_id) REFERENCES price_alerts(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS behavior_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      product_id TEXT,
      category TEXT,
      price REAL,
      region TEXT,
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      session_id TEXT PRIMARY KEY,
      top_categories_json TEXT,
      preferred_price REAL,
      preferred_region TEXT,
      confidence_score REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS shortlist_reminder_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortlist_slug TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      lifecycle_state TEXT DEFAULT 'running',
      allocation_json TEXT,
      winner_variant_key TEXT,
      min_sample_size INTEGER DEFAULT 50,
      min_runtime_days INTEGER DEFAULT 3,
      max_runtime_days INTEGER DEFAULT 30,
      min_learning_evaluations INTEGER DEFAULT 3,
      evaluations_count INTEGER DEFAULT 0,
      min_lift_threshold REAL DEFAULT 0.1,
      auto_rollout_enabled INTEGER DEFAULT 1,
      auto_pause_enabled INTEGER DEFAULT 1,
      auto_archive_enabled INTEGER DEFAULT 1,
      auto_archive_after_days INTEGER DEFAULT 14,
      paused_reason TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("ab_experiments", "winner_variant_key", "TEXT");
  await ensureColumn("ab_experiments", "lifecycle_state", "TEXT DEFAULT 'running'");
  await ensureColumn("ab_experiments", "min_sample_size", "INTEGER DEFAULT 50");
  await ensureColumn("ab_experiments", "min_runtime_days", "INTEGER DEFAULT 3");
  await ensureColumn("ab_experiments", "max_runtime_days", "INTEGER DEFAULT 30");
  await ensureColumn("ab_experiments", "min_learning_evaluations", "INTEGER DEFAULT 3");
  await ensureColumn("ab_experiments", "evaluations_count", "INTEGER DEFAULT 0");
  await ensureColumn("ab_experiments", "min_lift_threshold", "REAL DEFAULT 0.1");
  await ensureColumn("ab_experiments", "auto_rollout_enabled", "INTEGER DEFAULT 1");
  await ensureColumn("ab_experiments", "auto_pause_enabled", "INTEGER DEFAULT 1");
  await ensureColumn("ab_experiments", "auto_archive_enabled", "INTEGER DEFAULT 1");
  await ensureColumn("ab_experiments", "auto_archive_after_days", "INTEGER DEFAULT 14");
  await ensureColumn("ab_experiments", "paused_reason", "TEXT");
  await ensureColumn("ab_experiments", "started_at", "TEXT");
  await ensureColumn("ab_experiments", "ended_at", "TEXT");
  await run(
    "UPDATE ab_experiments SET started_at = COALESCE(started_at, created_at) WHERE started_at IS NULL"
  );
  await run(
    `
    UPDATE ab_experiments
    SET lifecycle_state =
      CASE
        WHEN lifecycle_state IS NOT NULL AND lifecycle_state != '' THEN lifecycle_state
        WHEN status = 'archived' THEN 'archived'
        WHEN status = 'rolled_out' THEN 'winner'
        WHEN status = 'active' THEN 'running'
        ELSE 'draft'
      END
  `
  );

  await run(`
    CREATE TABLE IF NOT EXISTS ab_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_id INTEGER NOT NULL,
      variant_key TEXT NOT NULL,
      name TEXT NOT NULL,
      weight REAL DEFAULT 50,
      config_json TEXT,
      is_control INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_id, variant_key),
      FOREIGN KEY(experiment_id) REFERENCES ab_experiments(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_key TEXT NOT NULL,
      session_id TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(experiment_key, session_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_key TEXT NOT NULL,
      variant_key TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS ab_rollout_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      experiment_key TEXT NOT NULL,
      action_type TEXT NOT NULL,
      reason TEXT,
      details_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(
    `INSERT OR IGNORE INTO ab_experiments (
      experiment_key, name, status, allocation_json,
      min_sample_size, min_runtime_days, min_lift_threshold,
      auto_rollout_enabled, auto_pause_enabled,
      lifecycle_state, max_runtime_days, min_learning_evaluations,
      auto_archive_enabled, auto_archive_after_days,
      started_at, updated_at
    )
     VALUES (?, ?, 'active', ?, 50, 3, 0.1, 1, 1, 'running', 30, 3, 1, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      "hero_cta_v1",
      "Hero CTA Copy Test",
      JSON.stringify({ goal: "affiliate_click", strategy: "weighted_random" })
    ]
  );

  const heroExperiment = await get(
    "SELECT id FROM ab_experiments WHERE experiment_key = ?",
    ["hero_cta_v1"]
  );

  if (heroExperiment) {
    await run(
      `INSERT OR IGNORE INTO ab_variants (experiment_id, variant_key, name, weight, config_json, is_control)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [
        heroExperiment.id,
        "control",
        "Control CTA",
        50,
        JSON.stringify({ ctaText: "Load Products" }),
        1
      ]
    );

    await run(
      `INSERT OR IGNORE INTO ab_variants (experiment_id, variant_key, name, weight, config_json, is_control)
       VALUES (?, ?, ?, ?, ?, ?)` ,
      [
        heroExperiment.id,
        "value_focus",
        "Value Focus CTA",
        50,
        JSON.stringify({ ctaText: "Find Best Value Picks" }),
        0
      ]
    );
  }

  await run("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)");
  await run("CREATE INDEX IF NOT EXISTS idx_products_score ON products(score DESC)");
  await run(
    "CREATE INDEX IF NOT EXISTS idx_price_change_product_id ON price_change_logs(product_id)"
  );
  await run("CREATE INDEX IF NOT EXISTS idx_price_change_changed_at ON price_change_logs(changed_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_product_id ON price_tracking(product_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_hot_deal ON price_tracking(is_hot_deal)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_tracking_updated_at ON price_tracking(updated_at DESC)");
  await run("CREATE INDEX IF NOT EXISTS idx_duplicate_product_id ON duplicate_events(product_id)");
  await run(
    "CREATE INDEX IF NOT EXISTS idx_click_events_product_id ON affiliate_click_events(product_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON affiliate_click_events(created_at DESC)"
  );
  await run("CREATE INDEX IF NOT EXISTS idx_shortlists_slug ON shortlists(slug)");
  await run("CREATE INDEX IF NOT EXISTS idx_shortlists_contact_email ON shortlists(contact_email)");
  await run("CREATE INDEX IF NOT EXISTS idx_newsletter_signups_email ON newsletter_signups(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_newsletter_signups_status ON newsletter_signups(status)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_alerts_email ON price_alerts(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id)");
  await run(
    "CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_behavior_events_session ON behavior_events(session_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_behavior_events_created_at ON behavior_events(created_at DESC)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_shortlist_reminders_slug ON shortlist_reminder_notifications(shortlist_slug)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_experiments_key ON ab_experiments(experiment_key)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_variants_experiment ON ab_variants(experiment_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_assignments_lookup ON ab_assignments(experiment_key, session_id)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_events_experiment_time ON ab_events(experiment_key, created_at DESC)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_events_session ON ab_events(session_id, created_at DESC)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_rollout_actions_key ON ab_rollout_actions(experiment_key, created_at DESC)"
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_ab_experiments_lifecycle ON ab_experiments(lifecycle_state)"
  );
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb,
  dbFilePath
};