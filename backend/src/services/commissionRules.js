const { config } = require("../config");

function getCommissionRules() {
  return config.commissionRules;
}

function getCommissionRate(category, fallbackRate = 0.05) {
  const rules = getCommissionRules();
  if (Object.prototype.hasOwnProperty.call(rules, category)) {
    return Number(rules[category]);
  }
  if (Object.prototype.hasOwnProperty.call(rules, "default")) {
    return Number(rules.default);
  }
  return Number(fallbackRate);
}

function applyCommissionRules(products) {
  return products.map((product) => ({
    ...product,
    commissionRate: getCommissionRate(product.category, product.commissionRate)
  }));
}

module.exports = {
  getCommissionRules,
  getCommissionRate,
  applyCommissionRules
};