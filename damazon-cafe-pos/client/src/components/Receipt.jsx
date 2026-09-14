import React from "react";
import { useSettings } from "../context/SettingsContext";

// A thermal-receipt-styled printable view. Rendered inside a modal and also
// used as the print target via a dedicated print stylesheet (see index.css
// print rules injected inline here to keep the component self-contained).
export default function Receipt({ order }) {
  const { settings, fmt } = useSettings();
  if (!order) return null;

  return (
    <div id="receipt-print-area" className="mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-relaxed text-black">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div className="mb-2 text-center">
        <div className="text-2xl">🦜</div>
        <div className="text-sm font-bold uppercase">{settings?.cafe_name || "D'Amazon Cafe"}</div>
        {settings?.address && <div className="text-[10px]">{settings.address}</div>}
        {settings?.phone && <div className="text-[10px]">{settings.phone}</div>}
      </div>
      <div className="border-t border-dashed border-black py-1">
        <div className="flex justify-between"><span>Order #</span><span>{order.order_number}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{new Date(order.created_at).toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Cashier</span><span>{order.cashier_name}</span></div>
        <div className="flex justify-between"><span>Type</span><span>{order.type.replace("_", " ")}</span></div>
        {order.table_label && <div className="flex justify-between"><span>Table</span><span>{order.table_label}</span></div>}
      </div>
      <div className="border-t border-dashed border-black py-1">
        {order.items?.map((it) => (
          <div key={it.id} className="mb-1">
            <div className="flex justify-between">
              <span>{it.qty} x {it.name_snapshot}</span>
              <span>{fmt(it.line_total)}</span>
            </div>
            {it.modifiers?.map((m) => (
              <div key={m.id} className="pl-3 text-[10px] text-gray-700">+ {m.name}</div>
            ))}
            {it.notes && <div className="pl-3 text-[10px] italic text-gray-700">"{it.notes}"</div>}
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-black py-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
        {Number(order.discount_amount) > 0 && (
          <div className="flex justify-between"><span>Discount</span><span>-{fmt(order.discount_amount)}</span></div>
        )}
        <div className="flex justify-between"><span>Tax</span><span>{fmt(order.tax_amount)}</span></div>
        {Number(order.service_charge_amount) > 0 && (
          <div className="flex justify-between"><span>Service Chg</span><span>{fmt(order.service_charge_amount)}</span></div>
        )}
        <div className="mt-1 flex justify-between text-sm font-bold"><span>TOTAL</span><span>{fmt(order.total_amount)}</span></div>
      </div>
      {order.payments?.length > 0 && (
        <div className="border-t border-dashed border-black py-1">
          {order.payments.map((p) => (
            <div key={p.id} className="flex justify-between"><span>{p.method}</span><span>{fmt(p.amount)}</span></div>
          ))}
          {order.payments[0]?.cash_received && (
            <>
              <div className="flex justify-between"><span>Cash Received</span><span>{fmt(order.payments[0].cash_received)}</span></div>
              <div className="flex justify-between"><span>Change</span><span>{fmt(order.payments[0].change_given)}</span></div>
            </>
          )}
        </div>
      )}
      <div className="mt-2 border-t border-dashed border-black pt-2 text-center text-[11px]">
        {settings?.receipt_footer || "Thank you for visiting D'Amazon Cafe!"}
      </div>
    </div>
  );
}
