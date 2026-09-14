import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Flame, CheckCircle2, XCircle, RotateCcw, Percent, CreditCard } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CheckoutModal from "../components/CheckoutModal";

const STATUS_STYLES = {
  NEW: "bg-canopy-100 text-canopy-700 dark:bg-canopy-800 dark:text-canopy-200",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PREPARING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  READY: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  COMPLETED: "bg-canopy-700 text-white",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  REFUNDED: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

const NEXT_STATUS = { NEW: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY", READY: "COMPLETED" };

export default function Orders() {
  const { fmt } = useSettings();
  const { can } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [filters, setFilters] = useState({ businessDate: new Date().toISOString().slice(0, 10), status: "", type: "" });
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const list = await api.get(`/orders?${params.toString()}`);
      setOrders(list);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (location.state?.orderId) {
      openDetail(location.state.orderId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const openDetail = async (id) => {
    const detail = await api.get(`/orders/${id}`);
    setSelected(detail);
    setDiscountAmount(detail.discount_amount !== "0.00" ? detail.discount_amount : "");
    setDiscountReason(detail.discount_reason || "");
  };

  const refreshSelected = async () => {
    if (selected) {
      const detail = await api.get(`/orders/${selected.id}`);
      setSelected(detail);
    }
    load();
  };

  const advanceStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      toast.success(`${order.order_number} → ${next}`);
      refreshSelected();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const voidOrder = async () => {
    if (!voidReason.trim()) return toast.error("A reason is required to void an order");
    try {
      await api.post(`/orders/${selected.id}/void`, { reason: voidReason });
      toast.success("Order voided");
      setVoidReason("");
      refreshSelected();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const refundOrder = async () => {
    if (!voidReason.trim()) return toast.error("A reason is required to refund an order");
    try {
      await api.post(`/orders/${selected.id}/refund`, { reason: voidReason });
      toast.success("Order refunded");
      setVoidReason("");
      refreshSelected();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const applyDiscount = async () => {
    try {
      await api.post(`/orders/${selected.id}/discount`, {
        discountAmount: Number(discountAmount || 0),
        discountReason,
      });
      toast.success("Discount applied");
      refreshSelected();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isOpen = (s) => ["NEW", "CONFIRMED", "PREPARING", "READY"].includes(s);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 overflow-y-auto p-4 lg:max-w-md">
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="date"
            value={filters.businessDate}
            onChange={(e) => setFilters((f) => ({ ...f, businessDate: e.target.value }))}
            className="rounded-xl border border-canopy-200 bg-white px-3 py-2 text-sm dark:border-canopy-700 dark:bg-canopy-900 dark:text-canopy-100"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-xl border border-canopy-200 bg-white px-3 py-2 text-sm dark:border-canopy-700 dark:bg-canopy-900 dark:text-canopy-100"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center text-canopy-400">Loading…</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => openDetail(o.id)}
                  className={`w-full rounded-xl2 border p-3 text-left transition ${
                    selected?.id === o.id
                      ? "border-canopy-600 bg-canopy-50 dark:bg-canopy-800"
                      : "border-canopy-100 bg-white hover:bg-canopy-50 dark:border-canopy-800 dark:bg-canopy-900 dark:hover:bg-canopy-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-canopy-900 dark:text-canopy-50">{o.order_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-canopy-500 dark:text-canopy-400">
                    <span>{o.type.replace("_", " ")}{o.table_label ? ` · ${o.table_label}` : ""} · {o.cashier_name}</span>
                    <span className="font-display font-semibold text-canopy-700 dark:text-amber-300">{fmt(o.total_amount)}</span>
                  </div>
                </button>
              </li>
            ))}
            {orders.length === 0 && <p className="py-10 text-center text-canopy-400">No orders for this filter.</p>}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border-t border-canopy-100 p-4 dark:border-canopy-800 lg:border-l lg:border-t-0">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-canopy-400">Select an order to view details</div>
        ) : (
          <div className="mx-auto max-w-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-canopy-900 dark:text-canopy-50">{selected.order_number}</h2>
                <p className="text-sm text-canopy-500 dark:text-canopy-400">
                  {new Date(selected.created_at).toLocaleString()} · {selected.cashier_name}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
            </div>

            {isOpen(selected.status) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {NEXT_STATUS[selected.status] && (
                  <button
                    onClick={() => advanceStatus(selected)}
                    className="flex items-center gap-1.5 rounded-xl bg-canopy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-canopy-600"
                  >
                    <Flame size={15} /> Mark {NEXT_STATUS[selected.status]}
                  </button>
                )}
                <button
                  onClick={() => setCheckoutOrder(selected)}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-canopy-700 px-4 py-2 text-sm font-semibold text-canopy-700 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
                >
                  <CreditCard size={15} /> Take Payment
                </button>
              </div>
            )}

            <div className="mb-4 rounded-xl2 border border-canopy-100 bg-white dark:border-canopy-800 dark:bg-canopy-900">
              <ul className="divide-y divide-canopy-100 dark:divide-canopy-800">
                {selected.items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between p-3">
                    <div>
                      <div className="text-sm font-medium text-canopy-900 dark:text-canopy-50">{it.qty}× {it.name_snapshot}</div>
                      {it.modifiers?.length > 0 && (
                        <div className="text-xs text-canopy-500 dark:text-canopy-400">{it.modifiers.map((m) => m.name).join(", ")}</div>
                      )}
                      {it.notes && <div className="text-xs italic text-amber-600 dark:text-amber-400">"{it.notes}"</div>}
                    </div>
                    <span className="font-display text-sm font-semibold text-canopy-700 dark:text-amber-300">{fmt(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-canopy-100 p-3 text-sm dark:border-canopy-800">
                <div className="flex justify-between text-canopy-500 dark:text-canopy-400"><span>Subtotal</span><span>{fmt(selected.subtotal)}</span></div>
                {Number(selected.discount_amount) > 0 && (
                  <div className="flex justify-between text-canopy-500 dark:text-canopy-400"><span>Discount</span><span>-{fmt(selected.discount_amount)}</span></div>
                )}
                <div className="flex justify-between text-canopy-500 dark:text-canopy-400"><span>Tax</span><span>{fmt(selected.tax_amount)}</span></div>
                <div className="flex justify-between font-display text-base font-bold text-canopy-900 dark:text-canopy-50"><span>Total</span><span>{fmt(selected.total_amount)}</span></div>
              </div>
            </div>

            {can("ADMIN", "MANAGER") && isOpen(selected.status) && (
              <div className="mb-4 rounded-xl2 border border-canopy-100 bg-white p-3 dark:border-canopy-800 dark:bg-canopy-900">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-canopy-800 dark:text-canopy-100"><Percent size={14} /> Apply Discount</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-24 rounded-lg border border-canopy-200 bg-cream px-2 py-1.5 text-sm dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
                  />
                  <input
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Reason (e.g. loyalty, manager comp)"
                    className="flex-1 rounded-lg border border-canopy-200 bg-cream px-2 py-1.5 text-sm dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
                  />
                  <button onClick={applyDiscount} className="rounded-lg bg-canopy-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-canopy-600">
                    Apply
                  </button>
                </div>
              </div>
            )}

            {can("ADMIN", "MANAGER") && (isOpen(selected.status) || selected.status === "COMPLETED") && (
              <div className="rounded-xl2 border border-red-100 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
                <h4 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">Void / Refund</h4>
                <input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Reason (required)"
                  className="mb-2 w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm dark:border-red-900 dark:bg-canopy-900"
                />
                <div className="flex gap-2">
                  {isOpen(selected.status) && (
                    <button onClick={voidOrder} className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-950">
                      <XCircle size={14} /> Void Order
                    </button>
                  )}
                  {selected.status === "COMPLETED" && (
                    <button onClick={refundOrder} className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-950">
                      <RotateCcw size={14} /> Refund Order
                    </button>
                  )}
                </div>
              </div>
            )}

            {selected.payments?.length > 0 && (
              <div className="mt-4 rounded-xl2 border border-canopy-100 bg-white p-3 dark:border-canopy-800 dark:bg-canopy-900">
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-canopy-800 dark:text-canopy-100"><CheckCircle2 size={14} /> Payments</h4>
                {selected.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm text-canopy-600 dark:text-canopy-300">
                    <span>{p.method} · {p.received_by_name}</span>
                    <span>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          onClose={() => {
            setCheckoutOrder(null);
            refreshSelected();
          }}
        />
      )}
    </div>
  );
}
