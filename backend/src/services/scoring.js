const { config } = require("../config");

function normalize(value, min, max) {
  if (max === min) {
    return 0;
  }
  return (value - min) / (max - min);
}

function buildRanges(products) {
  const sales = products.map((product) => product.monthlySalesEstimate);
  const price = products.map((product) => product.price);
  const reviewCount = products.map((product) => product.reviewCount);
  const trend = products.map((product) => product.trendScore);
  const epc = products.map((product) => {
    const ctr = config.epcModel.clickThroughRate;
    const cvr = config.epcModel.amazonConversionRate;
    return product.price * product.commissionRate * ctr * cvr;
  });

  return {
    sales: { min: Math.min(...sales), max: Math.max(...sales) },
    price: { min: Math.min(...price), max: Math.max(...price) },
    reviewCount: { min: Math.min(...reviewCount), max: Math.max(...reviewCount) },
    trend: { min: Math.min(...trend), max: Math.max(...trend) },
    epc: { min: Math.min(...epc), max: Math.max(...epc) }
  };
}

function scoreProduct(product, ranges) {
  const conversionProxy =
    normalize(product.rating, 0, 5) * 0.5 +
    normalize(product.reviewCount, ranges.reviewCount.min, ranges.reviewCount.max) * 0.5;

  const commissionPotential = normalize(product.commissionRate, 0.05, 0.12);
  const salesStrength = normalize(
    product.monthlySalesEstimate,
    ranges.sales.min,
    ranges.sales.max
  );
  const trendMomentum = normalize(product.trendScore, ranges.trend.min, ranges.trend.max);
  const priceCompetitiveness = 1 - normalize(product.price, ranges.price.min, ranges.price.max);
  const stockReliability = product.stockStatus === "in_stock" ? 1 : 0;

  const ctr = config.epcModel.clickThroughRate;
  const cvr = config.epcModel.amazonConversionRate;
  const expectedRevenuePerClick = product.price * product.commissionRate * ctr * cvr;
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
    expectedRevenuePerClick: Number(expectedRevenuePerClick.toFixed(4))
  };
}

function withScores(products) {
  const ranges = buildRanges(products);
  return products.map((product) => {
    const scorePayload = scoreProduct(product, ranges);

    return {
      ...product,
      score: scorePayload.score,
      epcScore: scorePayload.epcScore,
      expectedRevenuePerClick: scorePayload.expectedRevenuePerClick,
      estimatedCommissionValue: Number(
        (product.price * product.commissionRate * (product.monthlySalesEstimate / 1000)).toFixed(2)
      )
    };
  });
}

module.exports = {
  withScores
};