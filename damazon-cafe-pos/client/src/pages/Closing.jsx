import React, { useEffect, useState } from "react";
import { AlertTriangle, Lock, Printer, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";

export default function Closing() {
  const { fmt, settings } = useSettings();
  const toast = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [closedReport, setClosedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashActual, setCashActual] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [closing, setClosing] = useState(false);
  const [force, setForce] = useState(false);

  const load = async () => {
    setLoading(true);
    setClosedReport(null);
    setReport(null);
    try {
      const existing = await api.get(`/closing/${date}`).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (existing) {
        setClosedReport(existing);
      } else {
        const preview = await api.get(`/closing/preview?date=${date}`);
        setReport(preview);
        setCashActual(String((preview.cashExpectedCents / 100).toFixed(2)));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const expectedCash = report ? report.cashExpectedCents / 100 : 0;
  const variance = cashActual !== "" ? Number(cashActual) - expectedCash : 0;

  const closeDay = async () => {
    setClosing(true);
    try {
      await api.post("/closing/close", {
        businessDate: date,
        cashActual: Number(cashActual || 0),
        varianceReason: varianceReason || undefined,
        force,
      });
      toast.success(`${date} closed successfully`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClosing(false);
    }
  };

  const R = closedReport
    ? {
        grossSales: closedReport.gross_sales, discounts: closedReport.discounts, refunds: closedReport.refunds,
        taxTotal: closedReport.tax_total, serviceChargeTotal: closedReport.service_charge_total, netSales: closedReport.net_sales,
        totalOrders: closedReport.total_orders, totalItemsSold: closedReport.total_items_sold,
        paymentBreakdown: closedReport.payment_breakdown_json, categorySummary: closedReport.category_summary_json,
        itemSalesByCategory: closedReport.item_sales_json, cashierSummary: closedReport.cashier_summary_json,
        topProducts: closedReport.top_products_json, cashExpected: closedReport.cash_expected,
        cashActual: closedReport.cash_actual, cashVariance: closedReport.cash_variance,
      }
    : report;

  return (
    <div className="p-4 md:p-6" id="closing-print-area">
      <style>{`@media print { body * { visibility: hidden; } #closing-print-area, #closing-print-area * { visibility: visible; } #closing-print-area { position: absolute; left:0; top:0; width:100%; } .print\\:hidden { display: none !important; } }`}</style>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-display text-2xl font-bold text-canopy-900 dark:text-canopy-50">End-of-Day Closing</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-canopy-200 bg-white px-3 py-2 text-sm dark:border-canopy-700 dark:bg-canopy-900 dark:text-canopy-100" />
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl border-2 border-canopy-700 px-3 py-2 text-sm font-semibold text-canopy-700 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {loading || !R ? (
        <div className="py-16 text-center text-canopy-400">Loading…</div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="font-display text-xl font-bold text-canopy-900 dark:text-canopy-50">{settings?.cafe_name}</span>
            <span className="text-canopy-400">— Business Date {date}</span>
            {closedReport && (
              <span className="ml-2 flex items-center gap-1 rounded-full bg-canopy-700 px-2 py-0.5 text-xs font-bold text-white">
                <Lock size={11} /> Closed by {closedReport.closed_by_name}
              </span>
            )}
          </div>

          {!closedReport && report.openOrders.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl2 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 print:hidden">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong>{report.openOrders.length} order(s) still open:</strong> {report.openOrders.join(", ")}.
                Resolve them first, or check "close anyway" below.
              </div>
            </div>
          )}

          {/* A. Sales Summary */}
          <Section title="A. Sales Summary">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Gross Sales" value={fmt(R.grossSales)} />
              <Stat label="Discounts" value={fmt(R.discounts)} />
              <Stat label="Refunds" value={fmt(R.refunds)} />
              <Stat label="Tax" value={fmt(R.taxTotal)} />
              <Stat label="Service Charge" value={fmt(R.serviceChargeTotal)} />
              <Stat label="Net Sales" value={fmt(R.netSales)} highlight />
              <Stat label="Total Orders" value={R.totalOrders} />
              <Stat label="Total Items Sold" value={R.totalItemsSold} />
            </div>
          </Section>

          {/* B. Item Sales Summary */}
          <Section title="B. Item Sales Summary">
            {R.itemSalesByCategory.length === 0 && <p className="text-sm text-canopy-400">No completed sales yet.</p>}
            {R.itemSalesByCategory.map((cat) => (
              <div key={cat.category} className="mb-4">
                <h4 className="mb-1 font-display text-sm font-bold text-canopy-800 dark:text-canopy-100">{cat.category}</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-canopy-100 text-left text-xs uppercase text-canopy-400 dark:border-canopy-800">
                      <th className="py-1">Item</th><th className="py-1 text-right">Qty</th><th className="py-1 text-right">Unit Price</th><th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((it) => (
                      <tr key={it.item} className="border-b border-canopy-50 dark:border-canopy-800">
                        <td className="py-1">{it.item}</td>
                        <td className="py-1 text-right">{it.qty}</td>
                        <td className="py-1 text-right">{fmt(it.unitPrice)}</td>
                        <td className="py-1 text-right font-medium">{fmt(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-right text-xs font-semibold text-canopy-600 dark:text-canopy-300">
                  {cat.category} Total: {cat.categoryQty} items
                </div>
              </div>
            ))}
            <div className="rounded-xl bg-canopy-700 p-3 text-center text-white">
              <span className="mr-6 font-semibold">TOTAL ITEMS SOLD: {R.totalItemsSold}</span>
              <span className="font-semibold">TOTAL SALES: {fmt(R.netSales)}</span>
            </div>
          </Section>

          {/* Payment breakdown */}
          <Section title="Payment Breakdown">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {R.paymentBreakdown.map((p) => (
                <Stat key={p.method} label={p.method} value={fmt(p.total)} />
              ))}
              {R.paymentBreakdown.length === 0 && <p className="text-sm text-canopy-400">No payments recorded.</p>}
            </div>
          </Section>

          {/* Cash reconciliation */}
          <Section title="Cash Reconciliation">
            {closedReport ? (
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Expected Cash" value={fmt(R.cashExpected)} />
                <Stat label="Actual Cash" value={fmt(R.cashActual)} />
                <Stat label="Difference" value={fmt(R.cashVariance)} highlight={Number(R.cashVariance) !== 0} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
                <Stat label="Expected Cash" value={fmt(expectedCash)} />
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-canopy-500 dark:text-canopy-400">Actual Cash Counted</label>
                  <input type="number" step="0.01" value={cashActual} onChange={(e) => setCashActual(e.target.value)} className="w-full rounded-xl border border-canopy-200 bg-cream px-3 py-2 text-sm dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50" />
                </div>
                <Stat label="Difference" value={fmt(variance)} highlight={variance !== 0} />
                {variance !== 0 && (
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-medium uppercase text-canopy-500 dark:text-canopy-400">Reason for discrepancy (required)</label>
                    <input value={varianceReason} onChange={(e) => setVarianceReason(e.target.value)} className="w-full rounded-xl border border-canopy-200 bg-cream px-3 py-2 text-sm dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50" />
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Cashier / shift report */}
          <Section title="Shift Report by Cashier">
            {R.cashierSummary.map((c) => (
              <div key={c.cashierId || c.name} className="mb-2 rounded-xl border border-canopy-100 p-3 text-sm dark:border-canopy-800">
                <div className="mb-1 font-semibold text-canopy-800 dark:text-canopy-100">{c.name}</div>
                <div className="grid grid-cols-2 gap-1 text-canopy-500 dark:text-canopy-400 sm:grid-cols-4">
                  <span>Orders: {c.orders}</span>
                  <span>Items: {c.itemsSold}</span>
                  <span>Sales: {fmt(c.sales)}</span>
                  <span>Discounts: {fmt(c.discounts)}</span>
                </div>
              </div>
            ))}
            {R.cashierSummary.length === 0 && <p className="text-sm text-canopy-400">No sales recorded.</p>}
          </Section>

          {/* Top products */}
          <Section title="Top Selling Products">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-canopy-700 dark:text-canopy-200">
              {R.topProducts.map((p) => (
                <li key={p.name}>{p.name} — {p.qty} sold ({fmt(p.revenue)})</li>
              ))}
              {R.topProducts.length === 0 && <p className="text-canopy-400">No sales recorded.</p>}
            </ol>
          </Section>

          {!closedReport && (
            <div className="sticky bottom-4 mt-6 flex flex-col gap-3 rounded-xl2 border border-canopy-200 bg-white p-4 shadow-pop dark:border-canopy-700 dark:bg-canopy-900 print:hidden">
              {report.openOrders.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-canopy-600 dark:text-canopy-300">
                  <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                  Close anyway, ignoring {report.openOrders.length} open order(s)
                </label>
              )}
              <button
                disabled={closing || (report.openOrders.length > 0 && !force) || (variance !== 0 && !varianceReason)}
                onClick={closeDay}
                className="flex items-center justify-center gap-2 rounded-xl bg-canopy-700 py-3.5 font-semibold text-white shadow-card hover:bg-canopy-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={18} /> {closing ? "Closing Day…" : `Close ${date} & Lock Report`}
              </button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-canopy-400">
            <div>Prepared by: __________________</div>
            <div>Checked by: __________________</div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6 rounded-xl2 border border-canopy-100 bg-white p-4 shadow-card dark:border-canopy-800 dark:bg-canopy-900">
      <h3 className="mb-3 font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-amber-50 dark:bg-amber-950/30" : "bg-canopy-50 dark:bg-canopy-800"}`}>
      <div className="text-[11px] uppercase tracking-wide text-canopy-500 dark:text-canopy-400">{label}</div>
      <div className={`font-display text-lg font-bold ${highlight ? "text-amber-700 dark:text-amber-300" : "text-canopy-900 dark:text-canopy-50"}`}>{value}</div>
    </div>
  );
}
