export function formatDateLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonthLocal() {
  const now = new Date();
  return formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function todayLocal() {
  return formatDateLocal(new Date());
}
