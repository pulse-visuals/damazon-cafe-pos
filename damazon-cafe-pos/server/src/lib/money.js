// All money math is done in integer cents to avoid floating-point rounding
// errors, then converted back to a fixed 2-decimal string for Postgres
// numeric columns.

function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(parseFloat(value) * 100);
}

function centsToStr(cents) {
  return (cents / 100).toFixed(2);
}

module.exports = { toCents, centsToStr };
