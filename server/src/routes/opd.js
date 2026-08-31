const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { startOfToday, startOfDay, endOfDay } = require("../utils/dateRange");

const router = express.Router();

function formatToken(n) {
  return `OPD-${String(n).padStart(3, "0")}`;
}

async function generateTokenNumber(tx) {
  const last = await tx.opdVisit.findFirst({
    where: { visitDate: { gte: startOfToday() } },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber || 0) + 1;
}

router.post("/", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const { patientId, doctorId, chiefComplaint } = req.body;
  if (!patientId || !doctorId) {
    return res.status(400).json({ error: "patientId and doctorId are required" });
  }

  try {
    const visit = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } });
      if (!patient) throw new HttpError(404, "Patient not found");

      const doctor = await tx.doctor.findUnique({ where: { id: Number(doctorId) } });
      if (!doctor) throw new HttpError(404, "Doctor not found");

      const tokenNumber = await generateTokenNumber(tx);

      return tx.opdVisit.create({
        data: {
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          tokenNumber,
          chiefComplaint: chiefComplaint || null,
          doctorFee: doctor.consultationFee,
        },
        include: { patient: true, doctor: true },
      });
    });

    res.status(201).json({ ...visit, tokenLabel: formatToken(visit.tokenNumber) });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/today", async (req, res) => {
  try {
    const visits = await prisma.opdVisit.findMany({
      where: { visitDate: { gte: startOfToday() } },
      orderBy: { tokenNumber: "asc" },
      include: {
        patient: true,
        doctor: true,
        prescriptions: {
          include: { labInvoice: true },
        },
      },
    });

    res.json(
      visits.map((v) => {
        let pendingLabInvoice = null;
        for (const p of v.prescriptions) {
          if (p.labInvoice && p.labInvoice.status === "PENDING") {
            pendingLabInvoice = p.labInvoice;
            break;
          }
        }
        const { prescriptions, ...rest } = v;
        return { ...rest, tokenLabel: formatToken(v.tokenNumber), pendingLabInvoice };
      })
    );
  } catch (err) {
    console.error("GET /opd/today error:", err);
    res.status(500).json({ error: "Failed to load today's queue" });
  }
});

router.get("/:id", async (req, res) => {
  const visit = await prisma.opdVisit.findUnique({
    where: { id: Number(req.params.id) },
    include: { patient: true, doctor: true },
  });
  if (!visit) return res.status(404).json({ error: "OPD visit not found" });
  res.json({ ...visit, tokenLabel: formatToken(visit.tokenNumber) });
});

router.get("/", async (req, res) => {
  const search = (req.query.search || "").trim();
  const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
  const dateFrom = req.query.dateFrom ? startOfDay(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? endOfDay(req.query.dateTo) : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = {
    ...(doctorId ? { doctorId } : {}),
    ...(dateFrom || dateTo
      ? { visitDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lt: dateTo } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { patient: { name: { contains: search } } },
            { patient: { patientId: { contains: search } } },
            { doctor: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [total, visits] = await Promise.all([
    prisma.opdVisit.count({ where }),
    prisma.opdVisit.findMany({
      where,
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { patient: true, doctor: true },
    }),
  ]);

  res.json({
    data: visits.map((v) => ({ ...v, tokenLabel: formatToken(v.tokenNumber) })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.patch("/:id/complete", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const id = Number(req.params.id);
  const visit = await prisma.opdVisit.findUnique({ where: { id } });
  if (!visit) return res.status(404).json({ error: "OPD visit not found" });
  if (visit.status === "COMPLETE") return res.status(400).json({ error: "Visit already marked complete" });

  const updated = await prisma.opdVisit.update({
    where: { id },
    data: { status: "COMPLETE" },
    include: { patient: true, doctor: true },
  });
  res.json({ ...updated, tokenLabel: formatToken(updated.tokenNumber) });
});

module.exports = router;
