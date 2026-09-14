import React, { useEffect, useState } from "react";
import { Plus, Pencil, EyeOff, Eye, FolderPlus } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import ProductFormModal from "../components/ProductFormModal";

export default function Products() {
  const { fmt } = useSettings();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editing, setEditing] = useState(null); // product or "new" or null
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [cats, prods] = await Promise.all([api.get("/categories"), api.get("/products?includeUnavailable=1")]);
    setCategories(cats);
    setProducts(prods);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = activeCategory === "all" ? products : products.filter((p) => p.category_id === activeCategory);

  const saveProduct = async (form) => {
    try {
      if (editing && editing !== "new") {
        await api.patch(`/products/${editing.id}`, form);
        toast.success("Product updated");
      } else {
        await api.post("/products", form);
        toast.success("Product created");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleAvailable = async (p) => {
    try {
      await api.patch(`/products/${p.id}`, { available: !p.available });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await api.post("/categories", { name: newCategoryName.trim(), sortOrder: categories.length + 1 });
      setNewCategoryName("");
      load();
      toast.success("Category added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">Products & Categories</h1>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl bg-canopy-700 px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-canopy-600"
        >
          <Plus size={16} /> New Product
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeCategory === "all" ? "bg-canopy-700 text-white" : "bg-canopy-50 text-canopy-600 dark:bg-canopy-800 dark:text-canopy-300"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeCategory === c.id ? "bg-canopy-700 text-white" : "bg-canopy-50 text-canopy-600 dark:bg-canopy-800 dark:text-canopy-300"}`}
          >
            {c.icon} {c.name}
          </button>
        ))}
        <div className="ml-2 flex items-center gap-1">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category…"
            className="w-32 rounded-full border border-canopy-200 bg-white px-3 py-1.5 text-sm dark:border-canopy-700 dark:bg-canopy-900"
          />
          <button onClick={addCategory} className="rounded-full p-1.5 text-canopy-500 hover:bg-canopy-50 dark:hover:bg-canopy-800">
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-canopy-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-canopy-100 bg-white dark:border-canopy-800 dark:bg-canopy-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-canopy-100 text-left text-xs uppercase tracking-wide text-canopy-500 dark:border-canopy-800 dark:text-canopy-400">
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-canopy-50 hover:bg-canopy-50/50 dark:border-canopy-800 dark:hover:bg-canopy-800/50">
                  <td className="p-3 font-medium text-canopy-900 dark:text-canopy-50">{p.name}</td>
                  <td className="p-3 text-canopy-500 dark:text-canopy-400">{p.category_name}</td>
                  <td className="p-3 text-canopy-500 dark:text-canopy-400">{p.sku || "—"}</td>
                  <td className="p-3 text-right font-display font-semibold text-canopy-700 dark:text-amber-300">{fmt(p.price)}</td>
                  <td className="p-3 text-right text-canopy-500 dark:text-canopy-400">
                    {p.track_stock ? `${p.stock_qty ?? 0}${Number(p.stock_qty) <= Number(p.min_stock) ? " ⚠️" : ""}` : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.available ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-canopy-100 text-canopy-500 dark:bg-canopy-800"}`}>
                      {p.available ? "Available" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-canopy-500 hover:bg-canopy-100 dark:hover:bg-canopy-800">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggleAvailable(p)} className="rounded-lg p-1.5 text-canopy-500 hover:bg-canopy-100 dark:hover:bg-canopy-800">
                        {p.available ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductFormModal
          categories={categories}
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}
