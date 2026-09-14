const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { todayBusinessDate } = require("../lib/businessDate");

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const date = req.query.date || todayBusinessDate();

    const totalsRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'COMPLETED') AS orders_count,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'COMPLETED'), 0) AS sales,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'REFUNDED'), 0) AS refunds,
         COALESCE(SUM(discount_amount) FILTER (WHERE status = 'COMPLETED'), 0) AS discounts
       FROM orders WHERE business_date = $1`,
      [date]
    );

    const itemsRes = await pool.query(
      `SELECT COALESCE(SUM(oi.qty), 0) AS items_sold,
              COALESCE(SUM((oi.unit_price - COALESCE(p.cost_price, oi.unit_price)) * oi.qty), 0) AS gross_profit
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.business_date = $1 AND o.status = 'COMPLETED'`,
      [date]
    );

    const expensesRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE business_date = $1`,
      [date]
    );

    const paymentBreakdownRes = await pool.query(
      `SELECT pay.method, COALESCE(SUM(pay.amount), 0) AS total
       FROM payments pay JOIN orders o ON o.id = pay.order_id
       WHERE o.business_date = $1 AND o.status = 'COMPLETED'
       GROUP BY pay.method`,
      [date]
    );

    const salesByHourRes = await pool.query(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COALESCE(SUM(total_amount), 0) AS total
       FROM orders WHERE business_date = $1 AND status = 'COMPLETED'
       GROUP BY hour ORDER BY hour`,
      [date]
    );

    const categoryRes = await pool.query(
      `SELECT c.name, COALESCE(SUM(oi.qty), 0) AS qty, COALESCE(SUM(oi.line_total), 0) AS sales
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE o.business_date = $1 AND o.status = 'COMPLETED'
       GROUP BY c.name ORDER BY sales DESC`,
      [date]
    );

    const topProductsRes = await pool.query(
      `SELECT oi.name_snapshot AS name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS sales
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.business_date = $1 AND o.status = 'COMPLETED'
       GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 10`,
      [date]
    );

    const orderTypeRes = await pool.query(
      `SELECT type, COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total
       FROM orders WHERE business_date = $1 AND status = 'COMPLETED'
       GROUP BY type`,
      [date]
    );

    const recentOrdersRes = await pool.query(
      `SELECT o.id, o.order_number, o.type, o.status, o.total_amount, o.created_at, u.name AS cashier_name
       FROM orders o JOIN users u ON u.id = o.cashier_id
       WHERE o.business_date = $1 ORDER BY o.created_at DESC LIMIT 10`,
      [date]
    );

    const lowStockRes = await pool.query(
      `SELECT id, name, stock_qty, min_stock FROM products
       WHERE track_stock = true AND stock_qty IS NOT NULL AND min_stock IS NOT NULL AND stock_qty <= min_stock`
    );

    const openTablesRes = await pool.query(
      `SELECT COUNT(*) AS count FROM tables WHERE status = 'OCCUPIED'`
    );

    const sales = parseFloat(totalsRes.rows[0].sales);
    const ordersCount = parseInt(totalsRes.rows[0].orders_count, 10);
    const grossProfit = parseFloat(itemsRes.rows[0].gross_profit);
    const expenses = parseFloat(expensesRes.rows[0].total);

    res.json({
      businessDate: date,
      salesToday: sales,
      ordersCount,
      itemsSold: parseInt(itemsRes.rows[0].items_sold, 10),
      averageOrderValue: ordersCount ? Number((sales / ordersCount).toFixed(2)) : 0,
      grossProfit: Number(grossProfit.toFixed(2)),
      expenses: Number(expenses.toFixed(2)),
      netProfit: Number((grossProfit - expenses).toFixed(2)),
      refunds: parseFloat(totalsRes.rows[0].refunds),
      discounts: parseFloat(totalsRes.rows[0].discounts),
      paymentBreakdown: paymentBreakdownRes.rows.map((r) => ({ method: r.method, total: Number(r.total) })),
      salesByHour: salesByHourRes.rows.map((r) => ({ hour: r.hour, total: Number(r.total) })),
      categoryPerformance: categoryRes.rows,
      topProducts: topProductsRes.rows,
      orderTypeBreakdown: orderTypeRes.rows,
      recentOrders: recentOrdersRes.rows,
      lowStockAlerts: lowStockRes.rows,
      occupiedTables: parseInt(openTablesRes.rows[0].count, 10),
    });
  })
);

module.exports = router;
