import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";

export default function Settings() {
  const { settings, reload } = useSettings();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!form) return <div className="p-6 text-canopy-400">Loading…</div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/settings", {
        cafe_name: form.cafe_name, tagline: form.tagline, address: form.address, phone: form.phone,
        email: form.email, currency: form.currency, currency_symbol: form.currency_symbol,
        tax_rate: Number(form.tax_rate), service_charge_rate: Number(form.service_charge_rate),
        receipt_footer: form.receipt_footer,
      });
      toast.success("Settings saved");
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-5 font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">Settings</h1>
      <form onSubmit={save} className="max-w-2xl rounded-xl2 border border-canopy-100 bg-white p-5 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
        <h3 className="mb-3 font-semibold text-canopy-800 dark:text-canopy-100">Cafe Information</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cafe Name"><input value={form.cafe_name} onChange={(e) => set("cafe_name", e.target.value)} className="input" /></Field>
          <Field label="Tagline"><input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className="input" /></Field>
          <Field label="Phone"><input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} className="input" /></Field>
          <Field label="Email"><input value={form.email || ""} onChange={(e) => set("email", e.target.value)} className="input" /></Field>
          <Field label="Address" full><input value={form.address || ""} onChange={(e) => set("address", e.target.value)} className="input" /></Field>
        </div>

        <h3 className="mb-3 mt-6 font-semibold text-canopy-800 dark:text-canopy-100">Currency & Tax</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Currency Code"><input value={form.currency} onChange={(e) => set("currency", e.target.value)} className="input" /></Field>
          <Field label="Symbol"><input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} className="input" /></Field>
          <Field label="Tax Rate (%)"><input type="number" step="0.01" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} className="input" /></Field>
          <Field label="Service Charge (%)"><input type="number" step="0.01" value={form.service_charge_rate} onChange={(e) => set("service_charge_rate", e.target.value)} className="input" /></Field>
        </div>

        <h3 className="mb-3 mt-6 font-semibold text-canopy-800 dark:text-canopy-100">Receipt</h3>
        <Field label="Footer Message" full><input value={form.receipt_footer} onChange={(e) => set("receipt_footer", e.target.value)} className="input" /></Field>

        <button disabled={saving} className="mt-6 flex items-center gap-2 rounded-xl bg-canopy-700 px-5 py-3 font-semibold text-white shadow-card hover:bg-canopy-600 disabled:opacity-60">
          <Save size={16} /> {saving ? "Saving…" : "Save Settings"}
        </button>
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
