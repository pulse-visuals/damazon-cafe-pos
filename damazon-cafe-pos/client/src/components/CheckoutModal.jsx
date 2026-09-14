import React, { useMemo, useState } from "react";
import { X, Banknote, CreditCard, QrCode, Wallet, Building2, CircleDollarSign, Printer, CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";
import { useToast } from "../context/ToastContext";
import Receipt from "./Receipt";

const METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "QR", label: "QR Pay", icon: QrCode },
  { value: "EWALLET", label: "E-Wallet", icon: Wallet },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  { value: "OTHER", label: "Other", icon: CircleDollarSign },
];

export default function CheckoutModal({ order, onClose, onPaid }) {
  const { fmt } = useSettings();
  const toast = useToast();
  const [method, setMethod] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [paying, setPaying] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null);

  const total = Number(order.total_amount);
  const received = cashReceived === "" ? total : Number(cashReceived);
  const change = Math.max(0, received - total);
  const quickAmounts = useMemo(() => {
    const opts = new Set([total, 20, 50, 100]);
    return [...opts].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  const submit = async () => {
    if (method === "CASH" && received < total) {
      toast.error("Cash received is less than the total due");
      return;
    }
    setPaying(true);
    try {
      const payload = {
        payments: [
          {
            method,
            amount: total,
            ...(method === "CASH" ? { cashReceived: received } : {}),
          },
        ],
      };
      const res = await api.post(`/orders/${order.id}/pay`, payload);
      setPaidOrder(res.order);
      toast.success(`Payment received — ${res.order.order_number} completed`);
      onPaid?.(res.order);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (paidOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm print:bg-white">
        <div className="animate-pop flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl2 bg-white shadow-pop dark:bg-canopy-900 print:shadow-none">
          <div className="flex items-center justify-between border-b border-canopy-100 p-4 print:hidden dark:border-canopy-800">
            <div className="flex items-center gap-2 text-canopy-700 dark:text-canopy-200">
              <CheckCircle2 className="text-canopy-600" size={22} />
              <span className="font-display text-lg font-semibold">Paid in full</span>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-canopy-400 hover:bg-canopy-50 dark:hover:bg-canopy-800">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            <Receipt order={paidOrder} />
          </div>
          <div className="flex gap-2 border-t border-canopy-100 p-4 print:hidden dark:border-canopy-800">
            <button
              onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-canopy-700 py-3 text-sm font-semibold text-canopy-700 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button onClick={onClose} className="flex-1 rounded-xl bg-canopy-700 py-3 text-sm font-semibold text-white hover:bg-canopy-600">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="animate-pop w-full max-w-md rounded-xl2 bg-white shadow-pop dark:bg-canopy-900">
        <div className="flex items-center justify-between border-b border-canopy-100 p-4 dark:border-canopy-800">
          <h3 className="font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">Checkout — {order.order_number}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-canopy-400 hover:bg-canopy-50 dark:hover:bg-canopy-800">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 rounded-xl bg-canopy-50 p-4 text-center dark:bg-canopy-800">
            <div className="text-xs uppercase tracking-wide text-canopy-500 dark:text-canopy-400">Total Due</div>
            <div className="font-display text-3xl font-bold text-canopy-900 dark:text-amber-300">{fmt(total)}</div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition ${
                  method === value
                    ? "border-canopy-700 bg-canopy-700 text-white"
                    : "border-canopy-200 text-canopy-600 hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-300 dark:hover:bg-canopy-800"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {method === "CASH" && (
            <div className="mb-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-canopy-500 dark:text-canopy-400">
                Cash Received
              </label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={total.toFixed(2)}
                className="w-full rounded-xl border border-canopy-200 bg-cream px-4 py-3 text-lg font-semibold text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
              />
              <div className="mt-2 grid grid-cols-4 gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashReceived(String(amt))}
                    className="rounded-lg border border-canopy-200 py-2 text-xs font-semibold text-canopy-700 hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-200 dark:hover:bg-canopy-800"
                  >
                    {amt === total ? "Exact" : fmt(amt)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/30">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Change</span>
                <span className="font-display text-xl font-bold text-amber-700 dark:text-amber-300">{fmt(change)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-canopy-100 p-4 dark:border-canopy-800">
          <button
            disabled={paying}
            onClick={submit}
            className="w-full rounded-xl bg-canopy-700 py-3.5 font-semibold text-white shadow-card transition hover:bg-canopy-600 disabled:opacity-60"
          >
            {paying ? "Processing…" : `Confirm Payment · ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
