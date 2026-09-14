const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const { todayBusinessDate } = require("../lib/businessDate");
const { buildClosingReport } = require("../lib/closingReport");
const { toCents, centsToStr } = require("../lib/money");
const { writeAudit } = require("../lib/audit");

const router = express.Router();

// Live preview of what closing today (or any date) would look like —
// does not lock anything.
router.get(
  "/preview",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const businessDate = req.query.date || todayBusinessDate();
    const report = await buildClosingReport(pool, businessDate);
    const alreadyClosed = await pool.query(`SELECT id FROM daily_closings WHERE business_date = $1`, [businessDate]);
    res.json({ ...report, alreadyClosed: !!alreadyClosed.rows[0] });
  })
);

// List closing history
router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT dc.id, dc.business_date, dc.closed_at, dc.net_sales, dc.total_orders, dc.cash_variance, u.name AS closed_by_name
       FROM daily_closings dc JOIN users u ON u.id = dc.closed_by_id
       ORDER BY dc.business_date DESC LIMIT 90`
    );
    res.json(rows);
  })
);

// Fetch a frozen closing report (for reprint)
router.get(
  "/:businessDate",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT dc.*, u.name AS closed_by_name FROM daily_closings dc JOIN users u ON u.id = dc.closed_by_id WHERE dc.business_date = $1`,
      [req.params.businessDate]
    );
    if (!rows[0]) return res.status(404).json({ error: "No closing found for that date" });
    res.json(rows[0]);
  })
);

// Close the day — computes and freezes the full report, requires cash count.
router.post(
  "/close",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { businessDate = todayBusinessDate(), cashActual, varianceReason, force } = req.body || {};
    if (cashActual == null) return res.status(400).json({ error: "cashActual (counted cash in drawer) is required" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const already = await client.query(`SELECT id FROM daily_closings WHERE business_date = $1`, [businessDate]);
      if (already.rows[0]) {
        throw Object.assign(new Error(`${businessDate} has already been closed`), { status: 409 });
      }

      const report = await buildClosingReport(client, businessDate);

      if (report.openOrders.length && !force) {
        throw Object.assign(
          new Error(`There are ${report.openOrders.length} unpaid/open order(s) for this date: ${report.openOrders.join(", ")}. Resolve them or pass force:true to close anyway.`),
          { status: 409 }
        );
      }

      const cashExpectedCents = report.cashExpectedCents;
      const cashActualCents = toCents(cashActual);
      const varianceCents = cashActualCents - cashExpectedCents;
      if (varianceCents !== 0 && !varianceReason) {
        throw Object.assign(new Error("varianceReason is required when counted cash does not match expected cash"), { status: 400 });
      }

      const { rows } = await client.query(
        `INSERT INTO daily_closings
          (business_date, closed_by_id, gross_sales, discounts, refunds, tax_total, service_charge_total, net_sales,
           cash_expected, cash_actual, cash_variance, variance_reason, total_orders, total_items_sold,
           payment_breakdown_json, category_summary_json, item_sales_json, cashier_summary_json, top_products_json, locked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true)
         RETURNING *`,
        [
          businessDate, req.user.id, report.grossSales, report.discounts, report.refunds,
          report.taxTotal, report.serviceChargeTotal, report.netSales,
          centsToStr(cashExpectedCents), cashActual, centsToStr(varianceCents), varianceReason || null,
          report.totalOrders, report.totalItemsSold,
          JSON.stringify(report.paymentBreakdown), JSON.stringify(report.categorySummary),
          JSON.stringify(report.itemSalesByCategory), JSON.stringify(report.cashierSummary),
          JSON.stringify(report.topProducts),
        ]
      );

      await writeAudit(client, {
        userId: req.user.id, action: "DAY_CLOSED", entityType: "daily_closing", entityId: rows[0].id,
        details: `${businessDate}: net RM${report.netSales}, cash variance RM${centsToStr(varianceCents)}`,
      });

      await client.query("COMMIT");
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
