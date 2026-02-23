function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettifyCategory(category) {
  return String(category || "products").replace(/-/g, " ");
}

function buildIntentPages({ categories = [], budgets = [100, 200, 500, 1000] }) {
  const intents = [];

  categories.forEach((category) => {
    budgets.forEach((budget) => {
      const slug = `best-${slugify(category)}-under-${budget}`;
      intents.push({
        slug,
        type: "best_under_budget",
        category,
        budget,
        title: `Best ${prettifyCategory(category)} under $${budget}`,
        description: `Top ${prettifyCategory(category)} under $${budget}, ranked by EPC and commission potential.`,
        filters: {
          category,
          maxPrice: budget,
          sortBy: "epcScore",
          order: "desc",
          limit: 12
        }
      });
    });

    intents.push({
      slug: `best-${slugify(category)}-for-beginners`,
      type: "beginners",
      category,
      budget: null,
      title: `Best ${prettifyCategory(category)} for beginners`,
      description: `Beginner-friendly ${prettifyCategory(category)} ranked by value and easier buying decisions.`,
      filters: {
        category,
        minRating: 4,
        sortBy: "score",
        order: "desc",
        limit: 12
      }
    });
  });

  return intents;
}

function getIntentBySlug(slug, intents) {
  return intents.find((intent) => intent.slug === slug) || null;
}

module.exports = {
  buildIntentPages,
  getIntentBySlug
};