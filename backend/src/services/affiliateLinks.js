const { URL } = require("url");
const { config } = require("../config");

function normalizeRegion(inputRegion) {
  if (!inputRegion) {
    return config.regionAffiliate.defaultRegion;
  }

  const upper = String(inputRegion).toUpperCase();
  if (upper === "GB") {
    return "UK";
  }

  return config.regionAffiliate.tags[upper] ? upper : config.regionAffiliate.defaultRegion;
}

function inferRegionFromRequest(req) {
  const queryRegion = req.query.region;
  if (queryRegion) {
    return normalizeRegion(queryRegion);
  }

  const explicitHeaderRegion = req.header("x-region");
  if (explicitHeaderRegion) {
    return normalizeRegion(explicitHeaderRegion);
  }

  const acceptLanguage = req.header("accept-language") || "";
  const lowered = acceptLanguage.toLowerCase();

  if (lowered.includes("en-in") || lowered.includes("hi-in")) {
    return "IN";
  }
  if (lowered.includes("en-gb")) {
    return "UK";
  }
  if (lowered.includes("en-ca") || lowered.includes("fr-ca")) {
    return "CA";
  }

  return config.regionAffiliate.defaultRegion;
}

function buildAffiliateLink(baseAmazonUrl, region) {
  const safeRegion = normalizeRegion(region);
  const host = config.regionAffiliate.hosts[safeRegion] || config.regionAffiliate.hosts.US;
  const tag = config.regionAffiliate.tags[safeRegion] || config.regionAffiliate.tags.US;

  if (!baseAmazonUrl) {
    return null;
  }

  try {
    const parsed = new URL(baseAmazonUrl);
    parsed.hostname = host;
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch (error) {
    return baseAmazonUrl;
  }
}

function withRegionAffiliateUrl(product, region) {
  return {
    ...product,
    affiliateRegion: normalizeRegion(region),
    affiliateUrl: buildAffiliateLink(product.amazonUrl, region)
  };
}

module.exports = {
  normalizeRegion,
  inferRegionFromRequest,
  buildAffiliateLink,
  withRegionAffiliateUrl
};