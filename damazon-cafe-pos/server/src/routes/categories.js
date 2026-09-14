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
      `SELECT * FROM categories ORDER BY sort_order ASC, name ASC`
    );
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { name, icon, sortOrder = 0 } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const { rows } = await pool.query(
      `INSERT INTO categories (name, icon, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [name, icon || null, sortOrder]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { name, icon, sortOrder, active } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE categories SET
         name = COALESCE($1, name),
         icon = COALESCE($2, icon),
         sort_order = COALESCE($3, sort_order),
         active = COALESCE($4, active)
       WHERE id = $5 RETURNING *`,
      [name, icon, sortOrder, active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await pool.query(`UPDATE categories SET active = false WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
