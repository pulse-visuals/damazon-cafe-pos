const { toCents, centsToStr } = require("./money");

// Atomically claims the next order number, e.g. DAC-000125.
// Must be called inside an open transaction (client with BEGIN already issued).
async function nextOrderNumber(client) {
  const { rows } = await client.query(
    `UPDATE settings SET next_order_seq = next_order_seq + 1 WHERE id = 1 RETURNING next_order_seq`
  );
  const seq = rows[0].next_order_seq - 1;
  return `DAC-${String(seq).padStart(6, "0")}`;
}

// Recomputes subtotal/tax/service charge/total for an order from its current
// line items, the stored discount, and the cafe's tax/service-charge rates.
// Must be called inside an open transaction.
async function recalcOrderTotals(client, orderId) {
  const itemsRes = await client.query(
    `SELECT COALESCE(SUM(line_total), 0) AS subtotal FROM order_items WHERE order_id = $1`,
    [orderId]
  );
  const orderRes = await client.query(`SELECT discount_amount FROM orders WHERE id = $1`, [orderId]);
  if (!orderRes.rows[0]) throw new Error("Order not found");

  const settingsRes = await client.query(`SELECT tax_rate, service_charge_rate FROM settings WHERE id = 1`);
  const { tax_rate, service_charge_rate } = settingsRes.rows[0];

  const subtotalCents = toCents(itemsRes.rows[0].subtotal);
  let discountCents = toCents(orderRes.rows[0].discount_amount);
  if (discountCents > subtotalCents) discountCents = subtotalCents; // never discount below zero
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * toCents(tax_rate)) / 10000);
  const serviceCents = Math.round((taxableCents * toCents(service_charge_rate)) / 10000);
  const totalCents = taxableCents + taxCents + serviceCents;

  const { rows } = await client.query(
    `UPDATE orders SET
       subtotal = $1, discount_amount = $2, tax_amount = $3,
       service_charge_amount = $4, total_amount = $5, updated_at = now()
     WHERE id = $6 RETURNING *`,
    [
      centsToStr(subtotalCents),
      centsToStr(discountCents),
      centsToStr(taxCents),
      centsToStr(serviceCents),
      centsToStr(totalCents),
      orderId,
    ]
  );
  return rows[0];
}

module.exports = { nextOrderNumber, recalcOrderTotals };
