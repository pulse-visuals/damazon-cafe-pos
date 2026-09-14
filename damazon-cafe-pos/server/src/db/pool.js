const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway's managed Postgres works fine without SSL config for internal
  // connections; if you connect externally and Railway requires SSL, set
  // PGSSL=true in the environment.
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected Postgres pool error", err);
});

module.exports = { pool };
