"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../lib/api";

const ADMIN_KEY_STORAGE = "pickfast_admin_api_key";

function buildHeaders(apiKey, extra = {}) {
  const headers = { ...(extra || {}) };
  if (apiKey) {
    headers["x-admin-key"] = apiKey;
  }
  return headers;
}

async function requestJson(path, options = {}, apiKey) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: buildHeaders(apiKey, {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }),
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

const EMPTY_PRODUCT = {
  title: "",
  description: "",
  price: "",
  image_url: "",
  category: "",
  asin: "",
  amazon_url: "",
  rating: ""
};

export default function AdminProductsPage() {
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  useEffect(() => {
    const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (storedKey) {
      setApiKey(storedKey);
      setIsAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed || !apiKey) return;
    refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, apiKey]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Login failed");
      }

      const key = payload.apiKey;
      setApiKey(key);
      localStorage.setItem(ADMIN_KEY_STORAGE, key);
      setIsAuthed(true);
      setError("");
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setIsAuthed(false);
    setApiKey("");
    setUsername("");
    setPassword("");
    setProducts([]);
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setError("");
    setSuccess("");
  }

  async function refreshProducts() {
    if (!apiKey) return;
    setLoading(true);
    setError("");
    try {
      const payload = await requestJson("/api/admin/products", { method: "GET" }, apiKey);
      setProducts(payload.products || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      title: product.title || "",
      description: product.description || "",
      price: product.price ?? "",
      image_url: product.imageUrl || "",
      category: product.category || "",
      asin: product.asin || "",
      amazon_url: product.amazonUrl || "",
      rating: product.rating ?? ""
    });
    setSuccess("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!apiKey) {
      setError("Enter Admin API key first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        price: form.price === "" ? "" : Number(form.price),
        rating: form.rating === "" ? null : Number(form.rating)
      };

      if (isEditing) {
        await requestJson(`/api/admin/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        }, apiKey);
        setSuccess("Product updated");
      } else {
        await requestJson("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload)
        }, apiKey);
        setSuccess("Product created");
      }

      resetForm();
      await refreshProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!apiKey) return;
    const confirmDelete = window.confirm("Delete this product?");
    if (!confirmDelete) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await requestJson(`/api/admin/products/${id}`, { method: "DELETE" }, apiKey);
      if (editingId === id) {
        resetForm();
      }
      await refreshProducts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Admin</p>
        <h1 className="text-3xl font-bold text-slate-900">Manual Products</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use your Admin API key to create, edit, and delete products while PA-API access is pending.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!isAuthed ? (
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleLogin}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/3"
              type="text"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-1/3"
              type="password"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Login
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-700">✓ Authenticated as Admin</p>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Logout
            </button>
          </div>
        )}
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? "Edit product" : "New product"}
          </h2>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-semibold text-slate-600"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <input
            required
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Title *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            value={form.amazon_url}
            onChange={(event) => updateField("amazon_url", event.target.value)}
            placeholder="Amazon URL *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => updateField("price", event.target.value)}
            placeholder="Price *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={form.rating}
            onChange={(event) => updateField("rating", event.target.value)}
            placeholder="Rating (optional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            placeholder="Category"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.asin}
            onChange={(event) => updateField("asin", event.target.value)}
            placeholder="ASIN"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.image_url}
            onChange={(event) => updateField("image_url", event.target.value)}
            placeholder="Image URL"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Description"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isEditing ? "Update product" : "Create product"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <button
            type="button"
            onClick={refreshProducts}
            className="text-sm font-semibold text-slate-600"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {!isAuthed ? (
          <p className="mt-3 text-sm text-slate-600">Enter your Admin API key to view products.</p>
        ) : loading && products.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No products yet. Create one above.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 border border-slate-200">
            {products.map((product) => (
              <div key={product.id} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{product.title}</p>
                  <p className="text-xs text-slate-500">Slug: {product.slug}</p>
                  <p className="text-xs text-slate-500">Price: {product.price}</p>
                  <p className="text-xs text-slate-500">Amazon: {product.amazonUrl}</p>
                  {product.category ? (
                    <p className="text-xs text-slate-500">Category: {product.category}</p>
                  ) : null}
                </div>
                <div className="flex gap-2 justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
