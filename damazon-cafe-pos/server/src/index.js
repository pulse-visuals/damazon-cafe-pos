require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "damazon-pos-server" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/products", require("./routes/products"));
app.use("/api/modifiers", require("./routes/modifiers"));
app.use("/api/tables", require("./routes/tables"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/closing", require("./routes/closing"));
app.use("/api/expenses", require("./routes/expenses"));
app.use("/api/users", require("./routes/users"));
app.use("/api/audit", require("./routes/audit"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Centralized error handler — every route uses asyncHandler so thrown errors
// (including ones with a .status set) land here instead of crashing the process.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`D'Amazon Cafe POS server listening on port ${port}`);
});
