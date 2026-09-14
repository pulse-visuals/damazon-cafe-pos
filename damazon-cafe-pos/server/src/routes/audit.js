const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 300`
    );
    res.json(rows);
  })
);

module.exports = router;
