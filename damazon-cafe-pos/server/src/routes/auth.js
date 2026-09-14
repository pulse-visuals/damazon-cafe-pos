const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const { rows } = await pool.query(
      `SELECT id, name, username, password_hash, role, active FROM users WHERE username = $1`,
      [username]
    );
    const user = rows[0];
    if (!user || !user.active) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, name, username, role FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  })
);

module.exports = router;
