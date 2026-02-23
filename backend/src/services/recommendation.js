function compareProducts(products) {
  if (!products.length) {
    return null;
  }

  const cheapest = [...products].sort((a, b) => a.price - b.price)[0];
  const highestRated = [...products].sort((a, b) => b.rating - a.rating)[0];
  const bestOverall = [...products].sort((a, b) => b.score - a.score)[0];

  return {
    winners: {
      budget: { id: cheapest.id, name: cheapest.name },
      performance: { id: highestRated.id, name: highestRated.name },
      overall: { id: bestOverall.id, name: bestOverall.name }
    }
  };
}

function getSimilarProducts(baseProduct, products, options = {}) {
  const maxResults = options.limit || 4;
  const lowerBound = baseProduct.price * 0.8;
  const upperBound = baseProduct.price * 1.2;

  return products
    .filter((product) => product.id !== baseProduct.id)
    .map((candidate) => {
      let score = 0;

      if (candidate.category === baseProduct.category) {
        score += 45;
      }
      if (candidate.price >= lowerBound && candidate.price <= upperBound) {
        score += 20;
      }

      const sharedUseCases = candidate.useCases.filter((useCase) =>
        baseProduct.useCases.includes(useCase)
      ).length;
      score += sharedUseCases * 8;
      score += candidate.rating * 3;
      score += candidate.score * 0.12;

      return { ...candidate, similarityScore: Number(score.toFixed(2)) };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);
}

module.exports = {
  compareProducts,
  getSimilarProducts
};