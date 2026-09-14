const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const { todayBusinessDate } = require("../lib/businessDate");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { from, to, businessDate } = req.query;
    const clauses = [];
    const values = [];
    let i = 1;
    if (businessDate) { values.push(businessDate); clauses.push(`business_date = $${i++}`); }
    if (from) { values.push(from); clauses.push(`business_date >= $${i++}`); }
    if (to) { values.push(to); clauses.push(`business_date <= $${i++}`); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT e.*, u.name AS entered_by_name FROM expenses e JOIN users u ON u.id = e.entered_by_id ${where} ORDER BY e.created_at DESC LIMIT 500`,
      values
    );
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { category, description, amount, paymentMethod, businessDate } = req.body || {};
    if (!category || !(amount > 0)) return res.status(400).json({ error: "category and amount > 0 are required" });
    const { rows } = await pool.query(
      `INSERT INTO expenses (business_date, category, description, amount, payment_method, entered_by_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [businessDate || todayBusinessDate(), category, description || null, amount, paymentMethod || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await pool.query(`DELETE FROM expenses WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
