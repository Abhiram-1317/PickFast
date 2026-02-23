const { all, get, run } = require("./database");
const crypto = require("crypto");
const { config } = require("../config");

function mapRowToProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    price: row.price,
    originalPrice: row.original_price,
    rating: row.rating,
    reviewCount: row.review_count,
    commissionRate: row.commission_rate,
    monthlySalesEstimate: row.monthly_sales_estimate,
    stockStatus: row.stock_status,
    trendScore: row.trend_score,
    specs: row.specs_json ? JSON.parse(row.specs_json) : {},
    useCases: row.use_cases_json ? JSON.parse(row.use_cases_json) : [],
    amazonUrl: row.amazon_url,
    image: row.image,
    source: row.source,
    score: row.score,
    epcScore: row.epc_score,
    expectedRevenuePerClick: row.expected_revenue_per_click,
    estimatedCommissionValue: row.estimated_commission_value
  };
}

async function getAllProducts() {
  const rows = await all("SELECT * FROM products");
  return rows.map(mapRowToProduct);
}

async function getFilteredProducts(filters = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    minRating,
    sortBy = "score",
    order = "desc",
    limit
  } = filters;

  const where = [];
  const params = [];

  if (category) {
    where.push("category = ?");
    params.push(category);
  }
  if (minPrice !== undefined && minPrice !== null) {
    where.push("price >= ?");
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    where.push("price <= ?");
    params.push(Number(maxPrice));
  }
  if (minRating !== undefined && minRating !== null) {
    where.push("rating >= ?");
    params.push(Number(minRating));
  }

  const safeSortBy = [
    "score",
    "price",
    "rating",
    "review_count",
    "monthly_sales_estimate",
    "epc_score",
    "expected_revenue_per_click",
    "estimated_commission_value"
  ].includes(sortBy)
    ? sortBy
    : "score";
  const safeOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

  let sql = `SELECT * FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${safeSortBy} ${safeOrder}`;

  if (limit) {
    sql += " LIMIT ?";
    params.push(Number(limit));
  }

  const rows = await all(sql, params);
  return rows.map(mapRowToProduct);
}

async function getProductById(id) {
  const row = await get("SELECT * FROM products WHERE id = ?", [id]);
  return mapRowToProduct(row);
}

async function getCategories() {
  const rows = await all("SELECT DISTINCT category FROM products ORDER BY category ASC");
  return rows.map((row) => row.category);
}

async function upsertProducts(products, source = "seed") {
  for (const product of products) {
    const existing = await get("SELECT id, price FROM products WHERE id = ?", [product.id]);

    if (existing && Number(existing.price) !== Number(product.price)) {
      await run(
        `INSERT INTO price_change_logs (product_id, old_price, new_price, source) VALUES (?, ?, ?, ?)`,
        [product.id, Number(existing.price), Number(product.price), source]
      );
    }

    await run(
      `
      INSERT INTO products (
        id, name, category, brand, price, original_price, rating, review_count,
        commission_rate, monthly_sales_estimate, stock_status, trend_score,
        specs_json, use_cases_json, amazon_url, image, source, score, epc_score, expected_revenue_per_click, estimated_commission_value,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        brand = excluded.brand,
        price = excluded.price,
        original_price = excluded.original_price,
        rating = excluded.rating,
        review_count = excluded.review_count,
        commission_rate = excluded.commission_rate,
        monthly_sales_estimate = excluded.monthly_sales_estimate,
        stock_status = excluded.stock_status,
        trend_score = excluded.trend_score,
        specs_json = excluded.specs_json,
        use_cases_json = excluded.use_cases_json,
        amazon_url = excluded.amazon_url,
        image = excluded.image,
        source = excluded.source,
        score = excluded.score,
        epc_score = excluded.epc_score,
        expected_revenue_per_click = excluded.expected_revenue_per_click,
        estimated_commission_value = excluded.estimated_commission_value,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        product.id,
        product.name,
        product.category,
        product.brand || null,
        product.price,
        product.originalPrice || null,
        product.rating || 0,
        product.reviewCount || 0,
        product.commissionRate || 0,
        product.monthlySalesEstimate || 0,
        product.stockStatus || "in_stock",
        product.trendScore || 50,
        JSON.stringify(product.specs || {}),
        JSON.stringify(product.useCases || []),
        product.amazonUrl || null,
        product.image || null,
        source,
        product.score || 0,
        product.epcScore || 0,
        product.expectedRevenuePerClick || 0,
        product.estimatedCommissionValue || 0
      ]
    );
  }
}

async function writeSyncLog(log) {
  await run(
    `INSERT INTO sync_logs (status, source, imported_count, message) VALUES (?, ?, ?, ?)`,
    [log.status, log.source, log.importedCount || 0, log.message || null]
  );
}

async function writeDuplicateEvents(events = [], source = "amazon") {
  for (const event of events) {
    await run(
      `INSERT INTO duplicate_events (product_id, source, duplicate_count, context_json) VALUES (?, ?, ?, ?)`,
      [
        event.productId,
        source,
        Number(event.duplicateCount || 0),
        JSON.stringify(event.context || {})
      ]
    );
  }
}

async function getSyncLogs(limit = 20) {
  const rows = await all("SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?", [Number(limit)]);
  return rows;
}

async function getPriceChangeLogs(limit = 50) {
  const rows = await all(
    `
    SELECT pcl.*, p.name AS product_name
    FROM price_change_logs pcl
    LEFT JOIN products p ON p.id = pcl.product_id
    ORDER BY pcl.id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );
  return rows;
}

async function getDuplicateEvents(limit = 50) {
  const rows = await all(
    `
    SELECT de.*, p.name AS product_name
    FROM duplicate_events de
    LEFT JOIN products p ON p.id = de.product_id
    ORDER BY de.id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );

  return rows.map((row) => ({
    ...row,
    context: row.context_json ? JSON.parse(row.context_json) : {}
  }));
}

async function writeClickEvent(event) {
  await run(
    `
    INSERT INTO affiliate_click_events (
      product_id, page_type, placement, region, device_type,
      source_url, referrer, affiliate_url, user_agent, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      event.productId,
      event.pageType || null,
      event.placement || null,
      event.region || null,
      event.deviceType || null,
      event.sourceUrl || null,
      event.referrer || null,
      event.affiliateUrl || null,
      event.userAgent || null,
      event.ipHash || null
    ]
  );
}

async function getClickEvents(limit = 50) {
  return all(
    `
    SELECT ace.*, p.name AS product_name
    FROM affiliate_click_events ace
    LEFT JOIN products p ON p.id = ace.product_id
    ORDER BY ace.id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );
}

async function getClickSummary(days = 30) {
  const sinceExpr = `-${Number(days)} day`;

  const totals = await get(
    `
    SELECT
      COUNT(*) AS total_clicks,
      COUNT(DISTINCT product_id) AS unique_products,
      COUNT(DISTINCT region) AS active_regions
    FROM affiliate_click_events
    WHERE datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const topProducts = await all(
    `
    SELECT product_id, p.name AS product_name, COUNT(*) AS clicks
    FROM affiliate_click_events ace
    LEFT JOIN products p ON p.id = ace.product_id
    WHERE datetime(ace.created_at) >= datetime('now', ?)
    GROUP BY product_id
    ORDER BY clicks DESC
    LIMIT 10
  `,
    [sinceExpr]
  );

  const topPlacements = await all(
    `
    SELECT placement, COUNT(*) AS clicks
    FROM affiliate_click_events
    WHERE datetime(created_at) >= datetime('now', ?)
    GROUP BY placement
    ORDER BY clicks DESC
    LIMIT 10
  `,
    [sinceExpr]
  );

  const topRegions = await all(
    `
    SELECT region, COUNT(*) AS clicks
    FROM affiliate_click_events
    WHERE datetime(created_at) >= datetime('now', ?)
    GROUP BY region
    ORDER BY clicks DESC
    LIMIT 10
  `,
    [sinceExpr]
  );

  return {
    windowDays: Number(days),
    totals,
    topProducts,
    topPlacements,
    topRegions
  };
}

function generateShortlistSlug() {
  return `sl-${Math.random().toString(36).slice(2, 10)}`;
}

async function createShortlist(payload) {
  const slug = generateShortlistSlug();
  await run(
    `
    INSERT INTO shortlists (slug, name, product_ids_json, contact_email, region, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,
    [
      slug,
      payload.name || "My shortlist",
      JSON.stringify(payload.productIds || []),
      payload.contactEmail || null,
      payload.region || null
    ]
  );

  return getShortlistBySlug(slug);
}

async function updateShortlistBySlug(slug, payload) {
  await run(
    `
    UPDATE shortlists
    SET name = ?, product_ids_json = ?, contact_email = ?, region = ?, updated_at = CURRENT_TIMESTAMP
    WHERE slug = ?
  `,
    [
      payload.name || "My shortlist",
      JSON.stringify(payload.productIds || []),
      payload.contactEmail || null,
      payload.region || null,
      slug
    ]
  );

  return getShortlistBySlug(slug);
}

async function getShortlistBySlug(slug) {
  const row = await get("SELECT * FROM shortlists WHERE slug = ?", [slug]);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    productIds: row.product_ids_json ? JSON.parse(row.product_ids_json) : [],
    contactEmail: row.contact_email,
    region: row.region,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createPriceAlert(payload) {
  const result = await run(
    `
    INSERT INTO price_alerts (
      email, product_id, target_price, region, status, updated_at
    ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
  `,
    [payload.email, payload.productId, payload.targetPrice, payload.region || null]
  );

  return getPriceAlertById(result.lastID);
}

async function getPriceAlertById(id) {
  return get(
    `
    SELECT pa.*, p.name AS product_name, p.price AS current_price
    FROM price_alerts pa
    LEFT JOIN products p ON p.id = pa.product_id
    WHERE pa.id = ?
  `,
    [id]
  );
}

async function getPriceAlerts(limit = 100) {
  return all(
    `
    SELECT pa.*, p.name AS product_name, p.price AS current_price
    FROM price_alerts pa
    LEFT JOIN products p ON p.id = pa.product_id
    ORDER BY pa.id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );
}

async function getAlertNotifications(limit = 100) {
  return all(
    `
    SELECT an.*, p.name AS product_name
    FROM alert_notifications an
    LEFT JOIN products p ON p.id = an.product_id
    ORDER BY an.id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );
}

async function evaluatePriceAlerts() {
  const activeAlerts = await all(
    `
    SELECT pa.*, p.price AS current_price, p.name AS product_name
    FROM price_alerts pa
    LEFT JOIN products p ON p.id = pa.product_id
    WHERE pa.status = 'active'
  `
  );

  let triggeredCount = 0;

  for (const alert of activeAlerts) {
    if (alert.current_price === null || alert.current_price === undefined) {
      continue;
    }

    const currentPrice = Number(alert.current_price);
    const targetPrice = Number(alert.target_price);

    if (currentPrice <= targetPrice) {
      await run(
        `
        INSERT INTO alert_notifications (
          alert_id, product_id, email, target_price, current_price, message, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `,
        [
          alert.id,
          alert.product_id,
          alert.email,
          targetPrice,
          currentPrice,
          `${alert.product_name || alert.product_id} dropped to ${currentPrice} (target ${targetPrice})`
        ]
      );

      await run(
        `
        UPDATE price_alerts
        SET status = 'triggered', last_triggered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [alert.id]
      );

      triggeredCount += 1;
    }
  }

  return {
    scanned: activeAlerts.length,
    triggered: triggeredCount
  };
}

async function writeBehaviorEvent(payload) {
  await run(
    `
    INSERT INTO behavior_events (
      session_id, event_type, product_id, category, price, region, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [
      payload.sessionId,
      payload.eventType,
      payload.productId || null,
      payload.category || null,
      payload.price !== undefined && payload.price !== null ? Number(payload.price) : null,
      payload.region || null,
      JSON.stringify(payload.metadata || {})
    ]
  );
}

async function getBehaviorEvents(sessionId, limit = 200) {
  const rows = await all(
    `
    SELECT *
    FROM behavior_events
    WHERE session_id = ?
    ORDER BY id DESC
    LIMIT ?
  `,
    [sessionId, Number(limit)]
  );

  return rows.map((row) => ({
    ...row,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
  }));
}

async function upsertUserProfile(profile) {
  await run(
    `
    INSERT INTO user_profiles (
      session_id, top_categories_json, preferred_price, preferred_region, confidence_score, updated_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(session_id) DO UPDATE SET
      top_categories_json = excluded.top_categories_json,
      preferred_price = excluded.preferred_price,
      preferred_region = excluded.preferred_region,
      confidence_score = excluded.confidence_score,
      updated_at = CURRENT_TIMESTAMP
  `,
    [
      profile.sessionId,
      JSON.stringify(profile.topCategories || []),
      profile.preferredPrice || null,
      profile.preferredRegion || null,
      profile.confidenceScore || 0
    ]
  );
}

async function getUserProfile(sessionId) {
  const row = await get("SELECT * FROM user_profiles WHERE session_id = ?", [sessionId]);
  if (!row) {
    return null;
  }

  return {
    sessionId: row.session_id,
    topCategories: row.top_categories_json ? JSON.parse(row.top_categories_json) : [],
    preferredPrice: row.preferred_price,
    preferredRegion: row.preferred_region,
    confidenceScore: row.confidence_score,
    updatedAt: row.updated_at
  };
}

async function evaluateAbandonedShortlistReminders(hours = 24) {
  const cutoff = `-${Number(hours)} hour`;

  const candidates = await all(
    `
    SELECT s.*
    FROM shortlists s
    WHERE s.contact_email IS NOT NULL
      AND s.contact_email != ''
      AND datetime(s.updated_at) <= datetime('now', ?)
      AND NOT EXISTS (
        SELECT 1 FROM shortlist_reminder_notifications rn
        WHERE rn.shortlist_slug = s.slug
          AND datetime(rn.created_at) >= datetime('now', '-24 hour')
      )
  `,
    [cutoff]
  );

  let created = 0;

  for (const shortlist of candidates) {
    const productIds = shortlist.product_ids_json ? JSON.parse(shortlist.product_ids_json) : [];
    const preview = productIds.slice(0, 3).join(", ");
    const message = `Reminder: shortlist ${shortlist.name || shortlist.slug} is waiting. Products: ${preview}`;

    await run(
      `
      INSERT INTO shortlist_reminder_notifications (shortlist_slug, contact_email, message, status)
      VALUES (?, ?, ?, 'pending')
    `,
      [shortlist.slug, shortlist.contact_email, message]
    );

    created += 1;
  }

  return {
    scanned: candidates.length,
    created
  };
}

async function getShortlistReminderNotifications(limit = 100) {
  return all(
    `
    SELECT *
    FROM shortlist_reminder_notifications
    ORDER BY id DESC
    LIMIT ?
  `,
    [Number(limit)]
  );
}

function stableBucket(input) {
  const hash = crypto.createHash("sha256").update(String(input)).digest("hex");
  const numeric = Number.parseInt(hash.slice(0, 8), 16);
  return (numeric % 10000) / 10000;
}

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

const allowedLifecycleStates = new Set(["draft", "running", "learning", "winner", "archived"]);

function normalizeLifecycleState(value) {
  const normalized = String(value || "").toLowerCase();
  if (allowedLifecycleStates.has(normalized)) {
    return normalized;
  }
  return "draft";
}

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));

  return sign * y;
}

function normalCdf(z) {
  return 0.5 * (1 + erfApprox(z / Math.SQRT2));
}

function twoProportionZTest({ controlSuccesses, controlTrials, variantSuccesses, variantTrials }) {
  const n1 = Number(controlTrials || 0);
  const n2 = Number(variantTrials || 0);

  if (n1 <= 0 || n2 <= 0) {
    return {
      zScore: 0,
      pValueOneTailed: 1,
      pValueTwoTailed: 1,
      isValid: false
    };
  }

  const p1 = Number(controlSuccesses || 0) / n1;
  const p2 = Number(variantSuccesses || 0) / n2;
  const pooled = (Number(controlSuccesses || 0) + Number(variantSuccesses || 0)) / (n1 + n2);
  const standardError = Math.sqrt(Math.max(pooled * (1 - pooled) * (1 / n1 + 1 / n2), 0));

  if (standardError === 0) {
    return {
      zScore: 0,
      pValueOneTailed: 1,
      pValueTwoTailed: 1,
      isValid: false
    };
  }

  const zScore = (p2 - p1) / standardError;
  const pValueOneTailed = 1 - normalCdf(zScore);
  const pValueTwoTailed = 2 * (1 - normalCdf(Math.abs(zScore)));

  return {
    zScore,
    pValueOneTailed,
    pValueTwoTailed,
    isValid: true
  };
}

function bayesianBeatProbabilityApprox({
  controlSuccesses,
  controlTrials,
  variantSuccesses,
  variantTrials,
  priorAlpha,
  priorBeta
}) {
  const alphaPrior = Number(priorAlpha || 1);
  const betaPrior = Number(priorBeta || 1);

  const a1 = alphaPrior + Number(controlSuccesses || 0);
  const b1 = betaPrior + Math.max(Number(controlTrials || 0) - Number(controlSuccesses || 0), 0);
  const a2 = alphaPrior + Number(variantSuccesses || 0);
  const b2 = betaPrior + Math.max(Number(variantTrials || 0) - Number(variantSuccesses || 0), 0);

  const mean1 = a1 / (a1 + b1);
  const mean2 = a2 / (a2 + b2);
  const var1 = (a1 * b1) / ((a1 + b1) ** 2 * (a1 + b1 + 1));
  const var2 = (a2 * b2) / ((a2 + b2) ** 2 * (a2 + b2 + 1));

  const meanDiff = mean2 - mean1;
  const stdDiff = Math.sqrt(Math.max(var1 + var2, 1e-12));
  const z = meanDiff / stdDiff;
  const probabilityVariantBeatsControl = normalCdf(z);

  return {
    probabilityVariantBeatsControl,
    posteriorControl: { alpha: a1, beta: b1, mean: mean1 },
    posteriorVariant: { alpha: a2, beta: b2, mean: mean2 }
  };
}

function computeSignificanceDecision({ control, candidate }) {
  if (!control || !candidate) {
    return {
      alpha: config.experiments.significanceAlpha,
      requiredBayesianProbability: config.experiments.bayesianMinProbability,
      zScore: 0,
      pValueOneTailed: 1,
      pValueTwoTailed: 1,
      bayesianBeatProbability: 0,
      isSignificant: false,
      passesBayesian: false,
      isRolloutEligible: false
    };
  }

  const zResult = twoProportionZTest({
    controlSuccesses: control.conversions,
    controlTrials: control.impressions,
    variantSuccesses: candidate.conversions,
    variantTrials: candidate.impressions
  });

  const bayesian = bayesianBeatProbabilityApprox({
    controlSuccesses: control.conversions,
    controlTrials: control.impressions,
    variantSuccesses: candidate.conversions,
    variantTrials: candidate.impressions,
    priorAlpha: config.experiments.bayesianPriorAlpha,
    priorBeta: config.experiments.bayesianPriorBeta
  });

  const alpha = Number(config.experiments.significanceAlpha || 0.05);
  const requiredBayesianProbability = Number(
    config.experiments.bayesianMinProbability || 0.95
  );
  const isSignificant = zResult.isValid && zResult.pValueOneTailed <= alpha;
  const passesBayesian =
    bayesian.probabilityVariantBeatsControl >= requiredBayesianProbability;

  return {
    alpha,
    requiredBayesianProbability,
    zScore: zResult.zScore,
    pValueOneTailed: zResult.pValueOneTailed,
    pValueTwoTailed: zResult.pValueTwoTailed,
    bayesianBeatProbability: bayesian.probabilityVariantBeatsControl,
    posteriorControl: bayesian.posteriorControl,
    posteriorVariant: bayesian.posteriorVariant,
    isSignificant,
    passesBayesian,
    isRolloutEligible: isSignificant && passesBayesian
  };
}

function randomNormal() {
  let first = 0;
  let second = 0;

  while (first === 0) {
    first = Math.random();
  }
  while (second === 0) {
    second = Math.random();
  }

  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function sampleGamma(shape) {
  if (shape <= 0) {
    return 0;
  }

  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const coefficient = shape - 1 / 3;
  const correction = 1 / Math.sqrt(9 * coefficient);

  while (true) {
    const normal = randomNormal();
    const value = 1 + correction * normal;
    if (value <= 0) {
      continue;
    }

    const cube = value ** 3;
    const uniform = Math.random();
    if (uniform < 1 - 0.0331 * (normal ** 4)) {
      return coefficient * cube;
    }
    if (Math.log(uniform) < 0.5 * normal * normal + coefficient * (1 - cube + Math.log(cube))) {
      return coefficient * cube;
    }
  }
}

function sampleBeta(alpha, beta) {
  const gammaAlpha = sampleGamma(Math.max(alpha, 0.0001));
  const gammaBeta = sampleGamma(Math.max(beta, 0.0001));
  const denominator = gammaAlpha + gammaBeta;
  if (denominator <= 0) {
    return 0.5;
  }

  return gammaAlpha / denominator;
}

function chooseBanditVariant(candidates) {
  if (!candidates.length) {
    return null;
  }

  const explorationRate = Math.min(Math.max(config.experiments.banditExplorationRate, 0), 0.5);
  if (Math.random() < explorationRate) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    return {
      ...chosen,
      sampledScore: null,
      selectionMode: "explore"
    };
  }

  let best = null;
  for (const candidate of candidates) {
    const sampledScore = sampleBeta(candidate.posteriorAlpha, candidate.posteriorBeta);
    if (!best || sampledScore > best.sampledScore) {
      best = {
        ...candidate,
        sampledScore,
        selectionMode: "thompson"
      };
    }
  }

  return best;
}

async function selectVariantByBandit(experimentKey, experiment, sessionId) {
  const strategy = String(experiment.allocation?.strategy || "weighted_random").toLowerCase();
  if (strategy !== "thompson_sampling") {
    return null;
  }

  const statsRows = await getExperimentLifetimeStats(experimentKey);
  const statsMap = new Map(statsRows.map((row) => [row.variantKey, row]));
  const variants = experiment.variants.map((variant) => ({
    variant,
    impressions: Number(statsMap.get(variant.key)?.impressions || 0),
    conversions: Number(statsMap.get(variant.key)?.conversions || 0),
    conversionRate: Number(statsMap.get(variant.key)?.conversionRate || 0)
  }));

  const totalImpressions = variants.reduce((sum, item) => sum + item.impressions, 0);
  if (totalImpressions < config.experiments.banditWarmupMinImpressions) {
    return null;
  }

  const controlEntry = variants.find((item) => item.variant.isControl) || variants[0];
  if (!controlEntry) {
    return null;
  }

  const priorAlpha = Number(config.experiments.bayesianPriorAlpha || 1);
  const priorBeta = Number(config.experiments.bayesianPriorBeta || 1);

  const significanceQualified = variants.filter((entry) => {
    if (entry.variant.key === controlEntry.variant.key) {
      return false;
    }

    const significance = computeSignificanceDecision({
      control: {
        conversions: controlEntry.conversions,
        impressions: controlEntry.impressions
      },
      candidate: {
        conversions: entry.conversions,
        impressions: entry.impressions
      }
    });

    return significance.isRolloutEligible;
  });

  if (!significanceQualified.length) {
    return null;
  }

  const candidateSet = [controlEntry, ...significanceQualified].map((entry) => {
    const posteriorAlpha = priorAlpha + entry.conversions;
    const posteriorBeta = priorBeta + Math.max(entry.impressions - entry.conversions, 0);
    return {
      variant: entry.variant,
      posteriorAlpha,
      posteriorBeta,
      impressions: entry.impressions,
      conversions: entry.conversions,
      conversionRate: entry.conversionRate
    };
  });

  const chosen = chooseBanditVariant(candidateSet);
  if (!chosen?.variant) {
    return null;
  }

  return {
    variant: chosen.variant,
    metadata: {
      strategy,
      selectionMode: chosen.selectionMode,
      sampledScore: chosen.sampledScore,
      candidateCount: candidateSet.length,
      totalImpressions,
      significanceQualified: significanceQualified.map((entry) => entry.variant.key)
    }
  };
}

async function getExperimentByKey(experimentKey) {
  const experiment = await get(
    `
    SELECT *
    FROM ab_experiments
    WHERE experiment_key = ?
  `,
    [experimentKey]
  );

  if (!experiment) {
    return null;
  }

  const variants = await all(
    `
    SELECT *
    FROM ab_variants
    WHERE experiment_id = ?
    ORDER BY id ASC
  `,
    [experiment.id]
  );

  return {
    id: experiment.id,
    key: experiment.experiment_key,
    name: experiment.name,
    status: experiment.status,
    lifecycleState: normalizeLifecycleState(experiment.lifecycle_state || "running"),
    winnerVariantKey: experiment.winner_variant_key,
    minSampleSize: Number(experiment.min_sample_size || config.experiments.defaultMinSampleSize),
    minRuntimeDays: Number(experiment.min_runtime_days || config.experiments.defaultMinRuntimeDays),
    maxRuntimeDays: Number(experiment.max_runtime_days || config.experiments.defaultMaxRuntimeDays),
    minLearningEvaluations: Number(
      experiment.min_learning_evaluations || config.experiments.minLearningEvaluations
    ),
    evaluationsCount: Number(experiment.evaluations_count || 0),
    minLiftThreshold: Number(
      experiment.min_lift_threshold || config.experiments.defaultMinLiftThreshold
    ),
    autoRolloutEnabled: Boolean(experiment.auto_rollout_enabled),
    autoPauseEnabled: Boolean(experiment.auto_pause_enabled),
    autoArchiveEnabled: Boolean(experiment.auto_archive_enabled),
    autoArchiveAfterDays: Number(
      experiment.auto_archive_after_days || config.experiments.autoArchiveAfterDays
    ),
    pausedReason: experiment.paused_reason || null,
    startedAt: experiment.started_at || experiment.created_at,
    endedAt: experiment.ended_at || null,
    allocation: parseJson(experiment.allocation_json, {}),
    variants: variants.map((variant) => ({
      id: variant.id,
      key: variant.variant_key,
      name: variant.name,
      weight: Number(variant.weight || 0),
      config: parseJson(variant.config_json, {}),
      isControl: Boolean(variant.is_control)
    }))
  };
}

async function getActiveExperimentByKey(experimentKey) {
  const experiment = await getExperimentByKey(experimentKey);
  if (!experiment) {
    return null;
  }

  return experiment.status === "active" ? experiment : null;
}

async function getAssignableExperimentByKey(experimentKey) {
  const experiment = await getExperimentByKey(experimentKey);
  if (!experiment) {
    return null;
  }

  if (["draft", "archived"].includes(experiment.lifecycleState)) {
    return null;
  }

  if (!["active", "rolled_out"].includes(experiment.status)) {
    return null;
  }

  return experiment;
}

function pickVariantForSession(experimentKey, sessionId, variants = []) {
  if (!variants.length) {
    return null;
  }

  const totalWeight = variants.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (totalWeight <= 0) {
    return variants[0];
  }

  const bucket = stableBucket(`${experimentKey}:${sessionId}`) * totalWeight;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += Number(variant.weight || 0);
    if (bucket <= cumulative) {
      return variant;
    }
  }

  return variants[variants.length - 1];
}

async function assignExperimentVariant({ experimentKey, sessionId }) {
  const experiment = await getAssignableExperimentByKey(experimentKey);
  if (!experiment) {
    return {
      experimentKey,
      sessionId,
      variantKey: "control",
      variantConfig: { ctaText: "Load Products" },
      assignedAt: new Date().toISOString(),
      isFallback: true
    };
  }

  const existing = await get(
    `
    SELECT *
    FROM ab_assignments
    WHERE experiment_key = ?
      AND session_id = ?
  `,
    [experimentKey, sessionId]
  );

  if (existing) {
    const variant = experiment.variants.find((item) => item.key === existing.variant_key);
    return {
      experimentKey,
      sessionId,
      variantKey: existing.variant_key,
      variantConfig: variant?.config || {},
      assignedAt: existing.assigned_at,
      isFallback: false
    };
  }

  const rolloutWinner = experiment.winnerVariantKey
    ? experiment.variants.find((item) => item.key === experiment.winnerVariantKey)
    : null;

  const banditSelection =
    experiment.status === "active"
      ? await selectVariantByBandit(experimentKey, experiment, sessionId)
      : null;

  const chosen =
    experiment.status === "rolled_out" && rolloutWinner
      ? rolloutWinner
      : banditSelection?.variant || pickVariantForSession(experimentKey, sessionId, experiment.variants);
  await run(
    `
    INSERT INTO ab_assignments (experiment_key, session_id, variant_key)
    VALUES (?, ?, ?)
    ON CONFLICT(experiment_key, session_id) DO NOTHING
  `,
    [experimentKey, sessionId, chosen?.key || "control"]
  );

  const created = await get(
    `
    SELECT *
    FROM ab_assignments
    WHERE experiment_key = ?
      AND session_id = ?
  `,
    [experimentKey, sessionId]
  );

  const variant = experiment.variants.find((item) => item.key === created?.variant_key);

  return {
    experimentKey,
    sessionId,
    variantKey: created?.variant_key || "control",
    variantConfig: variant?.config || {},
    assignedAt: created?.assigned_at || new Date().toISOString(),
    allocation: {
      strategy:
        experiment.status === "rolled_out" && rolloutWinner
          ? "rolled_out"
          : banditSelection?.metadata?.strategy ||
            String(experiment.allocation?.strategy || "weighted_random").toLowerCase(),
      details: banditSelection?.metadata || null
    },
    isFallback: false
  };
}

async function writeExperimentEvent(payload) {
  await run(
    `
    INSERT INTO ab_events (experiment_key, variant_key, session_id, event_type, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      payload.experimentKey,
      payload.variantKey,
      payload.sessionId,
      payload.eventType,
      JSON.stringify(payload.metadata || {})
    ]
  );
}

async function getExperimentSummary(experimentKey, days = 14) {
  const sinceExpr = `-${Number(days)} day`;
  const experiment = await getExperimentByKey(experimentKey);

  const rows = await all(
    `
    SELECT
      variant_key,
      SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
      SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS cta_clicks,
      SUM(CASE WHEN event_type = 'affiliate_click' THEN 1 ELSE 0 END) AS conversions
    FROM ab_events
    WHERE experiment_key = ?
      AND datetime(created_at) >= datetime('now', ?)
    GROUP BY variant_key
    ORDER BY variant_key ASC
  `,
    [experimentKey, sinceExpr]
  );

  const rowsMap = new Map(rows.map((row) => [row.variant_key, row]));
  const variantsFromExperiment = (experiment?.variants || []).map((variant) => {
    const row = rowsMap.get(variant.key);
    const impressions = Number(row?.impressions || 0);
    const ctaClicks = Number(row?.cta_clicks || 0);
    const conversions = Number(row?.conversions || 0);

    return {
      variantKey: variant.key,
      variantName: variant.name || variant.key,
      isControl: Boolean(variant.isControl),
      impressions,
      ctaClicks,
      conversions,
      ctr: impressions > 0 ? ctaClicks / impressions : 0,
      conversionRate: impressions > 0 ? conversions / impressions : 0,
      clickToConversionRate: ctaClicks > 0 ? conversions / ctaClicks : 0
    };
  });

  const variants = variantsFromExperiment.length
    ? variantsFromExperiment
    : rows.map((row) => {
        const impressions = Number(row.impressions || 0);
        const ctaClicks = Number(row.cta_clicks || 0);
        const conversions = Number(row.conversions || 0);
        return {
          variantKey: row.variant_key,
          variantName: row.variant_key,
          isControl: false,
          impressions,
          ctaClicks,
          conversions,
          ctr: impressions > 0 ? ctaClicks / impressions : 0,
          conversionRate: impressions > 0 ? conversions / impressions : 0,
          clickToConversionRate: ctaClicks > 0 ? conversions / ctaClicks : 0
        };
      });

  const control = variants.find((variant) => variant.isControl) || variants[0] || null;

  const variantsWithSignificance = variants.map((variant) => {
    if (!control || variant.variantKey === control.variantKey) {
      return {
        ...variant,
        liftVsControl: 0,
        significance: null
      };
    }

    const baseline = Math.max(control.conversionRate, 0.0001);
    const liftVsControl = (variant.conversionRate - control.conversionRate) / baseline;
    const significance = computeSignificanceDecision({
      control,
      candidate: variant
    });

    return {
      ...variant,
      liftVsControl,
      significance
    };
  });

  return {
    experimentKey,
    windowDays: Number(days),
    status: experiment?.status || "unknown",
    lifecycleState: experiment?.lifecycleState || "draft",
    winnerVariantKey: experiment?.winnerVariantKey || null,
    dynamicStopCriteria: {
      minRuntimeDays: experiment?.minRuntimeDays || config.experiments.defaultMinRuntimeDays,
      maxRuntimeDays: experiment?.maxRuntimeDays || config.experiments.defaultMaxRuntimeDays,
      minSampleSize: experiment?.minSampleSize || config.experiments.defaultMinSampleSize,
      minLearningEvaluations:
        experiment?.minLearningEvaluations || config.experiments.minLearningEvaluations,
      autoArchiveAfterDays:
        experiment?.autoArchiveAfterDays || config.experiments.autoArchiveAfterDays,
      evaluationsCount: experiment?.evaluationsCount || 0
    },
    significanceModel: {
      alpha: config.experiments.significanceAlpha,
      bayesianMinProbability: config.experiments.bayesianMinProbability,
      bayesianPriorAlpha: config.experiments.bayesianPriorAlpha,
      bayesianPriorBeta: config.experiments.bayesianPriorBeta
    },
    variants: variantsWithSignificance
  };
}

async function writeExperimentActionLog(payload) {
  await run(
    `
    INSERT INTO ab_rollout_actions (experiment_key, action_type, reason, details_json)
    VALUES (?, ?, ?, ?)
  `,
    [
      payload.experimentKey,
      payload.actionType,
      payload.reason || null,
      JSON.stringify(payload.details || {})
    ]
  );
}

function daysBetween(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const milliseconds = endDate.getTime() - start.getTime();
  return milliseconds / (1000 * 60 * 60 * 24);
}

async function getExperimentLifetimeStats(experimentKey) {
  const rows = await all(
    `
    SELECT
      variant_key,
      SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
      SUM(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS cta_clicks,
      SUM(CASE WHEN event_type = 'affiliate_click' THEN 1 ELSE 0 END) AS conversions
    FROM ab_events
    WHERE experiment_key = ?
    GROUP BY variant_key
  `,
    [experimentKey]
  );

  return rows.map((row) => {
    const impressions = Number(row.impressions || 0);
    const ctaClicks = Number(row.cta_clicks || 0);
    const conversions = Number(row.conversions || 0);

    return {
      variantKey: row.variant_key,
      impressions,
      ctaClicks,
      conversions,
      ctr: impressions > 0 ? ctaClicks / impressions : 0,
      conversionRate: impressions > 0 ? conversions / impressions : 0
    };
  });
}

async function evaluateExperimentRollout(experimentKey) {
  const experiment = await getExperimentByKey(experimentKey);
  if (!experiment) {
    return {
      ok: false,
      experimentKey,
      action: "none",
      reason: "experiment_not_found"
    };
  }

  if (experiment.lifecycleState === "draft") {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "experiment_in_draft",
      status: experiment.status,
      lifecycleState: experiment.lifecycleState
    };
  }

  if (experiment.lifecycleState === "archived") {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "experiment_archived",
      status: experiment.status,
      lifecycleState: experiment.lifecycleState
    };
  }

  if (!["active", "rolled_out"].includes(experiment.status)) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: `experiment_${experiment.status}`,
      status: experiment.status,
      lifecycleState: experiment.lifecycleState
    };
  }

  const runtimeDays = daysBetween(experiment.startedAt);

  if (experiment.lifecycleState === "winner" && experiment.autoArchiveEnabled) {
    const winnerAgeDays = experiment.endedAt ? daysBetween(experiment.endedAt) : 0;
    if (winnerAgeDays >= experiment.autoArchiveAfterDays) {
      const reason = `Auto-archived winner after ${winnerAgeDays.toFixed(1)} days`;
      await run(
        `
        UPDATE ab_experiments
        SET status = 'archived', lifecycle_state = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE experiment_key = ?
      `,
        [experimentKey]
      );

      await writeExperimentActionLog({
        experimentKey,
        actionType: "auto_archive",
        reason,
        details: {
          winnerVariantKey: experiment.winnerVariantKey,
          winnerAgeDays,
          autoArchiveAfterDays: experiment.autoArchiveAfterDays
        }
      });

      return {
        ok: true,
        experimentKey,
        action: "auto_archive",
        reason,
        status: "archived",
        lifecycleState: "archived"
      };
    }
  }

  if (experiment.status === "rolled_out" || experiment.lifecycleState === "winner") {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "already_rolled_out",
      status: experiment.status,
      lifecycleState: experiment.lifecycleState,
      winnerVariantKey: experiment.winnerVariantKey || null
    };
  }

  if (runtimeDays >= experiment.maxRuntimeDays) {
    const reason = `Auto-archived after max runtime ${experiment.maxRuntimeDays} days`;

    await run(
      `
      UPDATE ab_experiments
      SET status = 'archived', lifecycle_state = 'archived', ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE experiment_key = ?
    `,
      [experimentKey]
    );

    await writeExperimentActionLog({
      experimentKey,
      actionType: "auto_archive_max_runtime",
      reason,
      details: {
        runtimeDays,
        maxRuntimeDays: experiment.maxRuntimeDays
      }
    });

    return {
      ok: true,
      experimentKey,
      action: "auto_archive_max_runtime",
      reason,
      status: "archived",
      lifecycleState: "archived"
    };
  }

  if (experiment.lifecycleState === "running" && runtimeDays >= experiment.minRuntimeDays) {
    await run(
      `
      UPDATE ab_experiments
      SET lifecycle_state = 'learning', updated_at = CURRENT_TIMESTAMP
      WHERE experiment_key = ?
    `,
      [experimentKey]
    );

    await writeExperimentActionLog({
      experimentKey,
      actionType: "lifecycle_transition",
      reason: "Transitioned from running to learning after minimum runtime",
      details: {
        from: "running",
        to: "learning",
        runtimeDays,
        minRuntimeDays: experiment.minRuntimeDays
      }
    });

    experiment.lifecycleState = "learning";
  }

  if (experiment.lifecycleState === "running") {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "running_collecting_data",
      runtimeDays,
      minRuntimeDays: experiment.minRuntimeDays,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status
    };
  }

  if (runtimeDays < experiment.minRuntimeDays) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "min_runtime_not_reached",
      runtimeDays,
      minRuntimeDays: experiment.minRuntimeDays,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status
    };
  }

  await run(
    `
    UPDATE ab_experiments
    SET evaluations_count = COALESCE(evaluations_count, 0) + 1, updated_at = CURRENT_TIMESTAMP
    WHERE experiment_key = ?
  `,
    [experimentKey]
  );
  experiment.evaluationsCount += 1;

  const statsRows = await getExperimentLifetimeStats(experimentKey);
  const statsMap = new Map(statsRows.map((row) => [row.variantKey, row]));
  const normalizedStats = experiment.variants.map((variant) => ({
    variantKey: variant.key,
    variantName: variant.name,
    isControl: Boolean(variant.isControl),
    impressions: Number(statsMap.get(variant.key)?.impressions || 0),
    ctaClicks: Number(statsMap.get(variant.key)?.ctaClicks || 0),
    conversions: Number(statsMap.get(variant.key)?.conversions || 0),
    ctr: Number(statsMap.get(variant.key)?.ctr || 0),
    conversionRate: Number(statsMap.get(variant.key)?.conversionRate || 0)
  }));

  const minSampleReached = normalizedStats.every(
    (variant) => variant.impressions >= experiment.minSampleSize
  );

  if (!minSampleReached) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "min_sample_not_reached",
      minSampleSize: experiment.minSampleSize,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  const control = normalizedStats.find((variant) => variant.isControl) || normalizedStats[0];

  if (experiment.autoPauseEnabled && control && control.ctr > 0) {
    const underperformers = normalizedStats.filter(
      (variant) =>
        !variant.isControl &&
        variant.impressions >= experiment.minSampleSize &&
        variant.ctr < control.ctr * (1 - config.experiments.autoPauseDropThreshold)
    );

    if (underperformers.length > 0) {
      const reason = `Auto-paused: ${underperformers
        .map((item) => item.variantKey)
        .join(", ")} underperformed control CTR by >= ${Math.round(
        config.experiments.autoPauseDropThreshold * 100
      )}%`;

      await run(
        `
        UPDATE ab_experiments
        SET status = 'paused', paused_reason = ?, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE experiment_key = ?
      `,
        [reason, experimentKey]
      );

      await writeExperimentActionLog({
        experimentKey,
        actionType: "auto_pause",
        reason,
        details: {
          controlVariant: control.variantKey,
          underperformers
        }
      });

      return {
        ok: true,
        experimentKey,
        action: "auto_pause",
        reason,
        status: "paused",
        lifecycleState: experiment.lifecycleState,
        stats: normalizedStats
      };
    }
  }

  if (!experiment.autoRolloutEnabled || !control) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "auto_rollout_disabled",
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  const winner = [...normalizedStats].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  if (!winner) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "no_variant_stats"
    };
  }

  const baseline = Math.max(control.conversionRate, 0.0001);
  const lift = (winner.conversionRate - control.conversionRate) / baseline;

  if (winner.variantKey === control.variantKey) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "control_is_best",
      observedLift: 0,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  if (lift < experiment.minLiftThreshold) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "lift_below_threshold",
      observedLift: lift,
      minLiftThreshold: experiment.minLiftThreshold,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  const significance = computeSignificanceDecision({
    control,
    candidate: winner
  });

  if (!significance.isRolloutEligible) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "significance_not_reached",
      observedLift: lift,
      significance,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  if (experiment.evaluationsCount < experiment.minLearningEvaluations) {
    return {
      ok: true,
      experimentKey,
      action: "none",
      reason: "min_learning_evaluations_not_reached",
      evaluationsCount: experiment.evaluationsCount,
      minLearningEvaluations: experiment.minLearningEvaluations,
      observedLift: lift,
      significance,
      lifecycleState: experiment.lifecycleState,
      status: experiment.status,
      stats: normalizedStats
    };
  }

  await run(
    `
    UPDATE ab_variants
    SET weight = CASE WHEN variant_key = ? THEN 100 ELSE 0 END
    WHERE experiment_id = ?
  `,
    [winner.variantKey, experiment.id]
  );

  await run(
    `
    UPDATE ab_experiments
    SET status = 'rolled_out', lifecycle_state = 'winner', winner_variant_key = ?, paused_reason = NULL, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE experiment_key = ?
  `,
    [winner.variantKey, experimentKey]
  );

  await writeExperimentActionLog({
    experimentKey,
    actionType: "auto_rollout",
    reason: `Winner ${winner.variantKey} rolled out at lift ${(lift * 100).toFixed(2)}% with p=${significance.pValueOneTailed.toFixed(4)} and bayes=${(significance.bayesianBeatProbability * 100).toFixed(2)}%`,
    details: {
      winner,
      control,
      lift,
      significance,
      minLiftThreshold: experiment.minLiftThreshold
    }
  });

  return {
    ok: true,
    experimentKey,
    action: "auto_rollout",
    status: "rolled_out",
    lifecycleState: "winner",
    winnerVariantKey: winner.variantKey,
    observedLift: lift,
    significance,
    stats: normalizedStats
  };
}

async function updateExperimentLifecycle(experimentKey, lifecycleState, reason = "") {
  const nextState = normalizeLifecycleState(lifecycleState);
  const existing = await getExperimentByKey(experimentKey);
  if (!existing) {
    return null;
  }

  let status = existing.status;
  let endedAtClause = "ended_at";
  let endedAtValue = existing.endedAt;

  if (nextState === "draft" || nextState === "running" || nextState === "learning") {
    status = "active";
    endedAtClause = "NULL";
    endedAtValue = null;
  }
  if (nextState === "winner") {
    status = "rolled_out";
    endedAtClause = "COALESCE(ended_at, CURRENT_TIMESTAMP)";
  }
  if (nextState === "archived") {
    status = "archived";
    endedAtClause = "COALESCE(ended_at, CURRENT_TIMESTAMP)";
  }

  await run(
    `
    UPDATE ab_experiments
    SET status = ?, lifecycle_state = ?,
        ended_at = ${endedAtClause},
        updated_at = CURRENT_TIMESTAMP
    WHERE experiment_key = ?
  `,
    [status, nextState, experimentKey]
  );

  await writeExperimentActionLog({
    experimentKey,
    actionType: "lifecycle_admin_update",
    reason: reason || `Lifecycle changed to ${nextState}`,
    details: {
      fromLifecycleState: existing.lifecycleState,
      toLifecycleState: nextState,
      fromStatus: existing.status,
      toStatus: status,
      previousEndedAt: existing.endedAt || null,
      nextEndedAt: endedAtValue
    }
  });

  return getExperimentByKey(experimentKey);
}

async function updateExperimentGuardrails(experimentKey, payload = {}) {
  const existing = await getExperimentByKey(experimentKey);
  if (!existing) {
    return null;
  }

  const minSampleSize =
    payload.minSampleSize !== undefined
      ? Number(payload.minSampleSize)
      : existing.minSampleSize;
  const minRuntimeDays =
    payload.minRuntimeDays !== undefined
      ? Number(payload.minRuntimeDays)
      : existing.minRuntimeDays;
  const maxRuntimeDays =
    payload.maxRuntimeDays !== undefined
      ? Number(payload.maxRuntimeDays)
      : existing.maxRuntimeDays;
  const minLearningEvaluations =
    payload.minLearningEvaluations !== undefined
      ? Number(payload.minLearningEvaluations)
      : existing.minLearningEvaluations;
  const minLiftThreshold =
    payload.minLiftThreshold !== undefined
      ? Number(payload.minLiftThreshold)
      : existing.minLiftThreshold;
  const autoRolloutEnabled =
    payload.autoRolloutEnabled !== undefined
      ? Number(Boolean(payload.autoRolloutEnabled))
      : Number(existing.autoRolloutEnabled);
  const autoPauseEnabled =
    payload.autoPauseEnabled !== undefined
      ? Number(Boolean(payload.autoPauseEnabled))
      : Number(existing.autoPauseEnabled);
  const autoArchiveEnabled =
    payload.autoArchiveEnabled !== undefined
      ? Number(Boolean(payload.autoArchiveEnabled))
      : Number(existing.autoArchiveEnabled);
  const autoArchiveAfterDays =
    payload.autoArchiveAfterDays !== undefined
      ? Number(payload.autoArchiveAfterDays)
      : existing.autoArchiveAfterDays;

  await run(
    `
    UPDATE ab_experiments
    SET min_sample_size = ?, min_runtime_days = ?, max_runtime_days = ?,
        min_learning_evaluations = ?, min_lift_threshold = ?,
        auto_rollout_enabled = ?, auto_pause_enabled = ?,
        auto_archive_enabled = ?, auto_archive_after_days = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE experiment_key = ?
  `,
    [
      minSampleSize,
      minRuntimeDays,
      maxRuntimeDays,
      minLearningEvaluations,
      minLiftThreshold,
      autoRolloutEnabled,
      autoPauseEnabled,
      autoArchiveEnabled,
      autoArchiveAfterDays,
      experimentKey
    ]
  );

  await writeExperimentActionLog({
    experimentKey,
    actionType: "guardrails_admin_update",
    reason: "Guardrails updated via admin",
    details: {
      minSampleSize,
      minRuntimeDays,
      maxRuntimeDays,
      minLearningEvaluations,
      minLiftThreshold,
      autoRolloutEnabled,
      autoPauseEnabled,
      autoArchiveEnabled,
      autoArchiveAfterDays
    }
  });

  return getExperimentByKey(experimentKey);
}

async function getExperimentActionLogs(experimentKey, limit = 50) {
  const rows = await all(
    `
    SELECT *
    FROM ab_rollout_actions
    WHERE experiment_key = ?
    ORDER BY id DESC
    LIMIT ?
  `,
    [experimentKey, Number(limit)]
  );

  return rows.map((row) => ({
    ...row,
    details: parseJson(row.details_json, {})
  }));
}

async function evaluateAutoExperiments() {
  const rows = await all(
    `
    SELECT experiment_key
    FROM ab_experiments
    WHERE lifecycle_state IN ('running', 'learning', 'winner')
      AND status IN ('active', 'rolled_out')
      AND (auto_rollout_enabled = 1 OR auto_pause_enabled = 1 OR auto_archive_enabled = 1)
  `
  );

  const evaluations = [];

  for (const row of rows) {
    const result = await evaluateExperimentRollout(row.experiment_key);
    evaluations.push(result);
  }

  return {
    ok: true,
    scanned: rows.length,
    evaluations
  };
}

async function getFunnelSummary(days = 30) {
  const sinceExpr = `-${Number(days)} day`;

  const discovery = await get(
    `
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM behavior_events
    WHERE event_type IN ('catalog_load', 'intent_apply')
      AND datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const engaged = await get(
    `
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM behavior_events
    WHERE event_type IN ('similar_open', 'compare_run')
      AND datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const shortlists = await get(
    `
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM behavior_events
    WHERE event_type = 'shortlist_save'
      AND datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const affiliateClicks = await get(
    `
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM behavior_events
    WHERE event_type = 'affiliate_click'
      AND datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const totalClicks = await get(
    `
    SELECT COUNT(*) AS total_clicks
    FROM affiliate_click_events
    WHERE datetime(created_at) >= datetime('now', ?)
  `,
    [sinceExpr]
  );

  const discoveryCount = Number(discovery?.sessions || 0);
  const engagedCount = Number(engaged?.sessions || 0);
  const shortlistCount = Number(shortlists?.sessions || 0);
  const clickCount = Number(affiliateClicks?.sessions || 0);

  return {
    windowDays: Number(days),
    stages: {
      discoverySessions: discoveryCount,
      engagedSessions: engagedCount,
      shortlistSessions: shortlistCount,
      affiliateClickSessions: clickCount
    },
    rates: {
      discoveryToEngaged: discoveryCount > 0 ? engagedCount / discoveryCount : 0,
      engagedToShortlist: engagedCount > 0 ? shortlistCount / engagedCount : 0,
      shortlistToAffiliateClick: shortlistCount > 0 ? clickCount / shortlistCount : 0,
      discoveryToAffiliateClick: discoveryCount > 0 ? clickCount / discoveryCount : 0
    },
    totals: {
      affiliateClicks: Number(totalClicks?.total_clicks || 0)
    }
  };
}

async function getRevenueSimulationForecast(options = {}) {
  const lookbackDays = Number(options.lookbackDays || config.revenueSimulation.defaultLookbackDays);
  const horizonDays = Number(options.horizonDays || config.revenueSimulation.defaultHorizonDays);
  const clickGrowthRate = Number(
    options.clickGrowthRate ?? config.revenueSimulation.defaultClickGrowthRate
  );

  const sinceExpr = `-${lookbackDays} day`;

  const clickRows = await all(
    `
    SELECT
      COALESCE(ace.region, 'US') AS region,
      COALESCE(p.category, 'general') AS category,
      COUNT(*) AS recent_clicks,
      AVG(COALESCE(p.expected_revenue_per_click, 0)) AS avg_epc
    FROM affiliate_click_events ace
    LEFT JOIN products p ON p.id = ace.product_id
    WHERE datetime(ace.created_at) >= datetime('now', ?)
    GROUP BY COALESCE(ace.region, 'US'), COALESCE(p.category, 'general')
    ORDER BY recent_clicks DESC
  `,
    [sinceExpr]
  );

  const hasClickData = clickRows.length > 0;

  const fallbackRows = await all(
    `
    SELECT
      category,
      AVG(COALESCE(expected_revenue_per_click, 0)) AS avg_epc,
      COUNT(*) AS products_count
    FROM products
    GROUP BY category
    ORDER BY products_count DESC
  `
  );

  const effectiveRows = hasClickData
    ? clickRows.map((row) => ({
        region: row.region,
        category: row.category,
        recentClicks: Number(row.recent_clicks || 0),
        avgEpc: Number(row.avg_epc || 0)
      }))
    : fallbackRows.map((row) => ({
        region: "US",
        category: row.category,
        recentClicks: Number(config.revenueSimulation.fallbackDailyClicks) * lookbackDays,
        avgEpc: Number(row.avg_epc || 0)
      }));

  const baselineScale = lookbackDays > 0 ? horizonDays / lookbackDays : 1;
  const growthFactor = 1 + clickGrowthRate;
  const conservativeMultiplier = Number(config.revenueSimulation.conservativeMultiplier || 0.85);
  const aggressiveMultiplier = Number(config.revenueSimulation.aggressiveMultiplier || 1.2);

  const breakdown = effectiveRows.map((row) => {
    const projectedClicksBase = row.recentClicks * baselineScale * growthFactor;
    const baseRevenue = projectedClicksBase * row.avgEpc;

    return {
      region: row.region,
      category: row.category,
      recentClicks: row.recentClicks,
      avgEpc: row.avgEpc,
      projectedClicks: projectedClicksBase,
      projectedRevenue: {
        conservative: baseRevenue * conservativeMultiplier,
        base: baseRevenue,
        aggressive: baseRevenue * aggressiveMultiplier
      }
    };
  });

  const totals = breakdown.reduce(
    (accumulator, item) => {
      accumulator.recentClicks += item.recentClicks;
      accumulator.projectedClicks += item.projectedClicks;
      accumulator.projectedRevenue.conservative += item.projectedRevenue.conservative;
      accumulator.projectedRevenue.base += item.projectedRevenue.base;
      accumulator.projectedRevenue.aggressive += item.projectedRevenue.aggressive;
      return accumulator;
    },
    {
      recentClicks: 0,
      projectedClicks: 0,
      projectedRevenue: {
        conservative: 0,
        base: 0,
        aggressive: 0
      }
    }
  );

  const topCategories = [...breakdown]
    .sort((first, second) => second.projectedRevenue.base - first.projectedRevenue.base)
    .slice(0, 5)
    .map((item) => ({
      category: item.category,
      region: item.region,
      projectedRevenueBase: item.projectedRevenue.base,
      projectedClicks: item.projectedClicks
    }));

  return {
    model: {
      lookbackDays,
      horizonDays,
      clickGrowthRate,
      conservativeMultiplier,
      aggressiveMultiplier,
      source: hasClickData ? "click_events" : "catalog_fallback"
    },
    totals,
    topCategories,
    breakdown
  };
}

module.exports = {
  getAllProducts,
  getFilteredProducts,
  getProductById,
  getCategories,
  upsertProducts,
  writeSyncLog,
  writeDuplicateEvents,
  writeClickEvent,
  getSyncLogs,
  getPriceChangeLogs,
  getDuplicateEvents,
  getClickEvents,
  getClickSummary,
  createShortlist,
  updateShortlistBySlug,
  getShortlistBySlug,
  createPriceAlert,
  getPriceAlerts,
  getAlertNotifications,
  evaluatePriceAlerts,
  writeBehaviorEvent,
  getBehaviorEvents,
  upsertUserProfile,
  getUserProfile,
  getActiveExperimentByKey,
  getExperimentByKey,
  assignExperimentVariant,
  writeExperimentEvent,
  getExperimentSummary,
  evaluateExperimentRollout,
  evaluateAutoExperiments,
  getExperimentActionLogs,
  updateExperimentLifecycle,
  updateExperimentGuardrails,
  getRevenueSimulationForecast,
  getFunnelSummary,
  evaluateAbandonedShortlistReminders,
  getShortlistReminderNotifications
};