const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

const PATIENT_ID_PREFIX = "ASD-";

async function generatePatientId(tx) {
  const existing = await tx.patient.findMany({
    where: { patientId: { startsWith: PATIENT_ID_PREFIX } },
    select: { patientId: true },
  });
  const max = existing.reduce((acc, p) => {
    const num = parseInt(p.patientId.slice(PATIENT_ID_PREFIX.length), 10);
    return Number.isFinite(num) && num > acc ? num : acc;
  }, 0);
  return `${PATIENT_ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
}

router.get("/", async (req, res) => {
  const search = (req.query.search || "").trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = search
    ? {
        OR: [
          { patientId: { contains: search } },
          { name: { contains: search } },
          { phone: { contains: search } },
        ],
      }
    : {};

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { admissions: true } },
        admissions: { orderBy: { admissionDate: "desc" }, take: 1, select: { admissionDate: true } },
      },
    }),
  ]);

  const data = patients.map((p) => ({
    id: p.id,
    patientId: p.patientId,
    name: p.name,
    gender: p.gender,
    phone: p.phone,
    dateOfBirth: p.dateOfBirth,
    bloodGroup: p.bloodGroup,
    address: p.address,
    createdAt: p.createdAt,
    totalVisits: p._count.admissions,
    lastVisitDate: p.admissions[0]?.admissionDate || null,
  }));

  res.json({ data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

router.get("/:id", async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      admissions: {
        orderBy: { admissionDate: "desc" },
        include: { doctor: true, room: true, bed: true },
      },
      opdVisits: {
        orderBy: { visitDate: "desc" },
        include: { doctor: true },
      },
      labInvoices: { orderBy: { createdAt: "desc" } },
      pharmacyInvoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

router.post("/", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const { name, gender, dateOfBirth, phone, address, bloodGroup } = req.body;
  if (!name || !gender || !dateOfBirth || !phone) {
    return res.status(400).json({ error: "name, gender, dateOfBirth and phone are required" });
  }

  const patient = await prisma.$transaction(async (tx) => {
    const patientId = await generatePatientId(tx);
    return tx.patient.create({
      data: {
        patientId,
        name,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        phone,
        address,
        bloodGroup,
      },
    });
  });

  res.status(201).json(patient);
});

module.exports = router;
