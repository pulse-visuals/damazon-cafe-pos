import React, { useState } from "react";
import { X } from "lucide-react";

const empty = {
  name: "", categoryId: "", sku: "", barcode: "", price: "", costPrice: "",
  taxRate: "0", description: "", prepTimeMinutes: "", trackStock: false,
  stockQty: "", minStock: "", available: true,
};

export default function ProductFormModal({ categories, product, onClose, onSave }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name, categoryId: product.category_id, sku: product.sku || "", barcode: product.barcode || "",
          price: product.price, costPrice: product.cost_price || "", taxRate: product.tax_rate,
          description: product.description || "", prepTimeMinutes: product.prep_time_minutes || "",
          trackStock: product.track_stock, stockQty: product.stock_qty || "", minStock: product.min_stock || "",
          available: product.available,
        }
      : { ...empty, categoryId: categories[0]?.id || "" }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: Number(form.price),
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        taxRate: Number(form.taxRate || 0),
        prepTimeMinutes: form.prepTimeMinutes ? Number(form.prepTimeMinutes) : null,
        stockQty: form.trackStock && form.stockQty !== "" ? Number(form.stockQty) : null,
        minStock: form.trackStock && form.minStock !== "" ? Number(form.minStock) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="animate-pop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl2 bg-white shadow-pop dark:bg-canopy-900">
        <div className="flex items-center justify-between border-b border-canopy-100 p-4 dark:border-canopy-800">
          <h3 className="font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">
            {product ? "Edit Product" : "New Product"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-canopy-400 hover:bg-canopy-50 dark:hover:bg-canopy-800">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          <Field label="Name" full>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" />
          </Field>
          <Field label="Category" full>
            <select required value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="input">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Price (RM)"><input required type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className="input" /></Field>
          <Field label="Cost Price (RM)"><input type="number" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} className="input" /></Field>
          <Field label="SKU"><input value={form.sku} onChange={(e) => set("sku", e.target.value)} className="input" /></Field>
          <Field label="Barcode"><input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} className="input" /></Field>
          <Field label="Tax Rate (%)"><input type="number" step="0.01" value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)} className="input" /></Field>
          <Field label="Prep Time (min)"><input type="number" value={form.prepTimeMinutes} onChange={(e) => set("prepTimeMinutes", e.target.value)} className="input" /></Field>
          <Field label="Description" full>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input" rows={2} />
          </Field>

          <div className="col-span-2 flex items-center gap-2 rounded-xl bg-canopy-50 p-3 dark:bg-canopy-800">
            <input type="checkbox" checked={form.trackStock} onChange={(e) => set("trackStock", e.target.checked)} id="trackStock" />
            <label htmlFor="trackStock" className="text-sm font-medium text-canopy-700 dark:text-canopy-200">Track stock for this item</label>
          </div>
          {form.trackStock && (
            <>
              <Field label="Stock Qty"><input type="number" value={form.stockQty} onChange={(e) => set("stockQty", e.target.value)} className="input" /></Field>
              <Field label="Min Stock (alert)"><input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} className="input" /></Field>
            </>
          )}

          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.available} onChange={(e) => set("available", e.target.checked)} id="available" />
            <label htmlFor="available" className="text-sm font-medium text-canopy-700 dark:text-canopy-200">Available for sale</label>
          </div>
        </div>

        <div className="border-t border-canopy-100 p-4 dark:border-canopy-800">
          <button disabled={saving} className="w-full rounded-xl bg-canopy-700 py-3 font-semibold text-white shadow-card hover:bg-canopy-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </form>
      <style>{`.input { width: 100%; border-radius: 0.75rem; border: 1px solid rgb(220 226 221); background: #faf6ee; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        html.dark .input { border-color: rgb(36 80 53); background: rgb(29 63 43); color: white; }`}</style>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-canopy-500 dark:text-canopy-400">{label}</label>
      {children}
    </div>
  );
}
