const TIMEZONE = process.env.CAFE_TIMEZONE || "Asia/Kuala_Lumpur";

// Returns the cafe's local business date (YYYY-MM-DD) for a given instant.
// Using Intl avoids pulling in a date library just for timezone math.
function businessDateFor(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA gives YYYY-MM-DD
}

function todayBusinessDate() {
  return businessDateFor(new Date());
}

module.exports = { businessDateFor, todayBusinessDate, TIMEZONE };
