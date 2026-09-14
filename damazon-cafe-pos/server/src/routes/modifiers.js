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
      `SELECT g.id, g.name, g.min_select, g.max_select, g.required,
              COALESCE(json_agg(json_build_object('id', o.id, 'name', o.name, 'priceDelta', o.price_delta) ORDER BY o.sort_order) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
       FROM modifier_groups g
       LEFT JOIN modifier_options o ON o.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name`
    );
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { name, minSelect = 0, maxSelect = 1, required = false, options = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const g = await client.query(
        `INSERT INTO modifier_groups (name, min_select, max_select, required) VALUES ($1,$2,$3,$4) RETURNING *`,
        [name, minSelect, maxSelect, required]
      );
      const groupId = g.rows[0].id;
      let sort = 1;
      for (const opt of options) {
        await client.query(
          `INSERT INTO modifier_options (group_id, name, price_delta, sort_order) VALUES ($1,$2,$3,$4)`,
          [groupId, opt.name, opt.priceDelta || 0, sort++]
        );
      }
      await client.query("COMMIT");
      res.status(201).json({ id: groupId });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await pool.query(`DELETE FROM modifier_groups WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
