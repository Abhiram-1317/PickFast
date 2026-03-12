"use client";

export default function FilterBar({
  categories = [],
  selectedCategory,
  onCategoryChange,
  budget,
  onBudgetChange,
  minRating,
  onMinRatingChange,
  sortBy,
  onSortChange,
  region,
  onRegionChange,
}) {
  const inputClass =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {onCategoryChange && (
        <select
          value={selectedCategory || ""}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={inputClass}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      )}

      {onBudgetChange && (
        <input
          type="number"
          value={budget || ""}
          onChange={(e) => onBudgetChange(e.target.value)}
          placeholder="Max price"
          className={`w-32 ${inputClass}`}
          aria-label="Maximum budget"
          min="0"
        />
      )}

      {onMinRatingChange && (
        <select
          value={minRating || ""}
          onChange={(e) => onMinRatingChange(e.target.value)}
          className={inputClass}
          aria-label="Minimum rating"
        >
          <option value="">Any Rating</option>
          <option value="4">4+ Stars</option>
          <option value="3">3+ Stars</option>
          <option value="2">2+ Stars</option>
        </select>
      )}

      {onSortChange && (
        <select
          value={sortBy || "epcScore"}
          onChange={(e) => onSortChange(e.target.value)}
          className={inputClass}
          aria-label="Sort by"
        >
          <option value="epcScore">Best Match</option>
          <option value="price">Price: Low to High</option>
          <option value="rating">Highest Rated</option>
          <option value="reviewCount">Most Reviewed</option>
          <option value="score">Top Score</option>
        </select>
      )}

      {onRegionChange && (
        <select
          value={region || "IN"}
          onChange={(e) => onRegionChange(e.target.value)}
          className={inputClass}
          aria-label="Region"
        >
          <option value="IN">🇮🇳 IN</option>
          <option value="US">🇺🇸 US</option>
          <option value="UK">🇬🇧 UK</option>
          <option value="CA">🇨🇦 CA</option>
        </select>
      )}
    </div>
  );
}
