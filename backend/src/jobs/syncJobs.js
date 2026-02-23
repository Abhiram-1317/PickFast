const cron = require("node-cron");
const { config } = require("../config");
const { products: seedProducts } = require("../data/products");
const { withScores } = require("../services/scoring");
const { applyCommissionRules } = require("../services/commissionRules");
const { ingestFromAmazonKeywords } = require("../services/amazonPaapi");
const {
  upsertProducts,
  writeSyncLog,
  writeDuplicateEvents,
  getAllProducts,
  evaluateAutoExperiments
} = require("../db/productRepository");

async function persistWithRecalculatedScores(incomingProducts, source) {
  const existingProducts = await getAllProducts();
  const incomingMap = new Map(incomingProducts.map((product) => [product.id, product]));

  const merged = [
    ...existingProducts.filter((product) => !incomingMap.has(product.id)),
    ...incomingProducts
  ];
  const commissionAdjusted = applyCommissionRules(merged);
  const scored = withScores(commissionAdjusted);
  await upsertProducts(scored, source);
  return incomingProducts.length;
}

async function bootstrapSeedDataIfEmpty() {
  const current = await getAllProducts();
  if (current.length > 0) {
    return;
  }

  const scoredSeed = withScores(applyCommissionRules(seedProducts));
  await upsertProducts(scoredSeed, "seed");
  await writeSyncLog({
    status: "success",
    source: "seed",
    importedCount: scoredSeed.length,
    message: "Seed data initialized"
  });
}

async function refreshCatalogScores() {
  const current = await getAllProducts();
  if (!current.length) {
    return;
  }

  const rescored = withScores(applyCommissionRules(current));
  await upsertProducts(rescored, "system");
}

async function runAmazonSync() {
  try {
    const { products, duplicates } = await ingestFromAmazonKeywords(config.syncKeywords);
    const importedCount = await persistWithRecalculatedScores(products, "amazon");
    await writeDuplicateEvents(duplicates, "amazon");

    await writeSyncLog({
      status: "success",
      source: "amazon",
      importedCount,
      message: `Amazon sync completed for ${config.syncKeywords.length} keyword groups. Duplicates tracked: ${duplicates.length}`
    });

    return {
      ok: true,
      importedCount,
      duplicateEventsTracked: duplicates.length
    };
  } catch (error) {
    await writeSyncLog({
      status: "failed",
      source: "amazon",
      importedCount: 0,
      message: error.message
    });

    return {
      ok: false,
      importedCount: 0,
      error: error.message
    };
  }
}

function startSyncScheduler() {
  cron.schedule(config.syncCron, async () => {
    await runAmazonSync();
  });

  cron.schedule(config.experimentsCron, async () => {
    await evaluateAutoExperiments();
  });
}

module.exports = {
  bootstrapSeedDataIfEmpty,
  refreshCatalogScores,
  runAmazonSync,
  startSyncScheduler
};