const { all, get, run } = require("./database");
const crypto = require("crypto");

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image,
    category: row.category,
    asin: row.asin || null,
    amazonUrl: row.amazon_url,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
    createdAt: row.created_at,
    source: row.source
  };
}

async function slugExists(slug, excludeId = null) {
  const row = await get(
    excludeId
      ? "SELECT 1 FROM products WHERE slug = $1 AND id <> $2"
      : "SELECT 1 FROM products WHERE slug = $1",
    excludeId ? [slug, excludeId] : [slug]
  );
  return Boolean(row);
}

async function generateUniqueSlug(title, excludeId = null) {
  const base = toSlug(title) || `product-${crypto.randomBytes(4).toString("hex")}`;
  let candidate = base;
  let counter = 1;

  while (await slugExists(candidate, excludeId)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function ensureUniqueSlug(preferred, titleFallback, excludeId = null) {
  const base = toSlug(preferred) || toSlug(titleFallback);
  if (!base) {
    return generateUniqueSlug(titleFallback || "product", excludeId);
  }
  if (!(await slugExists(base, excludeId))) {
    return base;
  }
  return generateUniqueSlug(base, excludeId);
}

function validateInput(payload) {
  const errors = [];
  const title = String(payload.title || "").trim();
  const amazonUrl = String(payload.amazon_url || payload.amazonUrl || "").trim();
  const priceValue = payload.price;
  const price = priceValue === undefined || priceValue === null ? NaN : Number(priceValue);

  if (!title) {
    errors.push("title is required");
  }
  if (!amazonUrl) {
    errors.push("amazon_url is required");
  }
  if (!Number.isFinite(price)) {
    errors.push("price must be numeric");
  }

  return { title, amazonUrl, price, errors };
}

async function listAdminProducts() {
  const rows = await all(
    "SELECT * FROM products WHERE source = 'manual' ORDER BY created_at DESC",
    []
  );
  return rows.map(mapRow);
}

async function createAdminProduct(payload) {
  const { title, amazonUrl, price, errors } = validateInput(payload);
  if (errors.length) {
    return { error: errors.join(", ") };
  }

  const slug = await ensureUniqueSlug(payload.slug, title);
  const description = payload.description || null;
  const image = payload.image_url || payload.imageUrl || null;
  const category = payload.category || "general";
  const asin = payload.asin || null;
  const ratingValue = payload.rating;
  const rating = ratingValue === undefined || ratingValue === null ? null : Number(ratingValue);

  if (rating !== null && !Number.isFinite(rating)) {
    return { error: "rating must be numeric when provided" };
  }

  const id = `manual-${crypto.randomBytes(6).toString("hex")}`;

  const row = await get(
    `INSERT INTO products (
      id, slug, name, description, category, brand, asin, price, rating, review_count,
      commission_rate, monthly_sales_estimate, stock_status, trend_score,
      specs_json, use_cases_json, amazon_url, image, source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0, 'in_stock', 50, '{}', '[]', $10, $11, 'manual')
    RETURNING *`,
    [id, slug, title, description, category, null, asin, price, rating, amazonUrl, image]
  );

  return { product: mapRow(row) };
}

async function updateAdminProduct(id, payload) {
  const existing = await get("SELECT * FROM products WHERE id = $1 AND source = 'manual'", [id]);
  if (!existing) {
    return { notFound: true };
  }

  const title = payload.title !== undefined ? String(payload.title || "").trim() : existing.name;
  const description = payload.description !== undefined ? payload.description : existing.description;
  const image = payload.image_url || payload.imageUrl || existing.image;
  const category = payload.category !== undefined ? payload.category || "general" : existing.category;
  const asin = payload.asin !== undefined ? payload.asin : existing.asin;

  const amazonUrl =
    payload.amazon_url !== undefined || payload.amazonUrl !== undefined
      ? String(payload.amazon_url || payload.amazonUrl || "").trim()
      : existing.amazon_url;

  const priceValue = payload.price !== undefined ? payload.price : existing.price;
  const price = priceValue === null || priceValue === undefined ? NaN : Number(priceValue);

  const ratingValue = payload.rating !== undefined ? payload.rating : existing.rating;
  const rating = ratingValue === null || ratingValue === undefined ? null : Number(ratingValue);

  const errors = [];
  if (!title) errors.push("title is required");
  if (!amazonUrl) errors.push("amazon_url is required");
  if (!Number.isFinite(price)) errors.push("price must be numeric");
  if (rating !== null && !Number.isFinite(rating)) errors.push("rating must be numeric when provided");

  if (errors.length) {
    return { error: errors.join(", ") };
  }

  let slug = existing.slug;
  const wantsSlug = payload.slug !== undefined ? payload.slug : null;
  if (wantsSlug !== null) {
    const proposed = await ensureUniqueSlug(wantsSlug, title, id);
    slug = proposed || existing.slug;
  } else if (payload.title !== undefined && payload.title !== existing.name) {
    slug = await ensureUniqueSlug(existing.slug, title, id);
  }

  const row = await get(
    `UPDATE products
     SET slug = $1, name = $2, description = $3, category = $4, asin = $5,
       price = $6, amazon_url = $7, image = $8, rating = $9, updated_at = NOW()
     WHERE id = $10 AND source = 'manual'
     RETURNING *`,
    [slug, title, description, category, asin, price, amazonUrl, image, rating, id]
  );

  return { product: mapRow(row) };
}

async function deleteAdminProduct(id) {
  const row = await get("DELETE FROM products WHERE id = $1 AND source = 'manual' RETURNING *", [id]);
  return { deleted: Boolean(row) };
}

module.exports = {
  listAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct
};
