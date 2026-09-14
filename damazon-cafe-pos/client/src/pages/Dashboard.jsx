import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { DollarSign, ShoppingBag, Layers, TrendingUp, AlertTriangle, Coins } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";

const PIE_COLORS = ["#2e6440", "#d0842a", "#5f9a70", "#eabb69", "#8fba99", "#f3d69f"];

export default function Dashboard() {
  const { fmt } = useSettings();
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/dashboard/summary?date=${date}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [date]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-canopy-300 border-t-canopy-600" />
      </div>
    );
  }

  const hourData = data.salesByHour.map((h) => ({ hour: `${h.hour}:00`, total: Number(h.total) }));

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-canopy-500 dark:text-canopy-400">Here's how the cafe is doing.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-canopy-200 bg-white px-3 py-2 text-sm text-canopy-800 outline-none dark:border-canopy-700 dark:bg-canopy-900 dark:text-canopy-100"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales Today" value={fmt(data.salesToday)} icon={DollarSign} tone="canopy" />
        <StatCard label="Orders" value={data.ordersCount} icon={ShoppingBag} tone="amber" />
        <StatCard label="Items Sold" value={data.itemsSold} icon={Layers} tone="canopy" />
        <StatCard label="Avg Order Value" value={fmt(data.averageOrderValue)} icon={TrendingUp} tone="amber" />
        <StatCard label="Gross Profit" value={fmt(data.grossProfit)} icon={Coins} tone="canopy" />
        <StatCard label="Expenses" value={fmt(data.expenses)} icon={Coins} tone="red" />
        <StatCard label="Net Profit" value={fmt(data.netProfit)} icon={TrendingUp} tone="canopy" />
        <StatCard label="Occupied Tables" value={data.occupiedTables} icon={Layers} tone="amber" />
      </div>

      {data.lowStockAlerts?.length > 0 && (
        <div className="mb-6 rounded-xl2 border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle size={18} /> Low Stock Alerts
          </div>
          <div className="flex flex-wrap gap-2">
            {data.lowStockAlerts.map((p) => (
              <span key={p.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 shadow-card dark:bg-canopy-900 dark:text-amber-300">
                {p.name}: {p.stock_qty} left (min {p.min_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">📊 Sales by Hour</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="hour" fontSize={11} stroke="#8fba99" />
              <YAxis fontSize={11} stroke="#8fba99" />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="total" fill="#2e6440" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
          <h3 className="mb-3 font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">💳 Payment Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.paymentBreakdown}
                dataKey="total"
                nameKey="method"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={data.paymentBreakdown.length > 1 ? 2 : 0}
              >
                {data.paymentBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {data.paymentBreakdown.map((p, i) => (
              <span key={p.method} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {p.method}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
          <h3 className="mb-3 font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">🏆 Top Products</h3>
          <ul className="flex flex-col gap-2">
            {data.topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-canopy-50 dark:hover:bg-canopy-800">
                <span className="flex items-center gap-2 text-canopy-700 dark:text-canopy-200">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-canopy-100 text-[10px] font-bold text-canopy-700 dark:bg-canopy-800 dark:text-canopy-200">{i + 1}</span>
                  {p.name}
                </span>
                <span className="text-canopy-500 dark:text-canopy-400">{p.qty} sold</span>
              </li>
            ))}
            {data.topProducts.length === 0 && <p className="text-sm text-canopy-400">No sales yet today.</p>}
          </ul>
        </div>

        <div className="rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
          <h3 className="mb-3 font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">🧾 Recent Orders</h3>
          <ul className="flex flex-col gap-2">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-canopy-50 dark:hover:bg-canopy-800">
                <div>
                  <div className="font-medium text-canopy-800 dark:text-canopy-100">{o.order_number}</div>
                  <div className="text-xs text-canopy-400">{o.cashier_name} · {o.type.replace("_", " ")}</div>
                </div>
                <span className="font-display font-semibold text-canopy-700 dark:text-amber-300">{fmt(o.total_amount)}</span>
              </li>
            ))}
            {data.recentOrders.length === 0 && <p className="text-sm text-canopy-400">No orders yet today.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
