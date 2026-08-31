const prisma = require("../prismaClient");
const { formatDateLocal } = require("./dateRange");

function startOfDayLocal(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Buckets revenue by calendar day across an inclusive [start, end] range.
// Admission revenue excludes labCharges/pharmacyCharges already counted via
// their own LabInvoice/PharmacyInvoice creation dates, to avoid double-counting.
async function revenueByDay(start, end) {
  const rangeStart = startOfDayLocal(start);
  const rangeEndExclusive = startOfDayLocal(end);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const [labInvoices, pharmacyInvoices, opdVisits, dischargeRecords] = await Promise.all([
    prisma.labInvoice.findMany({
      where: { createdAt: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.pharmacyInvoice.findMany({
      where: { createdAt: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.opdVisit.findMany({
      where: { visitDate: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { visitDate: true, doctorFee: true },
    }),
    prisma.dischargeRecord.findMany({
      where: { createdAt: { gte: rangeStart, lt: rangeEndExclusive } },
      select: { createdAt: true, totalBill: true, labCharges: true, pharmacyCharges: true },
    }),
  ]);

  const dayCount = Math.round((rangeEndExclusive - rangeStart) / 86400000);
  const buckets = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    buckets.push({ date: formatDateLocal(d), lab: 0, pharmacy: 0, opd: 0, admission: 0 });
  }

  const dayIndex = (date) => Math.round((startOfDayLocal(date) - rangeStart) / 86400000);

  for (const inv of labInvoices) {
    const i = dayIndex(inv.createdAt);
    if (buckets[i]) buckets[i].lab += inv.totalAmount;
  }
  for (const inv of pharmacyInvoices) {
    const i = dayIndex(inv.createdAt);
    if (buckets[i]) buckets[i].pharmacy += inv.totalAmount;
  }
  for (const v of opdVisits) {
    const i = dayIndex(v.visitDate);
    if (buckets[i]) buckets[i].opd += v.doctorFee;
  }
  for (const r of dischargeRecords) {
    const i = dayIndex(r.createdAt);
    if (buckets[i]) buckets[i].admission += r.totalBill - r.labCharges - r.pharmacyCharges;
  }

  return buckets.map((b) => ({ ...b, total: b.lab + b.pharmacy + b.opd + b.admission }));
}

module.exports = { revenueByDay, startOfDayLocal };
