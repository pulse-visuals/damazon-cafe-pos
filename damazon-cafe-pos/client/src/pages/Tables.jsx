import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Clock } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const STATUS_META = {
  AVAILABLE: { color: "bg-green-500", label: "Available", card: "border-green-200 dark:border-green-900" },
  OCCUPIED: { color: "bg-red-500", label: "Occupied", card: "border-red-200 dark:border-red-900" },
  RESERVED: { color: "bg-amber-500", label: "Reserved", card: "border-amber-200 dark:border-amber-900" },
  CLEANING: { color: "bg-blue-500", label: "Cleaning", card: "border-blue-200 dark:border-blue-900" },
};

function elapsed(startedAt) {
  if (!startedAt) return null;
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Tables() {
  const { fmt } = useSettings();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/tables").then(setTables).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (table, status) => {
    try {
      await api.patch(`/tables/${table.id}`, { status });
      toast.success(`${table.label} → ${status}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">Tables</h1>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_META).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-canopy-500 dark:text-canopy-400">
              <span className={`h-2.5 w-2.5 rounded-full ${v.color}`} /> {v.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl2 bg-canopy-100 dark:bg-canopy-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tables.map((t) => {
            const meta = STATUS_META[t.status];
            return (
              <div
                key={t.id}
                className={`flex flex-col gap-2 rounded-xl2 border-2 bg-white p-4 shadow-card dark:bg-canopy-900 ${meta.card}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-bold text-canopy-900 dark:text-canopy-50">{t.label}</span>
                  <span className={`h-3 w-3 rounded-full ${meta.color}`} />
                </div>
                <div className="flex items-center gap-1 text-xs text-canopy-500 dark:text-canopy-400">
                  <Users size={12} /> {t.capacity} seats
                </div>

                {t.current_order_id ? (
                  <button
                    onClick={() => navigate("/orders", { state: { orderId: t.current_order_id } })}
                    className="mt-1 rounded-lg bg-canopy-50 p-2 text-left text-xs dark:bg-canopy-800"
                  >
                    <div className="font-semibold text-canopy-800 dark:text-canopy-100">{t.current_order_number}</div>
                    <div className="flex items-center justify-between text-canopy-500 dark:text-canopy-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> {elapsed(t.current_order_started_at)}</span>
                      <span className="font-display font-semibold text-canopy-700 dark:text-amber-300">{fmt(t.current_order_total)}</span>
                    </div>
                  </button>
                ) : (
                  <div className="mt-1 text-xs text-canopy-400">No active order</div>
                )}

                {can("ADMIN", "MANAGER", "CASHIER") && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.keys(STATUS_META)
                      .filter((s) => s !== t.status)
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(t, s)}
                          className="rounded-full border border-canopy-200 px-2 py-0.5 text-[10px] font-medium text-canopy-500 hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-400 dark:hover:bg-canopy-800"
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
