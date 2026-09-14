import React from "react";
import { Minus, Plus, Trash2, Users, UtensilsCrossed, ShoppingBag, Bike, PackageCheck } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const TYPES = [
  { value: "DINE_IN", label: "Dine-In", icon: UtensilsCrossed },
  { value: "TAKEAWAY", label: "Takeaway", icon: ShoppingBag },
  { value: "DELIVERY", label: "Delivery", icon: Bike },
  { value: "PICKUP", label: "Pickup", icon: PackageCheck },
];

export default function CartPanel({
  orderType, setOrderType,
  tables, tableId, setTableId,
  guestCount, setGuestCount,
  cart, updateQty, removeItem,
  subtotal, orderNotes, setOrderNotes,
  onSendOrder, onChargeNow, busy,
}) {
  const { fmt } = useSettings();
  const availableTables = tables.filter((t) => t.status === "AVAILABLE" || t.id === tableId);

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-canopy-900">
      <div className="border-b border-canopy-100 p-4 dark:border-canopy-800">
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setOrderType(value)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                orderType === value
                  ? "bg-canopy-700 text-white shadow-card"
                  : "bg-canopy-50 text-canopy-600 hover:bg-canopy-100 dark:bg-canopy-800 dark:text-canopy-300 dark:hover:bg-canopy-700"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {orderType === "DINE_IN" && (
          <div className="flex gap-2">
            <select
              value={tableId || ""}
              onChange={(e) => setTableId(e.target.value)}
              className="flex-1 rounded-xl border border-canopy-200 bg-cream px-3 py-2 text-sm text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
            >
              <option value="">Select table…</option>
              {availableTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.capacity} seats){t.status === "OCCUPIED" ? " · occupied" : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 rounded-xl border border-canopy-200 bg-cream px-3 dark:border-canopy-700 dark:bg-canopy-800">
              <Users size={14} className="text-canopy-400" />
              <input
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-10 bg-transparent py-2 text-sm text-canopy-900 outline-none dark:text-canopy-50"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-canopy-400">
            <div className="mb-2 text-4xl">🛒</div>
            <p className="text-sm">Tap a product to start the order</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {cart.map((line) => (
              <li key={line.key} className="animate-pop rounded-xl border border-canopy-100 p-3 dark:border-canopy-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-canopy-900 dark:text-canopy-50">{line.product.name}</div>
                    {line.modifiers.length > 0 && (
                      <div className="mt-0.5 text-xs text-canopy-500 dark:text-canopy-400">
                        {line.modifiers.map((m) => m.name).join(", ")}
                      </div>
                    )}
                    {line.notes && <div className="mt-0.5 text-xs italic text-amber-600 dark:text-amber-400">"{line.notes}"</div>}
                  </div>
                  <button onClick={() => removeItem(line.key)} className="text-canopy-300 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-canopy-200 px-1 py-0.5 dark:border-canopy-700">
                    <button
                      onClick={() => updateQty(line.key, line.qty - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-canopy-600 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-canopy-900 dark:text-canopy-50">{line.qty}</span>
                    <button
                      onClick={() => updateQty(line.key, line.qty + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-canopy-600 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="font-display text-sm font-semibold text-canopy-800 dark:text-amber-300">
                    {fmt(line.unitPrice * line.qty)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-canopy-100 p-4 dark:border-canopy-800">
        <input
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Order note (optional)"
          className="mb-3 w-full rounded-xl border border-canopy-200 bg-cream px-3 py-2 text-sm text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
        />
        <div className="mb-3 flex items-center justify-between text-sm text-canopy-500 dark:text-canopy-400">
          <span>Subtotal</span>
          <span className="font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">{fmt(subtotal)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={!cart.length || busy || (orderType === "DINE_IN" && !tableId)}
            onClick={onSendOrder}
            className="rounded-xl border-2 border-canopy-700 py-3 text-sm font-semibold text-canopy-700 transition hover:bg-canopy-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-canopy-200 dark:hover:bg-canopy-800"
          >
            Send Order
          </button>
          <button
            disabled={!cart.length || busy || (orderType === "DINE_IN" && !tableId)}
            onClick={onChargeNow}
            className="rounded-xl bg-canopy-700 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-canopy-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Charge Now
          </button>
        </div>
      </div>
    </div>
  );
}
