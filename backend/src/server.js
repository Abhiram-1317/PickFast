const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");

const { config } = require("./config");
const { initDb } = require("./db/database");
const {
  getAllProducts,
  getProductById,
  getCategories,
  getFilteredProducts,
  getSyncLogs,
  getPriceChangeLogs,
  getDuplicateEvents,
  getRevenueModelSignals,
  getHotDeals,
  getHigherCommissionProducts,
  getClickEvents,
  getClickSummary,
  writeClickEvent,
  createNewsletterSignup,
  getNewsletterSignups,
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
  assignExperimentVariant,
  writeExperimentEvent,
  getExperimentSummary,
  getExperimentByKey,
  evaluateExperimentRollout,
  evaluateAutoExperiments,
  getExperimentActionLogs,
  updateExperimentLifecycle,
  updateExperimentGuardrails,
  getRevenueSimulationForecast,
  getWeeklyPmReport,
  getDbOverview,
  getFunnelSummary,
  evaluateAbandonedShortlistReminders,
  getShortlistReminderNotifications
} = require("./db/productRepository");
const {
  refreshCatalogScores,
  runAmazonSync,
  startSyncScheduler
} = require("./jobs/syncJobs");
const { getCommissionRules } = require("./services/commissionRules");
const {
  withRegionAffiliateUrl,
  inferRegionFromRequest,
  normalizeRegion,
  buildAffiliateLink
} = require("./services/affiliateLinks");
const { buildIntentPages, getIntentBySlug } = require("./services/seoIntent");
const {
  buildProfileFromEvents,
  getPersonalizedRecommendations
} = require("./services/personalization");
const { compareProducts, getSimilarProducts } = require("./services/recommendation");

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const adminSessions = new Map();

function getAdminTokenFromRequest(req) {
  const explicit = req.header("x-admin-token");
  if (explicit) {
    return explicit;
  }

  const authorization = req.header("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

function issueAdminSessionToken(username) {
  const token = crypto.randomBytes(24).toString("hex");
  const ttlMinutes = Number(config.adminSessionTtlMinutes || 120);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

  adminSessions.set(token, {
    username,
    issuedAt: Date.now(),
    expiresAt
  });

  return {
    token,
    expiresAt,
    ttlMinutes
  };
}

function validateAdminSessionToken(token) {
  if (!token) {
    return false;
  }

  const session = adminSessions.get(token);
  if (!session) {
    return false;
  }

  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(token);
    return false;
  }

  return true;
}

function ensureAdmin(req, res, next) {
  const providedApiKey = req.header("x-admin-key") || "";
  const providedToken = getAdminTokenFromRequest(req);

  const hasApiKeyConfigured = Boolean(config.adminApiKey);
  const keyValid = hasApiKeyConfigured && providedApiKey === config.adminApiKey;
  const tokenValid = validateAdminSessionToken(providedToken);

  if (!keyValid && !tokenValid) {
    res.status(401).json({ error: "Unauthorized. Missing or invalid x-admin-key" });
    return;
  }

  next();
}

function mapSortBy(sortBy) {
  const sortMap = {
    reviewCount: "review_count",
    monthlySalesEstimate: "monthly_sales_estimate",
    estimatedCommissionValue: "estimated_commission_value",
    epcScore: "epc_score",
    expectedRevenuePerClick: "expected_revenue_per_click"
  };

  return sortMap[sortBy] || sortBy;
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "pickfast-affiliate-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/categories", async (req, res) => {
  const categories = await getCategories();
  res.json({ categories });
});

app.get("/api/seo/intents", async (req, res) => {
  const categories = await getCategories();
  const region = inferRegionFromRequest(req);
  const intents = buildIntentPages({ categories });
  const limit = Number(req.query.limit || 30);

  const enriched = await Promise.all(
    intents.slice(0, limit).map(async (intent) => {
      const products = await getFilteredProducts(intent.filters);
      return {
        ...intent,
        region,
        url: `/intent/${intent.slug}`,
        products: products.slice(0, 4).map((product) => withRegionAffiliateUrl(product, region))
      };
    })
  );

  res.json({ intents: enriched });
});

app.get("/api/seo/intents/:slug", async (req, res) => {
  const categories = await getCategories();
  const region = inferRegionFromRequest(req);
  const intents = buildIntentPages({ categories });
  const intent = getIntentBySlug(req.params.slug, intents);

  if (!intent) {
    return res.status(404).json({ error: "Intent page not found" });
  }

  const products = await getFilteredProducts(intent.filters);

  res.json({
    intent,
    region,
    products: products.map((product) => withRegionAffiliateUrl(product, region))
  });
});

app.get("/api/products", async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    minRating,
    sortBy = "score",
    order = "desc",
    limit
  } = req.query;

  const region = inferRegionFromRequest(req);
  const products = await getFilteredProducts({
    category,
    minPrice,
    maxPrice,
    minRating,
    sortBy: mapSortBy(sortBy),
    order,
    limit
  });

  res.json({
    total: products.length,
    products: products.map((product) => withRegionAffiliateUrl(product, region))
  });
});

app.get("/api/products/top", async (req, res) => {
  const { category, limit = 6 } = req.query;
  const region = inferRegionFromRequest(req);

  const top = await getFilteredProducts({
    category,
    sortBy: "score",
    order: "desc",
    limit: Number(limit)
  });

  res.json({ products: top.map((product) => withRegionAffiliateUrl(product, region)) });
});

app.get("/api/products/hot-deals", async (req, res) => {
  const region = inferRegionFromRequest(req);
  const deals = await getHotDeals(req.query.limit || 8);

  res.json({
    deals: deals.map((deal) => withRegionAffiliateUrl(deal, region))
  });
});

app.get("/api/products/:id", async (req, res) => {
  const region = inferRegionFromRequest(req);
  const allProducts = await getAllProducts();
  const product = allProducts.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const similarProducts = getSimilarProducts(product, allProducts, { limit: 4 });
  const higherCommissionProducts = await getHigherCommissionProducts(product.id, 6);

  res.json({
    product: withRegionAffiliateUrl(product, region),
    similarProducts: similarProducts.map((item) => withRegionAffiliateUrl(item, region)),
    higherCommissionProducts: higherCommissionProducts.map((item) =>
      withRegionAffiliateUrl(item, region)
    )
  });
});

app.get("/api/products/:id/similar", async (req, res) => {
  const region = inferRegionFromRequest(req);
  const allProducts = await getAllProducts();
  const product = allProducts.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const similarProducts = getSimilarProducts(product, allProducts, {
    limit: Number(req.query.limit) || 4
  });

  res.json({
    productId: product.id,
    similarProducts: similarProducts.map((item) => withRegionAffiliateUrl(item, region))
  });
});

app.get("/api/products/:id/higher-commission", async (req, res) => {
  const region = inferRegionFromRequest(req);
  const product = await getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const recommendations = await getHigherCommissionProducts(
    req.params.id,
    Number(req.query.limit || 6)
  );

  res.json({
    productId: req.params.id,
    recommendations: recommendations.map((item) => withRegionAffiliateUrl(item, region))
  });
});

app.get("/api/products/:id/affiliate-link", async (req, res) => {
  const allProducts = await getAllProducts();
  const product = allProducts.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const region = inferRegionFromRequest(req);
  const affiliateUrl = buildAffiliateLink(product.amazonUrl, region);

  res.json({
    productId: product.id,
    region: normalizeRegion(region),
    affiliateUrl
  });
});

app.post("/api/compare", async (req, res) => {
  const productIds = req.body.productIds || [];

  if (!Array.isArray(productIds) || productIds.length < 2) {
    return res
      .status(400)
      .json({ error: "Please provide at least two product IDs in productIds array" });
  }

  const allProducts = await getAllProducts();
  const selected = allProducts.filter((product) => productIds.includes(product.id));

  if (selected.length < 2) {
    return res.status(400).json({ error: "At least two valid products are required" });
  }

  const summary = compareProducts(selected);

  res.json({
    comparedCount: selected.length,
    products: selected,
    summary
  });
});

app.get("/api/recommendations", async (req, res) => {
  const { category, budget, useCase, limit = 6 } = req.query;
  const budgetNumber = budget ? Number(budget) : null;

  let filtered = await getAllProducts();

  if (category) {
    filtered = filtered.filter((product) => product.category === category);
  }
  if (budgetNumber) {
    filtered = filtered.filter((product) => product.price <= budgetNumber);
  }
  if (useCase) {
    filtered = filtered.filter((product) => product.useCases.includes(useCase));
  }

  const recommendations = filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(limit));

  const region = inferRegionFromRequest(req);

  res.json({
    filters: { category: category || null, budget: budgetNumber, useCase: useCase || null },
    recommendations: recommendations.map((item) => withRegionAffiliateUrl(item, region))
  });
});

app.get("/api/experiments/:key/assignment", async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const assignment = await assignExperimentVariant({
    experimentKey: req.params.key,
    sessionId: String(sessionId)
  });

  res.json({ assignment });
});

app.post("/api/experiments/:key/events", async (req, res) => {
  const { sessionId, variantKey, eventType, metadata } = req.body || {};

  if (!sessionId || !variantKey || !eventType) {
    return res.status(400).json({ error: "sessionId, variantKey and eventType are required" });
  }

  await writeExperimentEvent({
    experimentKey: req.params.key,
    sessionId,
    variantKey,
    eventType,
    metadata
  });

  res.json({ ok: true });
});

app.post("/api/track/click", async (req, res) => {
  const {
    productId,
    pageType,
    placement,
    region,
    deviceType,
    sourceUrl,
    referrer,
    affiliateUrl
  } = req.body || {};

  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  const existingProduct = await getProductById(productId);
  if (!existingProduct) {
    return res.status(404).json({ error: "Product not found" });
  }

  const ipHash = crypto.createHash("sha256").update(String(req.ip || "unknown")).digest("hex").slice(0, 24);
  const normalizedRegion = normalizeRegion(region || inferRegionFromRequest(req));

  await writeClickEvent({
    productId,
    pageType,
    placement,
    region: normalizedRegion,
    deviceType,
    sourceUrl,
    referrer,
    affiliateUrl,
    userAgent: req.header("user-agent") || null,
    ipHash
  });

  res.json({ ok: true });
});

app.get("/buy/:slug", async (req, res) => {
  const { slug } = req.params;
  const region = normalizeRegion(req.query.region || inferRegionFromRequest(req));
  const pageType = req.query.pageType || "redirect";
  const placement = req.query.placement || "buy_redirect";
  const allProducts = await getAllProducts();

  let product = null;
  if (req.query.pid) {
    product = allProducts.find((item) => item.id === req.query.pid);
  }

  if (!product) {
    product = allProducts.find((item) => toSlug(item.name) === slug);
  }

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const affiliateUrl = buildAffiliateLink(product.amazonUrl, region);
  const ipHash = crypto.createHash("sha256").update(String(req.ip || "unknown")).digest("hex").slice(0, 24);

  await writeClickEvent({
    productId: product.id,
    pageType,
    placement,
    region,
    deviceType: /Mobi|Android|iPhone/i.test(req.header("user-agent") || "") ? "mobile" : "desktop",
    sourceUrl: req.originalUrl,
    referrer: req.header("referer") || null,
    affiliateUrl,
    userAgent: req.header("user-agent") || null,
    ipHash
  });

  res.redirect(302, affiliateUrl);
});

app.post("/api/behavior/track", async (req, res) => {
  const { sessionId, eventType, productId, category, price, region, metadata } = req.body || {};

  if (!sessionId || !eventType) {
    return res.status(400).json({ error: "sessionId and eventType are required" });
  }

  await writeBehaviorEvent({
    sessionId,
    eventType,
    productId,
    category,
    price,
    region: normalizeRegion(region || inferRegionFromRequest(req)),
    metadata
  });

  res.json({ ok: true });
});

app.get("/api/recommendations/personalized", async (req, res) => {
  const { sessionId, limit = 12 } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const region = inferRegionFromRequest(req);
  const events = await getBehaviorEvents(sessionId, 300);
  const profileFromEvents = buildProfileFromEvents(events, region);
  await upsertUserProfile({ sessionId, ...profileFromEvents });

  const profile = (await getUserProfile(sessionId)) || {
    sessionId,
    topCategories: [],
    preferredPrice: null,
    preferredRegion: region,
    confidenceScore: 0
  };

  const allProducts = await getAllProducts();
  const recommendations = getPersonalizedRecommendations(allProducts, profile, limit).map((item) =>
    withRegionAffiliateUrl(item, region)
  );

  res.json({
    sessionId,
    profile,
    recommendations
  });
});

app.post("/api/shortlists", async (req, res) => {
  const { productIds, name, contactEmail, region } = req.body || {};

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: "productIds is required and must be a non-empty array" });
  }

  const shortlist = await createShortlist({
    productIds,
    name,
    contactEmail,
    region: normalizeRegion(region || inferRegionFromRequest(req))
  });

  res.status(201).json({ shortlist });
});

app.put("/api/shortlists/:slug", async (req, res) => {
  const { productIds, name, contactEmail, region } = req.body || {};

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: "productIds is required and must be a non-empty array" });
  }

  const existing = await getShortlistBySlug(req.params.slug);
  if (!existing) {
    return res.status(404).json({ error: "Shortlist not found" });
  }

  const shortlist = await updateShortlistBySlug(req.params.slug, {
    productIds,
    name,
    contactEmail,
    region: normalizeRegion(region || inferRegionFromRequest(req))
  });

  res.json({ shortlist });
});

app.get("/api/shortlists/:slug", async (req, res) => {
  const shortlist = await getShortlistBySlug(req.params.slug);
  if (!shortlist) {
    return res.status(404).json({ error: "Shortlist not found" });
  }

  const region = normalizeRegion(shortlist.region || inferRegionFromRequest(req));
  const allProducts = await getAllProducts();
  const productMap = new Map(allProducts.map((product) => [product.id, product]));
  const products = shortlist.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean)
    .map((product) => withRegionAffiliateUrl(product, region));

  res.json({ shortlist: { ...shortlist, region }, products });
});

app.post("/api/alerts/subscribe", async (req, res) => {
  const { email, productId, targetPrice, region } = req.body || {};

  if (!email || !productId || !targetPrice) {
    return res.status(400).json({ error: "email, productId, and targetPrice are required" });
  }

  const product = await getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const alert = await createPriceAlert({
    email,
    productId,
    targetPrice: Number(targetPrice),
    region: normalizeRegion(region || inferRegionFromRequest(req))
  });

  res.status(201).json({ alert });
});

app.post("/api/newsletter/signup", async (req, res) => {
  const { email, source, metadata } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const signup = await createNewsletterSignup({
    email: normalizedEmail,
    source: source || "homepage",
    metadata: metadata || {}
  });

  res.status(201).json({ signup });
});

app.post("/api/admin/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const expectedUsername = String(config.adminUsername || "").trim();
  const expectedPassword = String(config.adminPassword || "");

  if (!expectedUsername || !expectedPassword) {
    return res.status(503).json({ error: "Admin username/password not configured" });
  }

  if (String(username || "").trim() !== expectedUsername || String(password || "") !== expectedPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const session = issueAdminSessionToken(expectedUsername);

  return res.json({
    ok: true,
    token: session.token,
    username: expectedUsername,
    expiresAt: new Date(session.expiresAt).toISOString(),
    expiresInMinutes: session.ttlMinutes
  });
});

app.post("/api/admin/auth/logout", ensureAdmin, (req, res) => {
  const token = getAdminTokenFromRequest(req);
  if (token) {
    adminSessions.delete(token);
  }

  res.json({ ok: true });
});

app.post("/api/admin/sync/run", ensureAdmin, async (req, res) => {
  const syncResult = await runAmazonSync();
  res.json(syncResult);
});

app.get("/api/admin/sync/logs", ensureAdmin, async (req, res) => {
  const logs = await getSyncLogs(req.query.limit || 20);
  res.json({ logs });
});

app.get("/api/admin/price-changes", ensureAdmin, async (req, res) => {
  const logs = await getPriceChangeLogs(req.query.limit || 50);
  res.json({ logs });
});

app.get("/api/admin/duplicates", ensureAdmin, async (req, res) => {
  const events = await getDuplicateEvents(req.query.limit || 50);
  res.json({ events });
});

app.get("/api/admin/commission-rules", ensureAdmin, (req, res) => {
  res.json({ rules: getCommissionRules() });
});

app.get("/api/admin/clicks/recent", ensureAdmin, async (req, res) => {
  const events = await getClickEvents(req.query.limit || 50);
  res.json({ events });
});

app.get("/api/admin/clicks/summary", ensureAdmin, async (req, res) => {
  const summary = await getClickSummary(req.query.days || 30);
  res.json(summary);
});

app.get("/api/admin/experiments/:key/summary", ensureAdmin, async (req, res) => {
  const summary = await getExperimentSummary(req.params.key, req.query.days || 14);
  res.json(summary);
});

app.get("/api/admin/experiments/:key/config", ensureAdmin, async (req, res) => {
  const experiment = await getExperimentByKey(req.params.key);
  if (!experiment) {
    return res.status(404).json({ error: "Experiment not found" });
  }

  res.json({ experiment });
});

app.patch("/api/admin/experiments/:key/lifecycle", ensureAdmin, async (req, res) => {
  const { lifecycleState, reason } = req.body || {};
  if (!lifecycleState) {
    return res.status(400).json({ error: "lifecycleState is required" });
  }

  const experiment = await updateExperimentLifecycle(
    req.params.key,
    lifecycleState,
    reason || ""
  );

  if (!experiment) {
    return res.status(404).json({ error: "Experiment not found" });
  }

  res.json({ experiment });
});

app.patch("/api/admin/experiments/:key/guardrails", ensureAdmin, async (req, res) => {
  const experiment = await updateExperimentGuardrails(req.params.key, req.body || {});

  if (!experiment) {
    return res.status(404).json({ error: "Experiment not found" });
  }

  res.json({ experiment });
});

app.post("/api/admin/experiments/:key/evaluate", ensureAdmin, async (req, res) => {
  const result = await evaluateExperimentRollout(req.params.key);
  if (!result.ok) {
    return res.status(404).json(result);
  }

  res.json(result);
});

app.post("/api/admin/experiments/evaluate-auto", ensureAdmin, async (req, res) => {
  const result = await evaluateAutoExperiments();
  res.json(result);
});

app.get("/api/admin/experiments/:key/actions", ensureAdmin, async (req, res) => {
  const actions = await getExperimentActionLogs(req.params.key, req.query.limit || 50);
  res.json({ actions });
});

app.get("/api/admin/funnel/summary", ensureAdmin, async (req, res) => {
  const summary = await getFunnelSummary(req.query.days || 30);
  res.json(summary);
});

app.get("/api/admin/revenue/simulation", ensureAdmin, async (req, res) => {
  const forecast = await getRevenueSimulationForecast({
    lookbackDays: req.query.lookbackDays,
    horizonDays: req.query.horizonDays,
    clickGrowthRate: req.query.clickGrowthRate
  });

  res.json(forecast);
});

app.get("/api/admin/revenue/model-signals", ensureAdmin, async (req, res) => {
  const lookbackDays = Number(req.query.lookbackDays || config.revenueModel.lookbackDays);
  const signals = await getRevenueModelSignals(lookbackDays);
  res.json({ signals });
});

app.get("/api/admin/weekly-pm-report", ensureAdmin, async (req, res) => {
  const report = await getWeeklyPmReport({
    windowDays: req.query.windowDays,
    experimentKey: req.query.experimentKey || "hero_cta_v1"
  });

  res.json(report);
});

app.get("/api/admin/db-overview", ensureAdmin, async (_req, res) => {
  const overview = await getDbOverview();
  res.json({
    ...overview,
    paapi: {
      enabled: config.amazon.paapiEnabled,
      mode: config.amazon.paapiEnabled ? "enabled" : "disabled"
    }
  });
});

app.get("/api/admin/alerts/subscriptions", ensureAdmin, async (req, res) => {
  const alerts = await getPriceAlerts(req.query.limit || 100);
  res.json({ alerts });
});

app.get("/api/admin/newsletter/signups", ensureAdmin, async (req, res) => {
  const signups = await getNewsletterSignups(req.query.limit || 100);
  res.json({ signups });
});

app.get("/api/admin/alerts/notifications", ensureAdmin, async (req, res) => {
  const notifications = await getAlertNotifications(req.query.limit || 100);
  res.json({ notifications });
});

app.post("/api/admin/alerts/check", ensureAdmin, async (req, res) => {
  const result = await evaluatePriceAlerts();
  res.json({ ok: true, ...result });
});

app.post("/api/admin/reminders/check", ensureAdmin, async (req, res) => {
  const result = await evaluateAbandonedShortlistReminders(req.query.hours || 24);
  res.json({ ok: true, ...result });
});

app.get("/api/admin/reminders/notifications", ensureAdmin, async (req, res) => {
  const notifications = await getShortlistReminderNotifications(req.query.limit || 100);
  res.json({ notifications });
});

// ── Admin Product CRUD ─────────────────────────────
const {
  listAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct
} = require("./db/adminProducts");

const UPLOAD_DIR = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.get("/api/admin/products", ensureAdmin, async (req, res) => {
  const products = await listAdminProducts();
  res.json({ products });
});

app.post("/api/admin/products", ensureAdmin, async (req, res) => {
  const result = await createAdminProduct(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

app.put("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const result = await updateAdminProduct(req.params.id, req.body);
  if (result.notFound) return res.status(404).json({ error: "Product not found" });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.delete("/api/admin/products/:id", ensureAdmin, async (req, res) => {
  const result = await deleteAdminProduct(req.params.id);
  if (!result.deleted) return res.status(404).json({ error: "Product not found" });
  res.json({ ok: true });
});

// Image upload — accepts base64 JSON body { filename, data }
app.post("/api/admin/upload", ensureAdmin, (req, res) => {
  const { filename, data } = req.body;
  if (!filename || !data) {
    return res.status(400).json({ error: "filename and data (base64) are required" });
  }

  const ext = path.extname(filename).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".mp4", ".webm"];
  if (!allowed.includes(ext)) {
    return res.status(400).json({ error: `File type ${ext} not allowed` });
  }

  const safeName = `${crypto.randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(data, "base64");

  if (buffer.length > 10 * 1024 * 1024) {
    return res.status(400).json({ error: "File too large (max 10MB)" });
  }

  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
  const url = `/uploads/${safeName}`;
  res.json({ url, filename: safeName });
});

app.use("/uploads", express.static(UPLOAD_DIR));

app.use(express.static(path.join(__dirname, "../public")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

async function bootstrap() {
  await initDb();
  await refreshCatalogScores();
  startSyncScheduler();

  app.listen(port, () => {
    console.log(`PickFast API running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap PickFast server", error);
  process.exit(1);
});