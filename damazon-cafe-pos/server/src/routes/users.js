const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT id, name, username, email, role, active, created_at FROM users ORDER BY name`);
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, username, email, password, role } = req.body || {};
    if (!name || !username || !password || !["ADMIN", "MANAGER", "CASHIER"].includes(role)) {
      return res.status(400).json({ error: "name, username, password and a valid role are required" });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, username, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, username, email, role, active, created_at`,
      [name, username, email || null, hash, role]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { name, email, role, active, password } = req.body || {};
    const sets = [];
    const values = [];
    let i = 1;
    if (name) { sets.push(`name = $${i++}`); values.push(name); }
    if (email !== undefined) { sets.push(`email = $${i++}`); values.push(email); }
    if (role) { sets.push(`role = $${i++}`); values.push(role); }
    if (active !== undefined) { sets.push(`active = $${i++}`); values.push(active); }
    if (password) { sets.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10)); }
    if (!sets.length) return res.status(400).json({ error: "No editable fields provided" });
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING id, name, username, email, role, active, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  })
);

module.exports = router;
