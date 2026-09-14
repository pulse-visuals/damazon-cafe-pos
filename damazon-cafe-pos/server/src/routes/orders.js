const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const { nextOrderNumber, recalcOrderTotals } = require("../lib/orderCalc");
const { toCents, centsToStr } = require("../lib/money");
const { todayBusinessDate } = require("../lib/businessDate");
const { writeAudit } = require("../lib/audit");

const router = express.Router();

const OPEN_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY"];

async function fetchOrderDetail(client, orderId) {
  const orderRes = await client.query(
    `SELECT o.*, u.name AS cashier_name, t.label AS table_label, c.name AS customer_name
     FROM orders o
     JOIN users u ON u.id = o.cashier_id
     LEFT JOIN tables t ON t.id = o.table_id
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = orderRes.rows[0];
  if (!order) return null;

  const itemsRes = await client.query(
    `SELECT oi.*,
            COALESCE(json_agg(json_build_object('id', oim.id, 'name', oim.name_snapshot, 'priceDelta', oim.price_delta)) FILTER (WHERE oim.id IS NOT NULL), '[]') AS modifiers
     FROM order_items oi
     LEFT JOIN order_item_modifiers oim ON oim.order_item_id = oi.id
     WHERE oi.order_id = $1
     GROUP BY oi.id
     ORDER BY oi.id`,
    [orderId]
  );

  const paymentsRes = await client.query(
    `SELECT p.*, u.name AS received_by_name FROM payments p JOIN users u ON u.id = p.received_by_id WHERE p.order_id = $1 ORDER BY p.created_at`,
    [orderId]
  );

  return { ...order, items: itemsRes.rows, payments: paymentsRes.rows };
}

// GET /api/orders?businessDate=&status=&type=&tableId=
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { businessDate, status, type, tableId } = req.query;
    const clauses = [];
    const values = [];
    let i = 1;
    if (businessDate) { values.push(businessDate); clauses.push(`o.business_date = $${i++}`); }
    if (status) { values.push(status); clauses.push(`o.status = $${i++}`); }
    if (type) { values.push(type); clauses.push(`o.type = $${i++}`); }
    if (tableId) { values.push(tableId); clauses.push(`o.table_id = $${i++}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, o.type, o.status, o.total_amount, o.created_at, o.updated_at,
              o.business_date, u.name AS cashier_name, t.label AS table_label
       FROM orders o
       JOIN users u ON u.id = o.cashier_id
       LEFT JOIN tables t ON t.id = o.table_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT 200`,
      values
    );
    res.json(rows);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await fetchOrderDetail(pool, req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  })
);

// POST /api/orders — create a new order, optionally with initial items
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type, tableId, guestCount, customerId, notes, items = [] } = req.body || {};
    const validTypes = ["DINE_IN", "TAKEAWAY", "DELIVERY", "PICKUP"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${validTypes.join(", ")}` });
    }
    if (type === "DINE_IN" && !tableId) {
      return res.status(400).json({ error: "tableId is required for dine-in orders" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const businessDate = todayBusinessDate();

      const closedCheck = await client.query(`SELECT id FROM daily_closings WHERE business_date = $1`, [businessDate]);
      if (closedCheck.rows[0]) {
        throw Object.assign(
          new Error(`${businessDate} has already been closed. An administrator must open a new business day before taking orders.`),
          { status: 409 }
        );
      }

      const orderNumber = await nextOrderNumber(client);

      const orderRes = await client.query(
        `INSERT INTO orders (order_number, type, table_id, guest_count, customer_id, cashier_id, notes, business_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [orderNumber, type, tableId || null, guestCount || null, customerId || null, req.user.id, notes || null, businessDate]
      );
      const orderId = orderRes.rows[0].id;

      for (const item of items) {
        await addItemToOrder(client, orderId, item);
      }
      await recalcOrderTotals(client, orderId);

      if (type === "DINE_IN" && tableId) {
        await client.query(`UPDATE tables SET status = 'OCCUPIED' WHERE id = $1`, [tableId]);
      }

      await writeAudit(client, {
        userId: req.user.id, action: "ORDER_CREATED", entityType: "order", entityId: orderId,
        details: `${orderNumber} (${type})`,
      });

      await client.query("COMMIT");
      const full = await fetchOrderDetail(pool, orderId);
      res.status(201).json(full);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

async function addItemToOrder(client, orderId, item) {
  const { productId, qty, notes, modifierOptionIds = [] } = item;
  if (!productId || !qty || qty < 1) throw Object.assign(new Error("Each item needs productId and qty >= 1"), { status: 400 });

  const productRes = await client.query(`SELECT * FROM products WHERE id = $1`, [productId]);
  const product = productRes.rows[0];
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  if (!product.available) throw Object.assign(new Error(`${product.name} is currently unavailable`), { status: 409 });

  let modifierRows = [];
  if (modifierOptionIds.length) {
    const modRes = await client.query(
      `SELECT * FROM modifier_options WHERE id = ANY($1::uuid[])`,
      [modifierOptionIds]
    );
    modifierRows = modRes.rows;
  }
  const modifierCentsTotal = modifierRows.reduce((sum, m) => sum + toCents(m.price_delta), 0);
  const unitPriceCents = toCents(product.price) + modifierCentsTotal;
  const lineTotalCents = unitPriceCents * qty;

  const itemRes = await client.query(
    `INSERT INTO order_items (order_id, product_id, name_snapshot, unit_price, qty, notes, line_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [orderId, productId, product.name, centsToStr(unitPriceCents), qty, notes || null, centsToStr(lineTotalCents)]
  );
  const itemId = itemRes.rows[0].id;

  for (const m of modifierRows) {
    await client.query(
      `INSERT INTO order_item_modifiers (order_item_id, modifier_option_id, name_snapshot, price_delta)
       VALUES ($1,$2,$3,$4)`,
      [itemId, m.id, m.name, m.price_delta]
    );
  }

  if (product.track_stock && product.stock_qty != null) {
    await client.query(`UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2`, [qty, productId]);
  }

  return itemId;
}

async function assertOrderEditable(client, orderId) {
  const { rows } = await client.query(`SELECT status FROM orders WHERE id = $1`, [orderId]);
  if (!rows[0]) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (!OPEN_STATUSES.includes(rows[0].status)) {
    throw Object.assign(new Error(`Order is ${rows[0].status} and can no longer be edited`), { status: 409 });
  }
}

router.post(
  "/:id/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assertOrderEditable(client, req.params.id);
      await addItemToOrder(client, req.params.id, req.body || {});
      await recalcOrderTotals(client, req.params.id);
      await client.query("COMMIT");
      res.status(201).json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

router.patch(
  "/:id/items/:itemId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { qty, notes } = req.body || {};
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assertOrderEditable(client, req.params.id);
      const itemRes = await client.query(`SELECT * FROM order_items WHERE id = $1 AND order_id = $2`, [req.params.itemId, req.params.id]);
      const item = itemRes.rows[0];
      if (!item) throw Object.assign(new Error("Item not found"), { status: 404 });
      const newQty = qty != null ? qty : item.qty;
      if (newQty < 1) throw Object.assign(new Error("qty must be at least 1 — remove the item to delete it"), { status: 400 });
      const unitPriceCents = toCents(item.unit_price);
      await client.query(
        `UPDATE order_items SET qty = $1, notes = COALESCE($2, notes), line_total = $3 WHERE id = $4`,
        [newQty, notes, centsToStr(unitPriceCents * newQty), req.params.itemId]
      );
      await recalcOrderTotals(client, req.params.id);
      await client.query("COMMIT");
      res.json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

router.delete(
  "/:id/items/:itemId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assertOrderEditable(client, req.params.id);
      await client.query(`DELETE FROM order_items WHERE id = $1 AND order_id = $2`, [req.params.itemId, req.params.id]);
      await recalcOrderTotals(client, req.params.id);
      await client.query("COMMIT");
      res.json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// Discounts require manager/admin authorization (sensitive per spec section 2 & 16)
router.post(
  "/:id/discount",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { discountAmount, discountReason } = req.body || {};
    if (discountAmount == null || discountAmount < 0) {
      return res.status(400).json({ error: "discountAmount must be >= 0" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assertOrderEditable(client, req.params.id);
      await client.query(
        `UPDATE orders SET discount_amount = $1, discount_reason = $2 WHERE id = $3`,
        [discountAmount, discountReason || null, req.params.id]
      );
      await recalcOrderTotals(client, req.params.id);
      await writeAudit(client, {
        userId: req.user.id, action: "DISCOUNT_APPLIED", entityType: "order", entityId: req.params.id,
        details: `RM ${discountAmount} — ${discountReason || "no reason given"}`,
      });
      await client.query("COMMIT");
      res.json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// Record payment(s) and complete the order once fully paid.
router.post(
  "/:id/pay",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { payments = [] } = req.body || {};
    const validMethods = ["CASH", "CARD", "QR", "EWALLET", "BANK_TRANSFER", "OTHER"];
    if (!payments.length) return res.status(400).json({ error: "At least one payment is required" });
    for (const p of payments) {
      if (!validMethods.includes(p.method) || !(p.amount > 0)) {
        return res.status(400).json({ error: "Each payment needs a valid method and amount > 0" });
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
      const order = orderRes.rows[0];
      if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (!OPEN_STATUSES.includes(order.status)) {
        throw Object.assign(new Error(`Order is ${order.status} and cannot be paid`), { status: 409 });
      }

      let paidCents = 0;
      const existingPayments = await client.query(`SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE order_id = $1`, [req.params.id]);
      paidCents = toCents(existingPayments.rows[0].paid);

      const results = [];
      for (const p of payments) {
        let cashReceived = null, changeGiven = null;
        if (p.method === "CASH") {
          cashReceived = p.cashReceived ?? p.amount;
          const changeCents = toCents(cashReceived) - toCents(p.amount);
          changeGiven = centsToStr(Math.max(changeCents, 0));
        }
        const payRes = await client.query(
          `INSERT INTO payments (order_id, method, amount, cash_received, change_given, received_by_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [req.params.id, p.method, p.amount, cashReceived, changeGiven, req.user.id]
        );
        results.push(payRes.rows[0]);
        paidCents += toCents(p.amount);
      }

      const totalCents = toCents(order.total_amount);
      let newStatus = order.status;
      if (paidCents >= totalCents) {
        newStatus = "COMPLETED";
        await client.query(`UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = $1`, [req.params.id]);
        if (order.table_id) {
          await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [order.table_id]);
        }
        if (order.customer_id) {
          await client.query(
            `UPDATE customers SET total_visits = total_visits + 1, total_spent = total_spent + $1, loyalty_points = loyalty_points + FLOOR($1) WHERE id = $2`,
            [order.total_amount, order.customer_id]
          );
        }
      }

      await writeAudit(client, {
        userId: req.user.id, action: "PAYMENT_RECORDED", entityType: "order", entityId: req.params.id,
        details: `${payments.map((p) => `${p.method} RM${p.amount}`).join(", ")}`,
      });

      await client.query("COMMIT");
      res.json({ payments: results, order: await fetchOrderDetail(pool, req.params.id), fullyPaid: newStatus === "COMPLETED" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

const STATUS_FLOW = ["NEW", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

router.patch(
  "/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!STATUS_FLOW.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUS_FLOW.join(", ")}` });
    }
    const { rows } = await pool.query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 AND status <> 'CANCELLED' AND status <> 'REFUNDED' RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Order not found or is locked" });
    res.json(rows[0]);
  })
);

// Void — cancel an order that hasn't been paid yet. Manager/admin only.
router.post(
  "/:id/void",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: "reason is required" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
      const order = orderRes.rows[0];
      if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (!OPEN_STATUSES.includes(order.status)) {
        throw Object.assign(new Error(`Order is ${order.status} and cannot be voided — use refund for completed orders`), { status: 409 });
      }
      await client.query(
        `UPDATE orders SET status = 'CANCELLED', void_reason = $1, voided_by_id = $2, updated_at = now() WHERE id = $3`,
        [reason, req.user.id, req.params.id]
      );
      if (order.table_id) {
        await client.query(`UPDATE tables SET status = 'AVAILABLE' WHERE id = $1`, [order.table_id]);
      }
      await writeAudit(client, {
        userId: req.user.id, action: "ORDER_VOID", entityType: "order", entityId: req.params.id, details: reason,
      });
      await client.query("COMMIT");
      res.json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// Refund — reverse a completed order. Manager/admin only.
router.post(
  "/:id/refund",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: "reason is required" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
      const order = orderRes.rows[0];
      if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (order.status !== "COMPLETED") {
        throw Object.assign(new Error("Only completed orders can be refunded"), { status: 409 });
      }
      await client.query(
        `UPDATE orders SET status = 'REFUNDED', void_reason = $1, voided_by_id = $2, updated_at = now() WHERE id = $3`,
        [reason, req.user.id, req.params.id]
      );
      await writeAudit(client, {
        userId: req.user.id, action: "ORDER_REFUND", entityType: "order", entityId: req.params.id, details: reason,
      });
      await client.query("COMMIT");
      res.json(await fetchOrderDetail(pool, req.params.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
