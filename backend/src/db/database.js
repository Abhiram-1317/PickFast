const { Pool } = require("pg");
const sqlite3 = require("sqlite3");

const connectionString = process.env.DATABASE_URL;

let isSQLite = false;
let db = null;
let pool = null;

if (!connectionString) {
  console.log("No DATABASE_URL found. Using SQLite fallback.");
  isSQLite = true;
  db = new sqlite3.Database("./pickfast.db", (err) => {
    if (err) {
      console.error("Failed to open SQLite database:", err.message);
    } else {
      console.log("Connected to SQLite database: ./pickfast.db");
    }
  });
} else {
  pool = new Pool({
    connectionString,
    ssl: /(localhost|127\.0\.0\.1)/.test(connectionString)
      ? false
      : { rejectUnauthorized: false }
  });
}

function transformSqlForSqlite(sql) {
    if (sql.includes("ALTER TABLE products ALTER COLUMN")) return null; // Skip incompatible ALTERS
    
    // SQLite Conversions - Date Arithmetic (Must act on NOW() before it is replaced)
    sql = sql.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '-$1 days')");
    sql = sql.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*minutes?'/gi, "datetime('now', '-$1 minutes')");
    sql = sql.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*hours?'/gi, "datetime('now', '-$1 hours')");

    // Generic Conversions
    sql = sql.replace(/::[a-zA-Z0-9_]+/gi, ""); // Remove PG casts
    sql = sql.replace(/SERIAL PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT");
    sql = sql.replace(/JSONB/gi, "TEXT");
    sql = sql.replace(/TIMESTAMPTZ/gi, "DATETIME");
    sql = sql.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
    sql = sql.replace(/NUMERIC/gi, "REAL");
    sql = sql.replace(/VARCHAR\(\d+\)/gi, "TEXT");
    // sql = sql.replace(/IF NOT EXISTS/gi, "");

    return sql;
}

// Helper to convert SQLite style ? placeholders to Postgres $1, $2...
function normalizeSql(sql) {
  let i = 0;
  return isSQLite ? sql : sql.replace(/\?/g, () => `$${++i}`);
}

async function run(sql, params = []) {
  if (isSQLite) {
    const transformedSql = transformSqlForSqlite(sql);
    if (!transformedSql) return { rowCount: 0, rows: [] };

    return new Promise((resolve, reject) => {
      db.run(transformedSql, params, function (err) {
        if (err) {
           if (err.message.includes("duplicate column")) return resolve({ rowCount: 0, rows: [] });
           console.error("SQLite Run Error:", err.message, transformedSql);
           return reject(err);
        }
        resolve({ rowCount: this.changes, rows: [] });
      });
    });
  }

  const normSql = normalizeSql(sql);
  try {
    const result = await pool.query(normSql, params);
    return { rowCount: result.rowCount, rows: result.rows };
  } catch (error) {
    console.warn("Database query failed (retryable):", error.message);
    throw error;
  }
}

async function get(sql, params = []) {
  if (isSQLite) {
     const transformedSql = transformSqlForSqlite(sql);
     return new Promise((resolve, reject) => {
        db.get(transformedSql, params, (err, row) => {
           if (err) return reject(err);
           resolve(row);
        });
     });
  }
  const result = await pool.query(normalizeSql(sql), params);
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  if (isSQLite) {
     const transformedSql = transformSqlForSqlite(sql);
     return new Promise((resolve, reject) => {
        db.all(transformedSql, params, (err, rows) => {
           if (err) return reject(err);
           resolve(rows);
        });
     });
  }
  const result = await pool.query(normalizeSql(sql), params);
  return result.rows;
}

async function initDb() {
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

  if (isSQLite) {
      try { await run(`ALTER TABLE products ADD COLUMN slug TEXT`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN description TEXT`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN asin TEXT`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN brand TEXT`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN specs_json TEXT DEFAULT '{}'`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN use_cases_json TEXT DEFAULT '[]'`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'in_stock'`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN trend_score REAL DEFAULT 50`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT 0`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN commission_rate REAL DEFAULT 0`); } catch(e){}
      try { await run(`ALTER TABLE products ADD COLUMN monthly_sales_estimate INTEGER DEFAULT 0`); } catch(e){}
  } else {
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
  }

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
      session_id TEXT,
      experiment_key TEXT,
      variant TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

   await run(`
    CREATE TABLE IF NOT EXISTS behavior_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      page_path TEXT,
      element_id TEXT,
      device_type TEXT,
      session_id TEXT,
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  await run(`
     CREATE TABLE IF NOT EXISTS shortlists (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        products_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
     )
  `);
}

module.exports = {
  pool,
  run,
  get,
  all,
  initDb
};
