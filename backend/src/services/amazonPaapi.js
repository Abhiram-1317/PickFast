const aws4 = require("aws4");
const { config } = require("../config");
const { getCommissionRate } = require("./commissionRules");

function ensureAmazonCredentials() {
  const { accessKey, secretKey, partnerTag, host, region } = config.amazon;

  if (!accessKey || !secretKey || !partnerTag || !host || !region) {
    throw new Error(
      "Amazon PA-API credentials missing. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG, AMAZON_HOST, AMAZON_REGION."
    );
  }
}

function mapSearchIndexFromKeyword(keyword) {
  const value = keyword.toLowerCase();

  if (value.includes("laptop") || value.includes("computer")) {
    return { searchIndex: "Electronics", category: "laptops", useCases: ["business", "student"] };
  }
  if (value.includes("headphone") || value.includes("earbud") || value.includes("audio")) {
    return { searchIndex: "Electronics", category: "headphones", useCases: ["music", "commute"] };
  }
  if (value.includes("kitchen") || value.includes("coffee") || value.includes("air fryer")) {
    return { searchIndex: "Kitchen", category: "kitchen", useCases: ["home", "family"] };
  }
  if (value.includes("fitness") || value.includes("watch") || value.includes("health")) {
    return { searchIndex: "SportsAndOutdoors", category: "fitness", useCases: ["fitness", "health"] };
  }

  return { searchIndex: "All", category: "general", useCases: ["general"] };
}

function createDeterministicId(asin) {
  return `amz-${asin.toLowerCase()}`;
}

function inferMonthlySalesFromReviews(reviewCount) {
  const safeCount = reviewCount || 0;
  return Math.max(100, Math.round(500 + safeCount * 1.7));
}

function inferTrendScore(reviewCount, rating) {
  const reviewComponent = Math.min(50, Math.round((reviewCount || 0) / 100));
  const ratingComponent = Math.round((rating || 0) * 10);
  return Math.min(99, Math.max(30, reviewComponent + ratingComponent));
}

function normalizeAmazonItem(item, defaults) {
  const listing = item?.Offers?.Listings?.[0];
  const price = listing?.Price?.Amount;
  const title = item?.ItemInfo?.Title?.DisplayValue;

  if (!item.ASIN || !price || !title) {
    return null;
  }

  const rating = Number(item?.CustomerReviews?.StarRating?.Value || 0);
  const reviewCount = Number(item?.CustomerReviews?.Count || 0);

  return {
    id: createDeterministicId(item.ASIN),
    name: title,
    category: defaults.category,
    brand: item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "Amazon",
    price: Number(price),
    originalPrice: Number(listing?.SavingBasis?.Amount || price),
    rating,
    reviewCount,
    commissionRate: getCommissionRate(defaults.category),
    monthlySalesEstimate: inferMonthlySalesFromReviews(reviewCount),
    stockStatus: "in_stock",
    trendScore: inferTrendScore(reviewCount, rating),
    specs: {
      asin: item.ASIN,
      isAdultProduct: Boolean(item?.ItemInfo?.ProductInfo?.IsAdultProduct?.DisplayValue)
    },
    useCases: defaults.useCases,
    amazonUrl: item?.DetailPageURL,
    image: item?.Images?.Primary?.Large?.URL || item?.Images?.Primary?.Medium?.URL || null
  };
}

async function fetchSearchItems(keyword, itemCount = 10) {
  ensureAmazonCredentials();

  const defaults = mapSearchIndexFromKeyword(keyword);

  const body = {
    PartnerTag: config.amazon.partnerTag,
    PartnerType: "Associates",
    Marketplace: config.amazon.marketplace,
    SearchIndex: defaults.searchIndex,
    Keywords: keyword,
    ItemCount: itemCount,
    Resources: [
      "Images.Primary.Large",
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.ProductInfo",
      "Offers.Listings.Price",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating"
    ]
  };

  const request = {
    host: config.amazon.host,
    method: "POST",
    path: "/paapi5/searchitems",
    service: "ProductAdvertisingAPI",
    region: config.amazon.region,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      "Content-Encoding": "amz-1.0"
    },
    body: JSON.stringify(body)
  };

  aws4.sign(request, {
    accessKeyId: config.amazon.accessKey,
    secretAccessKey: config.amazon.secretKey
  });

  const response = await fetch(`https://${config.amazon.host}${request.path}`, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items = data?.SearchResult?.Items || [];

  return items.map((item) => normalizeAmazonItem(item, defaults)).filter(Boolean);
}

async function ingestFromAmazonKeywords(keywords) {
  const imported = [];
  const seen = new Map();

  for (const keyword of keywords) {
    const items = await fetchSearchItems(keyword, 10);

    for (const item of items) {
      imported.push(item);

      if (!seen.has(item.id)) {
        seen.set(item.id, { count: 1, keywords: [keyword] });
      } else {
        const entry = seen.get(item.id);
        entry.count += 1;
        if (!entry.keywords.includes(keyword)) {
          entry.keywords.push(keyword);
        }
        seen.set(item.id, entry);
      }
    }
  }

  const unique = new Map();
  imported.forEach((item) => unique.set(item.id, item));

  const duplicates = [...seen.entries()]
    .filter(([, meta]) => meta.count > 1)
    .map(([productId, meta]) => ({
      productId,
      duplicateCount: meta.count,
      context: { keywords: meta.keywords }
    }));

  return {
    products: [...unique.values()],
    duplicates
  };
}

module.exports = {
  ingestFromAmazonKeywords
};