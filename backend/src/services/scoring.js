const { config } = require("../config");

function normalize(value, min, max) {
  if (max === min) {
    return 0;
  }
  return (value - min) / (max - min);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function defaultRevenueSignals() {
  return {
    lookbackDays: Number(config.revenueModel.lookbackDays || 90),
    totalClicks: 0,
    averageCategoryClicks: 0,
    productClicks: {},
    categoryClicks: {},
    categoryConversions: {},
    priors: {
      alpha: Number(config.revenueModel.bayesianPriorAlpha || 2),
      beta: Number(config.revenueModel.bayesianPriorBeta || 38)
    }
  };
}

function getCategoryConversionRate(category, revenueSignals) {
  const categoryStats = revenueSignals.categoryConversions?.[category] || {
    successes: 0,
    trials: 0
  };
  const alpha = Number(revenueSignals.priors?.alpha || 2);
  const beta = Number(revenueSignals.priors?.beta || 38);
  return (alpha + Number(categoryStats.successes || 0)) / (alpha + beta + Number(categoryStats.trials || 0));
}

function buildSignals(products, revenueSignals) {
  const clickValues = products.map(
    (product) => Number(revenueSignals.productClicks?.[product.id] || 0)
  );
  const maxProductClicks = Math.max(...clickValues, 1);
  const categoryClickAverage = Math.max(Number(revenueSignals.averageCategoryClicks || 0), 1);

  const signalsByProduct = new Map();

  for (const product of products) {
    const productClicks = Number(revenueSignals.productClicks?.[product.id] || 0);
    const categoryClicks = Number(revenueSignals.categoryClicks?.[product.category] || 0);

    const productInterest = productClicks / maxProductClicks;
    const categoryDemandLift =
      categoryClickAverage > 0
        ? (categoryClicks - categoryClickAverage) / categoryClickAverage
        : 0;

    const ratingComponent = normalize(Number(product.rating || 0), 0, 5);
    const reviewComponent = Math.log10(Number(product.reviewCount || 0) + 1) / 4;
    const trendComponent = normalize(Number(product.trendScore || 0), 0, 100);
    const baseConversionProbability = clamp(
      ratingComponent * 0.42 + reviewComponent * 0.3 + trendComponent * 0.2 + 0.04,
      Number(config.revenueModel.baseConversionFloor || 0.02),
      Number(config.revenueModel.baseConversionCeiling || 0.35)
    );

    const categoryConversionProbability = getCategoryConversionRate(product.category, revenueSignals);
    const conversionProbability = clamp(
      baseConversionProbability * 0.6 + categoryConversionProbability * 0.3 + productInterest * 0.1,
      Number(config.revenueModel.baseConversionFloor || 0.02),
      Number(config.revenueModel.baseConversionCeiling || 0.35)
    );

    const inferredDrop =
      Number(product.originalPrice || 0) > Number(product.price || 0)
        ? (Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)
        : 0;
    const dropLift = inferredDrop > 0 ? Math.min(inferredDrop, 0.2) * 0.6 : 0;
    const commissionLift = clamp(
      categoryDemandLift * 0.18 + dropLift,
      -0.15,
      Number(config.revenueModel.commissionLiftCap || 0.35)
    );
    const modeledCommissionRate = clamp(
      Number(product.commissionRate || 0) * (1 + commissionLift),
      0.01,
      0.25
    );

    const expectedRevenuePerClick =
      Number(product.price || 0) * modeledCommissionRate * conversionProbability;

    signalsByProduct.set(product.id, {
      productClicks,
      categoryClicks,
      productInterest,
      categoryDemandLift,
      conversionProbability,
      modeledCommissionRate,
      expectedRevenuePerClick
    });
  }

  return signalsByProduct;
}

function buildRanges(products, signalsByProduct) {
  const sales = products.map((product) => product.monthlySalesEstimate);
  const price = products.map((product) => product.price);
  const reviewCount = products.map((product) => product.reviewCount);
  const trend = products.map((product) => product.trendScore);
  const epc = products.map(
    (product) => Number(signalsByProduct.get(product.id)?.expectedRevenuePerClick || 0)
  );

  return {
    sales: { min: Math.min(...sales), max: Math.max(...sales) },
    price: { min: Math.min(...price), max: Math.max(...price) },
    reviewCount: { min: Math.min(...reviewCount), max: Math.max(...reviewCount) },
    trend: { min: Math.min(...trend), max: Math.max(...trend) },
    epc: { min: Math.min(...epc), max: Math.max(...epc) }
  };
}

function scoreProduct(product, ranges, signal) {
  const conversionProxy = clamp(
    Number(signal.conversionProbability || 0),
    Number(config.revenueModel.baseConversionFloor || 0.02),
    Number(config.revenueModel.baseConversionCeiling || 0.35)
  );

  const commissionPotential = normalize(signal.modeledCommissionRate, 0.03, 0.15);
  const salesStrength = normalize(
    product.monthlySalesEstimate,
    ranges.sales.min,
    ranges.sales.max
  );
  const trendMomentum = normalize(product.trendScore, ranges.trend.min, ranges.trend.max);
  const priceCompetitiveness = 1 - normalize(product.price, ranges.price.min, ranges.price.max);
  const stockReliability = product.stockStatus === "in_stock" ? 1 : 0;
  const expectedRevenuePerClick = Number(signal.expectedRevenuePerClick || 0);
  const epcStrength = normalize(expectedRevenuePerClick, ranges.epc.min, ranges.epc.max);

  const score =
    conversionProxy * 0.2 +
    commissionPotential * 0.15 +
    epcStrength * 0.3 +
    salesStrength * 0.15 +
    priceCompetitiveness * 0.1 +
    stockReliability * 0.1 +
    trendMomentum * 0.05;

  return {
    score: Number((score * 100).toFixed(2)),
    epcScore: Number((epcStrength * 100).toFixed(2)),
    expectedRevenuePerClick: Number(expectedRevenuePerClick.toFixed(4)),
    conversionProbability: Number(conversionProxy.toFixed(4)),
    modeledCommissionRate: Number(signal.modeledCommissionRate.toFixed(4))
  };
}

function withScores(products, options = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const revenueSignals = options.revenueSignals || defaultRevenueSignals();
  const signalsByProduct = buildSignals(products, revenueSignals);
  const ranges = buildRanges(products, signalsByProduct);

  return products.map((product) => {
    const signal =
      signalsByProduct.get(product.id) || {
        expectedRevenuePerClick: 0,
        conversionProbability: Number(config.revenueModel.baseConversionFloor || 0.02),
        modeledCommissionRate: Number(product.commissionRate || 0)
      };
    const scorePayload = scoreProduct(product, ranges, signal);

    return {
      ...product,
      score: scorePayload.score,
      epcScore: scorePayload.epcScore,
      expectedRevenuePerClick: scorePayload.expectedRevenuePerClick,
      conversionProbability: scorePayload.conversionProbability,
      modeledCommissionRate: scorePayload.modeledCommissionRate,
      estimatedCommissionValue: Number(
        (
          Number(product.monthlySalesEstimate || 0) *
          Number(product.price || 0) *
          Number(scorePayload.modeledCommissionRate || 0) *
          Number(scorePayload.conversionProbability || 0)
        ).toFixed(2)
      )
    };
  });
}

module.exports = {
  withScores
};