function toCountMap(list = []) {
  const map = new Map();
  list.forEach((value) => {
    if (!value) {
      return;
    }
    map.set(value, (map.get(value) || 0) + 1);
  });
  return map;
}

function mapToSortedArray(map, limit = 3) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, weight]) => ({ name, weight }));
}

function average(values = []) {
  if (!values.length) {
    return null;
  }
  return Number((values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length).toFixed(2));
}

function buildProfileFromEvents(events = [], fallbackRegion = "US") {
  const categoryEvents = events.map((event) => event.category).filter(Boolean);
  const categoryMap = toCountMap(categoryEvents);
  const topCategories = mapToSortedArray(categoryMap, 4);

  const priceSignals = events
    .map((event) => event.price)
    .filter((price) => price !== null && price !== undefined && !Number.isNaN(Number(price)));

  const preferredRegion = events.find((event) => event.region)?.region || fallbackRegion;
  const confidenceScore = Math.min(1, events.length / 30);

  return {
    topCategories,
    preferredPrice: average(priceSignals),
    preferredRegion,
    confidenceScore: Number(confidenceScore.toFixed(2))
  };
}

function getPersonalizedRecommendations(products = [], profile, limit = 12) {
  const categoryWeightMap = new Map((profile?.topCategories || []).map((item) => [item.name, item.weight]));
  const preferredPrice = profile?.preferredPrice;

  const ranked = products
    .map((product) => {
      let bonus = 0;

      const categoryWeight = categoryWeightMap.get(product.category) || 0;
      bonus += categoryWeight * 2.5;

      if (preferredPrice) {
        const distance = Math.abs(Number(product.price) - preferredPrice);
        const priceAffinity = Math.max(0, 1 - distance / Math.max(preferredPrice, 1));
        bonus += priceAffinity * 18;
      }

      const finalScore = Number((Number(product.score || 0) + bonus).toFixed(2));

      return {
        ...product,
        personalizationBonus: Number(bonus.toFixed(2)),
        personalizedScore: finalScore
      };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, Number(limit));

  return ranked;
}

module.exports = {
  buildProfileFromEvents,
  getPersonalizedRecommendations
};