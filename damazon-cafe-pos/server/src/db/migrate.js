require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  // Ensure the singleton settings row exists.
  await pool.query(
    `INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`
  );
  // eslint-disable-next-line no-console
  console.log("Migration complete.");
  await pool.end();
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err);
  process.exit(1);
});
