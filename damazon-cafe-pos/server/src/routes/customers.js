const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    if (search) {
      const { rows } = await pool.query(
        `SELECT * FROM customers WHERE LOWER(name) LIKE $1 OR phone LIKE $1 ORDER BY name LIMIT 25`,
        [`%${search.toLowerCase()}%`]
      );
      return res.json(rows);
    }
    const { rows } = await pool.query(`SELECT * FROM customers ORDER BY total_spent DESC LIMIT 100`);
    res.json(rows);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM customers WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Customer not found" });
    const orders = await pool.query(
      `SELECT id, order_number, total_amount, status, created_at FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ ...rows[0], recentOrders: orders.rows });
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, phone, email } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO customers (name, phone, email) VALUES ($1,$2,$3) RETURNING *`,
      [name, phone || null, email || null]
    );
    res.status(201).json(rows[0]);
  })
);

module.exports = router;
