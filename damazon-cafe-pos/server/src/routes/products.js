const express = require("express");
const { pool } = require("../db/pool");
const { asyncHandler } = require("../lib/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/products?search=&categoryId=&includeUnavailable=1
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { search, categoryId, includeUnavailable } = req.query;
    const clauses = [];
    const values = [];
    let i = 1;

    if (!includeUnavailable) {
      clauses.push(`p.available = true`);
    }
    if (categoryId) {
      values.push(categoryId);
      clauses.push(`p.category_id = $${i++}`);
    }
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      clauses.push(
        `(LOWER(p.name) LIKE $${i} OR LOWER(COALESCE(p.sku,'')) LIKE $${i} OR LOWER(COALESCE(p.barcode,'')) LIKE $${i})`
      );
      i++;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.sort_order ASC, p.name ASC`,
      values
    );
    res.json(rows);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    const groups = await pool.query(
      `SELECT g.id, g.name, g.min_select, g.max_select, g.required,
              COALESCE(json_agg(json_build_object('id', o.id, 'name', o.name, 'priceDelta', o.price_delta) ORDER BY o.sort_order) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
       FROM product_modifier_groups pmg
       JOIN modifier_groups g ON g.id = pmg.group_id
       LEFT JOIN modifier_options o ON o.group_id = g.id
       WHERE pmg.product_id = $1
       GROUP BY g.id`,
      [req.params.id]
    );
    res.json({ ...rows[0], modifierGroups: groups.rows });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const {
      name, categoryId, sku, barcode, price, costPrice, taxRate = 0,
      description, imageUrl, prepTimeMinutes, trackStock = false,
      stockQty, minStock, available = true, sortOrder = 0,
    } = req.body || {};
    if (!name || !categoryId || price == null) {
      return res.status(400).json({ error: "name, categoryId and price are required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO products
        (name, category_id, sku, barcode, price, cost_price, tax_rate, description, image_url,
         prep_time_minutes, track_stock, stock_qty, min_stock, available, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        name, categoryId, sku || null, barcode || null, price, costPrice || null, taxRate,
        description || null, imageUrl || null, prepTimeMinutes || null, trackStock,
        stockQty ?? null, minStock ?? null, available, sortOrder,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const fields = {
      name: "name", categoryId: "category_id", sku: "sku", barcode: "barcode",
      price: "price", costPrice: "cost_price", taxRate: "tax_rate", description: "description",
      imageUrl: "image_url", prepTimeMinutes: "prep_time_minutes", trackStock: "track_stock",
      stockQty: "stock_qty", minStock: "min_stock", available: "available", sortOrder: "sort_order",
    };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, col] of Object.entries(fields)) {
      if (key in req.body) {
        sets.push(`${col} = $${i++}`);
        values.push(req.body[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: "No editable fields provided" });
    sets.push(`updated_at = now()`);
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE products SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await pool.query(`UPDATE products SET available = false WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  })
);

// Link/unlink modifier groups to a product
router.put(
  "/:id/modifier-groups",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { groupIds = [] } = req.body || {};
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM product_modifier_groups WHERE product_id = $1`, [req.params.id]);
      for (const groupId of groupIds) {
        await client.query(
          `INSERT INTO product_modifier_groups (product_id, group_id) VALUES ($1,$2)`,
          [req.params.id, groupId]
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

module.exports = router;
