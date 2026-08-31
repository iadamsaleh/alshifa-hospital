function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDay(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(dateStr) {
  const d = startOfDay(dateStr);
  d.setDate(d.getDate() + 1);
  return d;
}

// Date#toISOString() always converts to UTC, which shifts the calendar day
// backward for any timezone ahead of UTC (e.g. PKT, UTC+5) — this formats
// using the local calendar date instead, for day-bucket labels.
function formatDateLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = { startOfToday, startOfDay, endOfDay, formatDateLocal };
