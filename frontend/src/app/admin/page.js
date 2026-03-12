"use client";

import { useState, useEffect, useRef } from "react";
import { ErrorState } from "../../components/StatusStates";
import { TableSkeleton } from "../../components/Skeletons";

const STORAGE_KEY = "pickfast_admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function apiBase() {
  if (typeof window !== "undefined") return "";
  return "http://localhost:4000";
}

function Badge({ color = "green", children }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    yellow: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    gray: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="glass-card rounded-2xl p-5 text-center">
      {icon && <div className="mx-auto mb-2 text-2xl">{icon}</div>}
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value ?? "\u2014"}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* Image / Video Upload Widget */
function MediaUploader({ value, onChange, token }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");

  useEffect(() => { setPreview(value || ""); }, [value]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${apiBase()}/api/admin/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, data: base64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setPreview(json.url);
      onChange(json.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  const isVideo = /\.(mp4|webm)$/i.test(preview);

  return (
    <div className="space-y-2">
      <div onClick={() => fileRef.current?.click()}
        className="group relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 transition hover:border-emerald-400 hover:bg-emerald-50/30">
        {preview ? (
          isVideo ? (
            <video src={preview} className="h-full w-full rounded-xl object-cover" muted autoPlay loop />
          ) : (
            <img src={preview} alt="Preview" className="h-full w-full rounded-xl object-cover" />
          )
        ) : (
          <div className="text-center">
            <div className="text-3xl text-slate-300 group-hover:text-emerald-400 transition">{"\uD83D\uDCF8"}</div>
            <p className="mt-1 text-xs text-slate-400">Click to upload image or video</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" onChange={handleFile} className="hidden" />
      <input type="text" value={value || ""} onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
        placeholder="Or paste image/video URL" className="admin-input w-full" />
    </div>
  );
}

/* Product Form Modal */
function ProductFormModal({ product, onSave, onCancel, token }) {
  const isEdit = Boolean(product?.id);
  const [form, setForm] = useState({
    title: product?.title || "", description: product?.description || "",
    price: product?.price || "", category: product?.category || "",
    amazonUrl: product?.amazonUrl || "", imageUrl: product?.imageUrl || "",
    asin: product?.asin || "", rating: product?.rating || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const url = isEdit ? `${apiBase()}/api/admin/products/${product.id}` : `${apiBase()}/api/admin/products`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title, description: form.description, price: Number(form.price),
          category: form.category, amazon_url: form.amazonUrl, image_url: form.imageUrl,
          asin: form.asin, rating: form.rating ? Number(form.rating) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSave(json.product);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Product" : "Add New Product"}</h2>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div>
          <label className="admin-label">Image / Video</label>
          <MediaUploader value={form.imageUrl} onChange={(v) => set("imageUrl", v)} token={token} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="admin-label">Product Name *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} required className="admin-input w-full" placeholder="e.g. Sony WH-1000XM5" />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="admin-input w-full resize-none" placeholder="Product description..." />
          </div>
          <div>
            <label className="admin-label">{`Price (\u20B9) *`}</label>
            <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} required className="admin-input w-full" />
          </div>
          <div>
            <label className="admin-label">Category</label>
            <input value={form.category} onChange={(e) => set("category", e.target.value)} className="admin-input w-full" placeholder="e.g. Headphones" />
          </div>
          <div>
            <label className="admin-label">Amazon URL *</label>
            <input value={form.amazonUrl} onChange={(e) => set("amazonUrl", e.target.value)} required className="admin-input w-full" placeholder="https://amazon.in/dp/..." />
          </div>
          <div>
            <label className="admin-label">ASIN</label>
            <input value={form.asin} onChange={(e) => set("asin", e.target.value)} className="admin-input w-full" placeholder="B09XS7JWHH" />
          </div>
          <div>
            <label className="admin-label">Rating (0-5)</label>
            <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set("rating", e.target.value)} className="admin-input w-full" />
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* Main Admin Page */
export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [health, setHealth] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [priceChanges, setPriceChanges] = useState([]);
  const [clicks, setClicks] = useState(null);
  const [experiments, setExperiments] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => { const saved = getToken(); if (saved) setToken(saved); }, []);

  useEffect(() => {
    if (!token) return;
    loadDashboard(); loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/admin/products`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setProducts(json.products || []);
    } catch { /* ignore */ } finally { setProductsLoading(false); }
  }

  async function handleDeleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`${apiBase()}/api/admin/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  }

  async function loadDashboard() {
    setDashLoading(true); setDashError("");
    const headers = { Authorization: `Bearer ${token}` };
    const opts = { headers };
    try {
      const base = apiBase();
      const [hRes, sRes, pRes, cRes, eRes, wRes] = await Promise.allSettled([
        fetch(`${base}/api/health`).then((r) => r.json()),
        fetch(`${base}/api/admin/sync-logs`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/price-changes`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/clicks/summary`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/experiments/summary`, opts).then((r) => r.json()),
        fetch(`${base}/api/admin/weekly-pm-report`, opts).then((r) => r.json()),
      ]);
      if (hRes.status === "fulfilled") setHealth(hRes.value);
      if (sRes.status === "fulfilled") setSyncLogs(sRes.value?.logs || sRes.value || []);
      if (pRes.status === "fulfilled") setPriceChanges(pRes.value?.changes || pRes.value || []);
      if (cRes.status === "fulfilled") setClicks(cRes.value);
      if (eRes.status === "fulfilled") setExperiments(eRes.value);
      if (wRes.status === "fulfilled") setWeeklyReport(wRes.value);
    } catch (err) { setDashError(err.message); } finally { setDashLoading(false); }
  }

  async function handleLogin(e) {
    e.preventDefault(); setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch(`${apiBase()}/api/admin/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || "Invalid credentials"); }
      const data = await res.json();
      const t = data.token || data.apiKey;
      if (!t) throw new Error("No token received");
      localStorage.setItem(STORAGE_KEY, t); setToken(t); setPassword("");
    } catch (err) { setLoginError(err.message); } finally { setLoginLoading(false); }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY); setToken(null);
    setHealth(null); setSyncLogs([]); setPriceChanges([]);
    setClicks(null); setExperiments(null); setWeeklyReport(null); setProducts([]);
  }

  if (!token) {
    return (
      <main className="fade-in flex min-h-[60vh] items-center justify-center px-4">
        <form onSubmit={handleLogin} className="glass-card w-full max-w-sm rounded-2xl p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl shadow-lg shadow-emerald-500/30">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to the PickFast dashboard</p>
          </div>
          <label className="block">
            <span className="admin-label">Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" className="admin-input w-full" />
          </label>
          <label className="block">
            <span className="admin-label">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="admin-input w-full" />
          </label>
          {loginError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 disabled:opacity-50">
            {loginLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </main>
    );
  }

  const tabs = [
    { key: "products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { key: "overview", label: "Overview", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { key: "sync", label: "Sync", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
    { key: "prices", label: "Prices", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { key: "clicks", label: "Clicks", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" },
    { key: "experiments", label: "Experiments", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { key: "weekly", label: "Weekly", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  ];

  return (
    <main className="fade-in mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {showForm && (
        <ProductFormModal product={editProduct} token={token}
          onCancel={() => { setShowForm(false); setEditProduct(null); }}
          onSave={() => { setShowForm(false); setEditProduct(null); loadProducts(); }} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage products, monitor performance, and optimize your catalog.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { loadDashboard(); loadProducts(); }} disabled={dashLoading} className="glass-btn">{dashLoading ? "Refreshing..." : "Refresh"}</button>
          <button type="button" onClick={handleLogout} className="glass-btn text-red-600 hover:bg-red-50">Logout</button>
        </div>
      </div>
      {dashError && <div className="mt-4"><ErrorState message={dashError} onRetry={loadDashboard} /></div>}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/40 bg-white/50 p-1.5 backdrop-blur-lg shadow-sm">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === t.key ? "bg-white text-emerald-700 shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {dashLoading && activeTab !== "products" && <TableSkeleton rows={4} cols={5} />}

        {activeTab === "products" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Manual Products ({products.length})</h2>
              <button type="button" onClick={() => { setEditProduct(null); setShowForm(true); }}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40">+ Add Product</button>
            </div>
            {productsLoading ? <TableSkeleton rows={3} cols={5} /> : products.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <h3 className="mt-4 text-lg font-bold text-slate-900">No products yet</h3>
                <p className="mt-2 text-sm text-slate-500">Click &quot;Add Product&quot; to create your first product.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div key={p.id} className="glass-card group overflow-hidden rounded-2xl transition hover:shadow-xl">
                    <div className="aspect-video overflow-hidden bg-slate-100">
                      {p.imageUrl ? (/\.(mp4|webm)$/i.test(p.imageUrl) ? (
                        <video src={p.imageUrl} className="h-full w-full object-cover" muted autoPlay loop />
                      ) : (
                        <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      )) : (
                        <div className="flex h-full items-center justify-center">
                          <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{p.title}</h3>
                        <Badge color="blue">{p.category || "General"}</Badge>
                      </div>
                      <p className="text-lg font-extrabold text-emerald-600">{`\u20B9${Number(p.price || 0).toLocaleString("en-IN")}`}</p>
                      {p.rating != null && <div className="flex items-center gap-1 text-xs text-amber-500">{`\u2B50 ${Number(p.rating).toFixed(1)}`}</div>}
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => { setEditProduct(p); setShowForm(true); }}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600">Edit</button>
                        <button type="button" onClick={() => handleDeleteProduct(p.id)}
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!dashLoading && activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Status" value={health?.status === "ok" ? <Badge color="green">Healthy</Badge> : <Badge color="red">Down</Badge>} />
              <StatCard label="Products" value={health?.totalProducts ?? "\u2014"} />
              <StatCard label="Sync Logs" value={Array.isArray(syncLogs) ? syncLogs.length : 0} />
              <StatCard label="Price Changes" value={Array.isArray(priceChanges) ? priceChanges.length : 0} />
            </div>
            {weeklyReport && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-700">Weekly PM Summary</h3>
                <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-slate-50/80 p-4 text-xs text-slate-600">{JSON.stringify(weeklyReport, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {!dashLoading && activeTab === "sync" && (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b border-slate-100/50 bg-slate-50/50">
                  <th className="px-4 py-3 font-bold text-slate-600">Type</th><th className="px-4 py-3 font-bold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Items</th><th className="px-4 py-3 font-bold text-slate-600">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Message</th>
                </tr></thead>
                <tbody>{(Array.isArray(syncLogs) ? syncLogs : []).map((log, i) => (
                  <tr key={log.id || i} className="border-b border-slate-50/50 transition hover:bg-white/60">
                    <td className="px-4 py-2 font-medium text-slate-800">{log.syncType || log.type || "\u2014"}</td>
                    <td className="px-4 py-2"><Badge color={log.status === "success" ? "green" : "red"}>{log.status}</Badge></td>
                    <td className="px-4 py-2">{log.itemsProcessed ?? "\u2014"}</td>
                    <td className="px-4 py-2 text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : "\u2014"}</td>
                    <td className="max-w-50 truncate px-4 py-2 text-slate-500">{log.message || "\u2014"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {(!Array.isArray(syncLogs) || syncLogs.length === 0) && <p className="p-6 text-center text-sm text-slate-400">No sync logs found.</p>}
          </div>
        )}

        {!dashLoading && activeTab === "prices" && (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b border-slate-100/50 bg-slate-50/50">
                  <th className="px-4 py-3 font-bold text-slate-600">Product</th><th className="px-4 py-3 font-bold text-slate-600">Old</th>
                  <th className="px-4 py-3 font-bold text-slate-600">New</th><th className="px-4 py-3 font-bold text-slate-600">Change</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Date</th>
                </tr></thead>
                <tbody>{(Array.isArray(priceChanges) ? priceChanges : []).map((pc, i) => {
                  const diff = (Number(pc.newPrice) - Number(pc.oldPrice)).toFixed(2);
                  return (
                    <tr key={pc.id || i} className="border-b border-slate-50/50 transition hover:bg-white/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{pc.productId || pc.name || "\u2014"}</td>
                      <td className="px-4 py-2">{`\u20B9${Number(pc.oldPrice || 0).toFixed(2)}`}</td>
                      <td className="px-4 py-2 font-semibold">{`\u20B9${Number(pc.newPrice || 0).toFixed(2)}`}</td>
                      <td className={`px-4 py-2 font-semibold ${diff > 0 ? "text-red-600" : "text-emerald-600"}`}>{diff > 0 ? "+" : ""}{diff}</td>
                      <td className="px-4 py-2 text-slate-500">{pc.createdAt ? new Date(pc.createdAt).toLocaleDateString() : "\u2014"}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {(!Array.isArray(priceChanges) || priceChanges.length === 0) && <p className="p-6 text-center text-sm text-slate-400">No price changes recorded.</p>}
          </div>
        )}

        {!dashLoading && activeTab === "clicks" && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-700">Click Summary</h3>
            {clicks ? <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-50/80 p-4 text-xs text-slate-600">{JSON.stringify(clicks, null, 2)}</pre>
              : <p className="mt-4 text-sm text-slate-400">No click data available.</p>}
          </div>
        )}

        {!dashLoading && activeTab === "experiments" && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-700">Experiments Summary</h3>
            {experiments ? <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-50/80 p-4 text-xs text-slate-600">{JSON.stringify(experiments, null, 2)}</pre>
              : <p className="mt-4 text-sm text-slate-400">No experiment data available.</p>}
          </div>
        )}

        {!dashLoading && activeTab === "weekly" && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-700">Weekly PM Report</h3>
            {weeklyReport ? <pre className="mt-3 max-h-125 overflow-auto rounded-xl bg-slate-50/80 p-4 text-xs text-slate-600">{JSON.stringify(weeklyReport, null, 2)}</pre>
              : <p className="mt-4 text-sm text-slate-400">No weekly report available.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
