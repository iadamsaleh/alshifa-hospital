const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const { startOfDay, endOfDay, formatDateLocal } = require("../utils/dateRange");
const { revenueByDay } = require("../utils/revenue");

const router = express.Router();

function calculateAge(dateOfBirth) {
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function defaultMonthRange() {
  const now = new Date();
  const from = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = formatDateLocal(now);
  return { from, to };
}

router.get("/revenue", requireRole("ADMIN"), async (req, res) => {
  const defaults = defaultMonthRange();
  const dateFrom = req.query.dateFrom || defaults.from;
  const dateTo = req.query.dateTo || defaults.to;

  const byDay = await revenueByDay(dateFrom, dateTo);
  const totals = byDay.reduce(
    (acc, d) => ({
      lab: acc.lab + d.lab,
      pharmacy: acc.pharmacy + d.pharmacy,
      opd: acc.opd + d.opd,
      admission: acc.admission + d.admission,
      total: acc.total + d.total,
    }),
    { lab: 0, pharmacy: 0, opd: 0, admission: 0, total: 0 }
  );

  res.json({ dateFrom, dateTo, totals, byDay });
});

router.get("/patients", requireRole("ADMIN"), async (req, res) => {
  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalPatients, newThisMonth, newLastMonth, patients] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { createdAt: { gte: startThisMonth } } }),
    prisma.patient.count({ where: { createdAt: { gte: startLastMonth, lt: startThisMonth } } }),
    prisma.patient.findMany({
      select: {
        id: true,
        name: true,
        patientId: true,
        gender: true,
        dateOfBirth: true,
        _count: { select: { opdVisits: true, admissions: true } },
      },
    }),
  ]);

  const topVisited = patients
    .map((p) => ({
      id: p.id,
      name: p.name,
      patientId: p.patientId,
      visitCount: p._count.opdVisits + p._count.admissions,
    }))
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 10);

  const genderBreakdown = patients.reduce((acc, p) => {
    acc[p.gender] = (acc[p.gender] || 0) + 1;
    return acc;
  }, {});

  const ageGroupDefs = [
    { label: "0-12", min: 0, max: 12 },
    { label: "13-25", min: 13, max: 25 },
    { label: "26-40", min: 26, max: 40 },
    { label: "41-60", min: 41, max: 60 },
    { label: "60+", min: 61, max: Infinity },
  ];
  const ageGroups = Object.fromEntries(ageGroupDefs.map((g) => [g.label, 0]));
  for (const p of patients) {
    const age = calculateAge(p.dateOfBirth);
    const group = ageGroupDefs.find((g) => age >= g.min && age <= g.max);
    if (group) ageGroups[group.label]++;
  }

  res.json({ totalPatients, newThisMonth, newLastMonth, topVisited, genderBreakdown, ageGroups });
});

router.get("/doctors", requireRole("ADMIN"), async (req, res) => {
  const defaults = defaultMonthRange();
  const dateFromStr = req.query.dateFrom || defaults.from;
  const dateToStr = req.query.dateTo || defaults.to;
  const dateFrom = startOfDay(dateFromStr);
  const dateTo = endOfDay(dateToStr);

  const doctors = await prisma.doctor.findMany({ orderBy: { name: "asc" } });

  const [opdVisits, admissions, dischargeRecords] = await Promise.all([
    prisma.opdVisit.findMany({
      where: { visitDate: { gte: dateFrom, lt: dateTo } },
      select: { doctorId: true, doctorFee: true },
    }),
    prisma.admission.findMany({
      where: { admissionDate: { gte: dateFrom, lt: dateTo } },
      select: { doctorId: true },
    }),
    prisma.dischargeRecord.findMany({
      where: { createdAt: { gte: dateFrom, lt: dateTo } },
      select: { doctorFee: true, admission: { select: { doctorId: true } } },
    }),
  ]);

  const rows = doctors.map((d) => {
    const opdForDoctor = opdVisits.filter((v) => v.doctorId === d.id);
    const admissionsForDoctor = admissions.filter((a) => a.doctorId === d.id);
    const dischargeForDoctor = dischargeRecords.filter((r) => r.admission.doctorId === d.id);
    const opdFees = opdForDoctor.reduce((s, v) => s + v.doctorFee, 0);
    const admissionFees = dischargeForDoctor.reduce((s, r) => s + r.doctorFee, 0);
    return {
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      opdCount: opdForDoctor.length,
      admissionsCount: admissionsForDoctor.length,
      totalFees: opdFees + admissionFees,
    };
  });

  res.json({ dateFrom: dateFromStr, dateTo: dateToStr, doctors: rows });
});

router.get("/lab", requireRole("ADMIN"), async (req, res) => {
  const where = {};
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = startOfDay(req.query.dateFrom);
    if (req.query.dateTo) where.createdAt.lt = endOfDay(req.query.dateTo);
  }

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [invoices, pendingCount, completedCount, monthInvoices] = await Promise.all([
    prisma.labInvoice.findMany({ where, select: { tests: true } }),
    prisma.labInvoice.count({ where: { ...where, labResult: null } }),
    prisma.labInvoice.count({ where: { ...where, labResult: { isNot: null } } }),
    prisma.labInvoice.findMany({ where: { createdAt: { gte: startMonth } }, select: { totalAmount: true } }),
  ]);

  const testCounts = {};
  for (const inv of invoices) {
    for (const t of inv.tests) {
      testCounts[t.testName] = (testCounts[t.testName] || 0) + 1;
    }
  }
  const topTests = Object.entries(testCounts)
    .map(([testName, count]) => ({ testName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const revenueThisMonth = monthInvoices.reduce((s, i) => s + i.totalAmount, 0);

  res.json({ topTests, pendingCount, completedCount, revenueThisMonth });
});

router.get("/pharmacy", requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.pharmacyItem.findMany();
  const totalInventoryValue = items.reduce((s, i) => s + i.stockQuantity * i.pricePerUnit, 0);
  const lowStock = items.filter((i) => i.stockQuantity < 10).sort((a, b) => a.stockQuantity - b.stockQuantity);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expired = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= now);
  const expiringSoon = items.filter(
    (i) => i.expiryDate && new Date(i.expiryDate) > now && new Date(i.expiryDate) <= in30Days
  );

  const invoices = await prisma.pharmacyInvoice.findMany({ select: { items: true } });
  const qtyByItem = {};
  for (const inv of invoices) {
    for (const it of inv.items) {
      qtyByItem[it.itemName] = (qtyByItem[it.itemName] || 0) + it.quantity;
    }
  }
  const topSelling = Object.entries(qtyByItem)
    .map(([itemName, quantity]) => ({ itemName, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  res.json({ totalInventoryValue, lowStock, expired, expiringSoon, topSelling });
});

module.exports = router;
