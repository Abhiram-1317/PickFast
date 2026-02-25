const dotenv = require("dotenv");

dotenv.config();

const defaultCommissionRules = {
  laptops: 0.045,
  headphones: 0.06,
  kitchen: 0.08,
  fitness: 0.07,
  general: 0.05,
  default: 0.05
};

let commissionRules = defaultCommissionRules;

if (process.env.COMMISSION_RULES_JSON) {
  try {
    const parsed = JSON.parse(process.env.COMMISSION_RULES_JSON);
    commissionRules = {
      ...defaultCommissionRules,
      ...parsed
    };
  } catch (error) {
    commissionRules = defaultCommissionRules;
  }
}

const config = {
  port: Number(process.env.PORT || 4000),
  adminApiKey: process.env.ADMIN_API_KEY || "",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "pickfast-admin",
  adminSessionTtlMinutes: Number(process.env.ADMIN_SESSION_TTL_MINUTES || 120),
  epcModel: {
    clickThroughRate: Number(process.env.EPC_CTR || 0.18),
    amazonConversionRate: Number(process.env.EPC_AMAZON_CVR || 0.09)
  },
  syncCron: process.env.SYNC_CRON || "0 */6 * * *",
  experimentsCron: process.env.EXPERIMENTS_CRON || "*/30 * * * *",
  revenueSimulation: {
    defaultLookbackDays: Number(process.env.REVENUE_SIM_LOOKBACK_DAYS || 30),
    defaultHorizonDays: Number(process.env.REVENUE_SIM_HORIZON_DAYS || 30),
    defaultClickGrowthRate: Number(process.env.REVENUE_SIM_CLICK_GROWTH_RATE || 0.08),
    conservativeMultiplier: Number(process.env.REVENUE_SIM_CONSERVATIVE_MULTIPLIER || 0.85),
    aggressiveMultiplier: Number(process.env.REVENUE_SIM_AGGRESSIVE_MULTIPLIER || 1.2),
    fallbackDailyClicks: Number(process.env.REVENUE_SIM_FALLBACK_DAILY_CLICKS || 20)
  },
  revenueModel: {
    lookbackDays: Number(process.env.REVENUE_MODEL_LOOKBACK_DAYS || 90),
    minCategorySamples: Number(process.env.REVENUE_MODEL_MIN_CATEGORY_SAMPLES || 8),
    bayesianPriorAlpha: Number(process.env.REVENUE_MODEL_PRIOR_ALPHA || 2),
    bayesianPriorBeta: Number(process.env.REVENUE_MODEL_PRIOR_BETA || 38),
    baseConversionFloor: Number(process.env.REVENUE_MODEL_BASE_CVR_FLOOR || 0.02),
    baseConversionCeiling: Number(process.env.REVENUE_MODEL_BASE_CVR_CEILING || 0.35),
    commissionLiftCap: Number(process.env.REVENUE_MODEL_COMMISSION_LIFT_CAP || 0.35),
    priceDropTriggerFloor: Number(process.env.PRICE_DROP_TRIGGER_FLOOR || 0.08),
    priceDropTriggerCeiling: Number(process.env.PRICE_DROP_TRIGGER_CEILING || 0.2),
    defaultPriceDropTrigger: Number(process.env.PRICE_DROP_TRIGGER_DEFAULT || 0.1)
  },
  experiments: {
    defaultMinSampleSize: Number(process.env.EXP_MIN_SAMPLE_SIZE || 50),
    defaultMinRuntimeDays: Number(process.env.EXP_MIN_RUNTIME_DAYS || 3),
    defaultMinLiftThreshold: Number(process.env.EXP_MIN_LIFT_THRESHOLD || 0.1),
    autoPauseDropThreshold: Number(process.env.EXP_AUTO_PAUSE_DROP_THRESHOLD || 0.4),
    significanceAlpha: Number(process.env.EXP_SIGNIFICANCE_ALPHA || 0.05),
    bayesianMinProbability: Number(process.env.EXP_BAYESIAN_MIN_PROBABILITY || 0.95),
    bayesianPriorAlpha: Number(process.env.EXP_BAYESIAN_PRIOR_ALPHA || 1),
    bayesianPriorBeta: Number(process.env.EXP_BAYESIAN_PRIOR_BETA || 1),
    banditExplorationRate: Number(process.env.EXP_BANDIT_EXPLORATION_RATE || 0.08),
    banditWarmupMinImpressions: Number(process.env.EXP_BANDIT_WARMUP_MIN_IMPRESSIONS || 100),
    defaultMaxRuntimeDays: Number(process.env.EXP_MAX_RUNTIME_DAYS || 30),
    autoArchiveAfterDays: Number(process.env.EXP_AUTO_ARCHIVE_AFTER_DAYS || 14),
    minLearningEvaluations: Number(process.env.EXP_MIN_LEARNING_EVALUATIONS || 3)
  },
  syncKeywords: (process.env.SYNC_KEYWORDS || "best laptops,best headphones,best kitchen appliances")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  amazon: {
    accessKey: process.env.AMAZON_ACCESS_KEY || "",
    secretKey: process.env.AMAZON_SECRET_KEY || "",
    partnerTag: process.env.AMAZON_PARTNER_TAG || "",
    host: process.env.AMAZON_HOST || "webservices.amazon.com",
    region: process.env.AMAZON_REGION || "us-east-1",
    marketplace: process.env.AMAZON_MARKETPLACE || "www.amazon.com"
  },
  regionAffiliate: {
    tags: {
      US: process.env.AFFILIATE_TAG_US || process.env.AMAZON_PARTNER_TAG || "pickfast-20",
      UK: process.env.AFFILIATE_TAG_UK || process.env.AMAZON_PARTNER_TAG || "pickfast-20",
      IN: process.env.AFFILIATE_TAG_IN || process.env.AMAZON_PARTNER_TAG || "pickfast-20",
      CA: process.env.AFFILIATE_TAG_CA || process.env.AMAZON_PARTNER_TAG || "pickfast-20"
    },
    hosts: {
      US: "www.amazon.com",
      UK: "www.amazon.co.uk",
      IN: "www.amazon.in",
      CA: "www.amazon.ca"
    },
    defaultRegion: process.env.DEFAULT_AFFILIATE_REGION || "US"
  },
  commissionRules
};

module.exports = {
  config
};