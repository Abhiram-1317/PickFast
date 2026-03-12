export function CardSkeleton({ count = 6 }) {
  return Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className="animate-pulse rounded-2xl border border-slate-200 bg-white"
    >
      <div className="aspect-4/3 w-full rounded-t-2xl bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-16 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-6 w-20 rounded bg-slate-200" />
        <div className="h-9 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  ));
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-slate-200" />
        <div className="space-y-4 py-4">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-10 w-32 rounded bg-slate-200" />
          <div className="h-10 w-48 rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200">
      <div className="flex gap-4 bg-slate-50 px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-t border-slate-100 px-4 py-3">
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="h-4 flex-1 rounded bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  );
}
