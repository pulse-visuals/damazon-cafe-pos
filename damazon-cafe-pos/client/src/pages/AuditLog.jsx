import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const ACTION_COLORS = {
  ORDER_CREATED: "text-canopy-600 dark:text-canopy-300",
  PAYMENT_RECORDED: "text-green-600 dark:text-green-400",
  DISCOUNT_APPLIED: "text-amber-600 dark:text-amber-400",
  ORDER_VOID: "text-red-600 dark:text-red-400",
  ORDER_REFUND: "text-red-600 dark:text-red-400",
  DAY_CLOSED: "text-purple-600 dark:text-purple-400",
  SETTINGS_UPDATED: "text-blue-600 dark:text-blue-400",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit").then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-5 font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">Audit Log</h1>
      {loading ? (
        <div className="py-10 text-center text-canopy-400">Loading…</div>
      ) : (
        <div className="rounded-xl2 border border-canopy-100 bg-white dark:border-canopy-800 dark:bg-canopy-900">
          <ul className="divide-y divide-canopy-100 dark:divide-canopy-800">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 p-3 text-sm">
                <span className="w-36 shrink-0 text-xs text-canopy-400">{new Date(l.created_at).toLocaleString()}</span>
                <span className="w-28 shrink-0 font-semibold text-canopy-800 dark:text-canopy-100">{l.user_name || "System"}</span>
                <span className={`w-40 shrink-0 font-medium ${ACTION_COLORS[l.action] || "text-canopy-600"}`}>{l.action.replace(/_/g, " ")}</span>
                <span className="text-canopy-500 dark:text-canopy-400">{l.details}</span>
              </li>
            ))}
            {logs.length === 0 && <li className="p-6 text-center text-canopy-400">No activity recorded yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
