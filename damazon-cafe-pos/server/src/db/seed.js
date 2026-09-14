require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("./pool");

// Sample catalog for D'Amazon Cafe — a jungle-canopy themed cafe.
// Replace/extend via the admin Products screen once the app is running.
const CATEGORIES = [
  { name: "Coffee", icon: "☕", sortOrder: 1 },
  { name: "Cold Drinks", icon: "🥤", sortOrder: 2 },
  { name: "Tea", icon: "🍵", sortOrder: 3 },
  { name: "Burgers", icon: "🍔", sortOrder: 4 },
  { name: "Sandwiches", icon: "🥪", sortOrder: 5 },
  { name: "Rice", icon: "🍚", sortOrder: 6 },
  { name: "Snacks", icon: "🍟", sortOrder: 7 },
  { name: "Desserts", icon: "🍰", sortOrder: 8 },
  { name: "Specials", icon: "⭐", sortOrder: 9 },
];

const PRODUCTS = {
  Coffee: [
    ["Espresso", 6.0, "espresso"],
    ["Americano", 7.0, "coffee-cup"],
    ["Cappuccino", 9.0, "coffee-cup"],
    ["Latte", 10.0, "coffee-cup"],
    ["Mocha", 11.0, "coffee-cup"],
    ["Caramel Macchiato", 12.0, "coffee-cup"],
  ],
  "Cold Drinks": [
    ["Iced Coffee", 9.5, "cold-cup"],
    ["Iced Lemon Tea", 7.0, "cold-cup"],
    ["Fresh Orange Juice", 9.0, "cold-cup"],
    ["Mango Smoothie", 12.0, "cold-cup"],
    ["Soda Kurma", 8.0, "cold-cup"],
  ],
  Tea: [
    ["Teh Tarik", 5.5, "tea"],
    ["Teh O", 4.0, "tea"],
    ["Green Tea", 6.0, "tea"],
    ["Chamomile Tea", 7.0, "tea"],
  ],
  Burgers: [
    ["Chicken Burger", 15.0, "burger"],
    ["Beef Burger", 18.0, "burger"],
    ["Jungle Special Burger", 22.0, "burger"],
  ],
  Sandwiches: [
    ["Club Sandwich", 16.0, "sandwich"],
    ["Grilled Cheese Sandwich", 12.0, "sandwich"],
    ["Tuna Sandwich", 14.0, "sandwich"],
  ],
  Rice: [
    ["Nasi Lemak Ayam", 13.0, "rice"],
    ["Nasi Lemak Rendang", 15.0, "rice"],
    ["Nasi Goreng Kampung", 12.0, "rice"],
  ],
  Snacks: [
    ["French Fries", 8.0, "fries"],
    ["Onion Rings", 9.0, "snack"],
    ["Chicken Wings (6pcs)", 14.0, "snack"],
  ],
  Desserts: [
    ["Chocolate Cake", 12.0, "cake"],
    ["Cheesecake", 13.0, "cake"],
    ["Ice Cream Sundae", 9.0, "ice-cream"],
  ],
  Specials: [
    ["Jungle Canopy Platter", 32.0, "special"],
    ["Toucan's Choice Combo", 24.0, "special"],
  ],
};

const MODIFIER_GROUPS = [
  {
    name: "Coffee Options",
    minSelect: 0,
    maxSelect: 3,
    required: false,
    options: [
      ["Regular", 0],
      ["Large", 2.0],
      ["Extra Shot", 3.0],
      ["Less Sugar", 0],
      ["No Sugar", 0],
      ["Soy Milk", 1.5],
      ["Oat Milk", 2.0],
    ],
    appliesTo: "Coffee",
  },
  {
    name: "Burger Add-ons",
    minSelect: 0,
    maxSelect: 5,
    required: false,
    options: [
      ["Extra Cheese", 2.5],
      ["Extra Sauce", 1.0],
      ["Add Egg", 2.0],
      ["No Onion", 0],
      ["No Pickles", 0],
    ],
    appliesTo: "Burgers",
  },
];

const TABLES = Array.from({ length: 10 }, (_, i) => ({
  label: `Table ${String(i + 1).padStart(2, "0")}`,
  capacity: i % 3 === 0 ? 4 : 2,
}));

const USERS = [
  { name: "Nature Admin", username: "admin", password: "admin123", role: "ADMIN" },
  { name: "Cafe Manager", username: "manager", password: "manager123", role: "MANAGER" },
  { name: "Ahmed", username: "cashier1", password: "cashier123", role: "CASHIER" },
  { name: "Sara", username: "cashier2", password: "cashier123", role: "CASHIER" },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Users
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (name, username, password_hash, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (username) DO NOTHING`,
        [u.name, u.username, hash, u.role]
      );
    }

    // Categories
    const categoryIds = {};
    for (const c of CATEGORIES) {
      const res = await client.query(
        `INSERT INTO categories (name, icon, sort_order)
         VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [c.name, c.icon, c.sortOrder]
      );
      let id = res.rows[0]?.id;
      if (!id) {
        const existing = await client.query(`SELECT id FROM categories WHERE name = $1`, [c.name]);
        id = existing.rows[0].id;
      }
      categoryIds[c.name] = id;
    }

    // Products
    const productIds = {};
    for (const [catName, items] of Object.entries(PRODUCTS)) {
      const categoryId = categoryIds[catName];
      let sort = 1;
      for (const [name, price] of items) {
        const sku = `${catName.slice(0, 3).toUpperCase()}-${sort.toString().padStart(3, "0")}`;
        const res = await client.query(
          `INSERT INTO products (name, category_id, sku, price, tax_rate, sort_order, available)
           VALUES ($1,$2,$3,$4,0,$5,true)
           ON CONFLICT (sku) DO NOTHING
           RETURNING id`,
          [name, categoryId, sku, price, sort]
        );
        let id = res.rows[0]?.id;
        if (!id) {
          const existing = await client.query(`SELECT id FROM products WHERE sku = $1`, [sku]);
          id = existing.rows[0].id;
        }
        productIds[name] = id;
        sort += 1;
      }
    }

    // Modifier groups + options, linked to categories' products
    for (const g of MODIFIER_GROUPS) {
      const res = await client.query(
        `INSERT INTO modifier_groups (name, min_select, max_select, required)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [g.name, g.minSelect, g.maxSelect, g.required]
      );
      const groupId = res.rows[0].id;
      let sort = 1;
      for (const [optName, delta] of g.options) {
        await client.query(
          `INSERT INTO modifier_options (group_id, name, price_delta, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [groupId, optName, delta, sort]
        );
        sort += 1;
      }
      const productsInCategory = PRODUCTS[g.appliesTo] || [];
      for (const [name] of productsInCategory) {
        const productId = productIds[name];
        if (productId) {
          await client.query(
            `INSERT INTO product_modifier_groups (product_id, group_id)
             VALUES ($1,$2) ON CONFLICT DO NOTHING`,
            [productId, groupId]
          );
        }
      }
    }

    // Tables
    for (const t of TABLES) {
      await client.query(
        `INSERT INTO tables (label, capacity) VALUES ($1,$2) ON CONFLICT (label) DO NOTHING`,
        [t.label, t.capacity]
      );
    }

    // Settings defaults for D'Amazon Cafe
    await client.query(
      `UPDATE settings SET
         cafe_name = $1,
         tagline = $2,
         address = $3,
         phone = $4,
         email = $5,
         currency = 'MYR',
         currency_symbol = 'RM',
         tax_rate = 6.00,
         service_charge_rate = 0,
         receipt_footer = $6
       WHERE id = 1`,
      [
        "D'Amazon Cafe",
        "Taste the Wild. Savor the Moment.",
        "Monkeys Canopy Resort, Sungai Long, Cheras, Selangor",
        "+60 12-345 6789",
        "hello@damazoncafe.com",
        "Thank you for visiting D'Amazon Cafe!",
      ]
    );

    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log("Seed complete.");
    // eslint-disable-next-line no-console
    console.log("Login with: admin/admin123, manager/manager123, cashier1/cashier123, cashier2/cashier123");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  process.exit(1);
});
