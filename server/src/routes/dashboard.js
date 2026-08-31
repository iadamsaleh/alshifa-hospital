const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const { startOfToday, formatDateLocal } = require("../utils/dateRange");
const { revenueByDay } = require("../utils/revenue");

const router = express.Router();

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatOpdToken(n) {
  return `OPD-${String(n).padStart(3, "0")}`;
}

async function visitsByDayThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = startOfToday();
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  const dayCount = Math.round((end - start) / 86400000);

  const [opdVisits, admissions] = await Promise.all([
    prisma.opdVisit.findMany({ where: { visitDate: { gte: start, lt: end } }, select: { visitDate: true } }),
    prisma.admission.findMany({ where: { admissionDate: { gte: start, lt: end } }, select: { admissionDate: true } }),
  ]);

  const buckets = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.push({ date: formatDateLocal(d), opd: 0, admissions: 0 });
  }
  const dayIndex = (date) => {
    const d = new Date(date);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((ds - start) / 86400000);
  };
  for (const v of opdVisits) {
    const i = dayIndex(v.visitDate);
    if (buckets[i]) buckets[i].opd++;
  }
  for (const a of admissions) {
    const i = dayIndex(a.admissionDate);
    if (buckets[i]) buckets[i].admissions++;
  }
  return buckets.map((b) => ({ ...b, total: b.opd + b.admissions }));
}

router.get("/", requireRole("ADMIN"), async (req, res) => {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    opdToday,
    admissionsToday,
    labInvoicesToday,
    pharmacyInvoicesToday,
    opdVisitsToday,
    currentlyAdmitted,
    rooms,
    lowStockCount,
    pendingLabResultsCount,
    activeDoctors,
    opdQueue,
    recentAdmissions,
    revenueWeek,
    visitsMonth,
  ] = await Promise.all([
    prisma.opdVisit.count({ where: { visitDate: { gte: today, lt: tomorrow } } }),
    prisma.admission.count({ where: { admissionDate: { gte: today, lt: tomorrow } } }),
    prisma.labInvoice.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, select: { totalAmount: true } }),
    prisma.pharmacyInvoice.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { totalAmount: true },
    }),
    prisma.opdVisit.findMany({ where: { visitDate: { gte: today, lt: tomorrow } }, select: { doctorFee: true } }),
    prisma.admission.count({ where: { status: "ADMITTED" } }),
    prisma.room.findMany(),
    prisma.pharmacyItem.count({ where: { stockQuantity: { lt: 10 } } }),
    prisma.labInvoice.count({ where: { labResult: null } }),
    prisma.doctor.findMany({ where: { isActive: true }, select: { schedule: true } }),
    prisma.opdVisit.findMany({
      where: { visitDate: { gte: today, lt: tomorrow }, status: "WAITING" },
      orderBy: { tokenNumber: "asc" },
      include: { patient: true, doctor: true },
    }),
    prisma.admission.findMany({
      where: { status: "ADMITTED" },
      orderBy: { admissionDate: "desc" },
      take: 5,
      include: { patient: true, doctor: true, room: true, bed: true },
    }),
    revenueByDay(sevenDaysAgo, today),
    visitsByDayThisMonth(),
  ]);

  const labRevenueToday = labInvoicesToday.reduce((s, i) => s + i.totalAmount, 0);
  const pharmacyRevenueToday = pharmacyInvoicesToday.reduce((s, i) => s + i.totalAmount, 0);
  const opdRevenueToday = opdVisitsToday.reduce((s, v) => s + v.doctorFee, 0);

  const totalBeds = rooms.reduce((s, r) => s + r.totalBeds, 0);
  const availableBeds = rooms.reduce((s, r) => s + r.availableBeds, 0);
  const occupiedBeds = totalBeds - availableBeds;
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const todayAbbr = DAY_ABBR[new Date().getDay()];
  const activeDoctorsToday = activeDoctors.filter((d) => d.schedule?.days?.includes(todayAbbr)).length;

  res.json({
    today: {
      opdCount: opdToday,
      newAdmissions: admissionsToday,
      revenue: labRevenueToday + pharmacyRevenueToday + opdRevenueToday,
      currentlyAdmitted,
    },
    beds: { total: totalBeds, occupied: occupiedBeds, available: availableBeds, occupancyPercent },
    lowStockCount,
    pendingLabResultsCount,
    activeDoctorsToday,
    revenueWeek,
    visitsMonth,
    opdQueue: opdQueue.map((v) => ({
      id: v.id,
      tokenLabel: formatOpdToken(v.tokenNumber),
      patientName: v.patient.name,
      doctorName: v.doctor.name,
      visitDate: v.visitDate,
    })),
    recentAdmissions: recentAdmissions.map((a) => ({
      id: a.id,
      patientName: a.patient.name,
      room: a.room ? `${a.room.roomNumber} (${a.room.type})` : "—",
      bed: a.bed ? a.bed.bedNumber : null,
      doctorName: a.doctor.name,
      daysAdmitted: Math.max(1, Math.ceil((Date.now() - a.admissionDate.getTime()) / (1000 * 60 * 60 * 24))),
    })),
  });
});

module.exports = router;
