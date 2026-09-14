import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";

const empty = { name: "", username: "", email: "", password: "", role: "CASHIER" };

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/users").then(setUsers).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success("Staff account created");
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">Staff Accounts</h1>
        <button onClick={() => setForm(empty)} className="flex items-center gap-1.5 rounded-xl bg-canopy-700 px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-canopy-600">
          <Plus size={16} /> New Staff
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-canopy-100 bg-white dark:border-canopy-800 dark:bg-canopy-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-canopy-100 text-left text-xs uppercase tracking-wide text-canopy-500 dark:border-canopy-800 dark:text-canopy-400">
              <th className="p-3">Name</th><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3 text-center">Status</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-canopy-50 dark:border-canopy-800">
                <td className="p-3 font-medium text-canopy-900 dark:text-canopy-50">{u.name}</td>
                <td className="p-3 text-canopy-500 dark:text-canopy-400">{u.username}</td>
                <td className="p-3"><span className="rounded-full bg-canopy-100 px-2 py-0.5 text-xs font-semibold text-canopy-700 dark:bg-canopy-800 dark:text-canopy-200">{u.role}</span></td>
                <td className="p-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${u.active ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300"}`}>
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => toggleActive(u)} className="text-xs font-medium text-canopy-600 hover:underline dark:text-canopy-300">
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={createUser} className="animate-pop w-full max-w-sm rounded-xl2 bg-white p-5 shadow-pop dark:bg-canopy-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">New Staff Account</h3>
              <button type="button" onClick={() => setForm(null)} className="rounded-full p-1.5 text-canopy-400 hover:bg-canopy-50 dark:hover:bg-canopy-800"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" />
              <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
              <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                <option value="CASHIER">Cashier</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button disabled={saving} className="mt-2 rounded-xl bg-canopy-700 py-3 font-semibold text-white shadow-card hover:bg-canopy-600 disabled:opacity-60">
                {saving ? "Creating…" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`.input { width: 100%; border-radius: 0.75rem; border: 1px solid rgb(220 226 221); background: #faf6ee; padding: 0.6rem 0.85rem; font-size: 0.875rem; outline: none; }
        html.dark .input { border-color: rgb(36 80 53); background: rgb(29 63 43); color: white; }`}</style>
    </div>
  );
}
