import React from "react";

export default function StatCard({ label, value, sub, icon: Icon, tone = "canopy" }) {
  const tones = {
    canopy: "from-canopy-600 to-canopy-700",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
      {Icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-card`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-canopy-500 dark:text-canopy-400">{label}</div>
        <div className="truncate font-display text-xl font-bold text-canopy-900 dark:text-canopy-50">{value}</div>
        {sub && <div className="text-xs text-canopy-400">{sub}</div>}
      </div>
    </div>
  );
}
