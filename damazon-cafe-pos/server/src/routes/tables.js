const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.*,
              o.id AS current_order_id, o.order_number AS current_order_number,
              o.total_amount AS current_order_total, o.guest_count AS current_order_guests,
              o.created_at AS current_order_started_at
       FROM tables t
       LEFT JOIN LATERAL (
         SELECT * FROM orders
         WHERE table_id = t.id AND status IN ('NEW','CONFIRMED','PREPARING','READY')
         ORDER BY created_at DESC LIMIT 1
       ) o ON true
       ORDER BY t.label ASC`
    );
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { label, capacity = 2 } = req.body || {};
    if (!label) return res.status(400).json({ error: "label is required" });
    const { rows } = await pool.query(
      `INSERT INTO tables (label, capacity) VALUES ($1,$2) RETURNING *`,
      [label, capacity]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER", "CASHIER"),
  asyncHandler(async (req, res) => {
    const { status, capacity, label } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE tables SET
         status = COALESCE($1, status),
         capacity = COALESCE($2, capacity),
         label = COALESCE($3, label)
       WHERE id = $4 RETURNING *`,
      [status, capacity, label, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Table not found" });
    res.json(rows[0]);
  })
);

module.exports = router;
