const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const { writeAudit } = require("../lib/audit");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM settings WHERE id = 1`);
    res.json(rows[0]);
  })
);

const EDITABLE_FIELDS = [
  "cafe_name",
  "tagline",
  "logo_url",
  "address",
  "phone",
  "email",
  "currency",
  "currency_symbol",
  "tax_rate",
  "service_charge_rate",
  "receipt_footer",
];

router.patch(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const updates = [];
    const values = [];
    let i = 1;
    for (const field of EDITABLE_FIELDS) {
      if (field in req.body) {
        updates.push(`${field} = $${i++}`);
        values.push(req.body[field]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: "No editable fields provided" });
    const { rows } = await pool.query(
      `UPDATE settings SET ${updates.join(", ")} WHERE id = 1 RETURNING *`,
      values
    );
    await writeAudit(pool, {
      userId: req.user.id,
      action: "SETTINGS_UPDATED",
      entityType: "settings",
      entityId: "1",
      details: JSON.stringify(req.body),
    });
    res.json(rows[0]);
  })
);

module.exports = router;
