const { toCents, centsToStr } = require("./money");

// Builds the full end-of-day closing report for a business date.
// Used both for the "preview before closing" endpoint and for the frozen
// snapshot written into daily_closings when the day is actually closed.
async function buildClosingReport(client, businessDate) {
  const salesRes = await client.query(
    `SELECT
       COALESCE(SUM(subtotal), 0) AS gross_sales,
       COALESCE(SUM(discount_amount), 0) AS discounts,
       COALESCE(SUM(tax_amount), 0) AS tax_total,
       COALESCE(SUM(service_charge_amount), 0) AS service_charge_total,
       COALESCE(SUM(total_amount), 0) AS net_sales,
       COUNT(*) AS total_orders
     FROM orders WHERE business_date = $1 AND status = 'COMPLETED'`,
    [businessDate]
  );

  const refundsRes = await client.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS refunds FROM orders WHERE business_date = $1 AND status = 'REFUNDED'`,
    [businessDate]
  );

  const itemsRes = await client.query(
    `SELECT c.name AS category, oi.name_snapshot AS item, SUM(oi.qty) AS qty,
            oi.unit_price, SUM(oi.line_total) AS total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY c.name, oi.name_snapshot, oi.unit_price
     ORDER BY c.name, total DESC`,
    [businessDate]
  );

  const categoryMap = {};
  let totalItemsSold = 0;
  for (const row of itemsRes.rows) {
    if (!categoryMap[row.category]) categoryMap[row.category] = { category: row.category, items: [], categoryQty: 0, categoryTotal: 0 };
    const qty = parseInt(row.qty, 10);
    const total = parseFloat(row.total);
    categoryMap[row.category].items.push({
      item: row.item, qty, unitPrice: parseFloat(row.unit_price), total,
    });
    categoryMap[row.category].categoryQty += qty;
    categoryMap[row.category].categoryTotal += total;
    totalItemsSold += qty;
  }
  const itemSalesByCategory = Object.values(categoryMap);

  const paymentRes = await client.query(
    `SELECT pay.method, COALESCE(SUM(pay.amount), 0) AS total
     FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY pay.method`,
    [businessDate]
  );
  const paymentBreakdown = paymentRes.rows.map((r) => ({ method: r.method, total: parseFloat(r.total) }));
  const cashTotalCents = paymentBreakdown
    .filter((p) => p.method === "CASH")
    .reduce((sum, p) => sum + toCents(p.total), 0);

  const cashierTotalsRes = await client.query(
    `SELECT u.id, u.name, COUNT(o.id) AS orders,
            COALESCE(SUM(o.total_amount), 0) AS sales,
            COALESCE(SUM(o.discount_amount), 0) AS discounts
     FROM users u JOIN orders o ON o.cashier_id = u.id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY u.id, u.name`,
    [businessDate]
  );
  const cashierItemsRes = await client.query(
    `SELECT o.cashier_id, COALESCE(SUM(oi.qty), 0) AS items_sold
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY o.cashier_id`,
    [businessDate]
  );
  const cashierPaymentsRes = await client.query(
    `SELECT o.cashier_id, pay.method, COALESCE(SUM(pay.amount), 0) AS total
     FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY o.cashier_id, pay.method`,
    [businessDate]
  );
  const itemsByCashier = {};
  for (const r of cashierItemsRes.rows) itemsByCashier[r.cashier_id] = parseInt(r.items_sold, 10);
  const paymentsByCashier = {};
  for (const r of cashierPaymentsRes.rows) {
    paymentsByCashier[r.cashier_id] = paymentsByCashier[r.cashier_id] || {};
    paymentsByCashier[r.cashier_id][r.method] = parseFloat(r.total);
  }
  const cashierSummary = cashierTotalsRes.rows.map((r) => ({
    cashierId: r.id,
    name: r.name,
    orders: parseInt(r.orders, 10),
    itemsSold: itemsByCashier[r.id] || 0,
    sales: parseFloat(r.sales),
    discounts: parseFloat(r.discounts),
    payments: paymentsByCashier[r.id] || {},
  }));

  const topProductsRes = await client.query(
    `SELECT oi.name_snapshot AS name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.business_date = $1 AND o.status = 'COMPLETED'
     GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 10`,
    [businessDate]
  );
  const topProducts = topProductsRes.rows.map((r) => ({ name: r.name, qty: parseInt(r.qty, 10), revenue: parseFloat(r.revenue) }));

  const categorySummary = itemSalesByCategory.map((c) => ({
    category: c.category, qty: c.categoryQty, sales: Number(c.categoryTotal.toFixed(2)),
  }));

  const openOrdersRes = await client.query(
    `SELECT order_number FROM orders WHERE business_date = $1 AND status IN ('NEW','CONFIRMED','PREPARING','READY')`,
    [businessDate]
  );

  return {
    businessDate,
    grossSales: parseFloat(salesRes.rows[0].gross_sales),
    discounts: parseFloat(salesRes.rows[0].discounts),
    refunds: parseFloat(refundsRes.rows[0].refunds),
    taxTotal: parseFloat(salesRes.rows[0].tax_total),
    serviceChargeTotal: parseFloat(salesRes.rows[0].service_charge_total),
    netSales: parseFloat(salesRes.rows[0].net_sales),
    totalOrders: parseInt(salesRes.rows[0].total_orders, 10),
    totalItemsSold,
    itemSalesByCategory,
    categorySummary,
    paymentBreakdown,
    cashExpectedCents: cashTotalCents, // opening float excluded in MVP (assumed 0) — add shift opening cash if tracked
    cashierSummary,
    topProducts,
    openOrders: openOrdersRes.rows.map((r) => r.order_number),
  };
}

module.exports = { buildClosingReport };
