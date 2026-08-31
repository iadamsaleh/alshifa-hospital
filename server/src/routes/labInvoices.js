const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { startOfDay, endOfDay } = require("../utils/dateRange");

const router = express.Router();

function formatInvoiceNumber(n) {
  return `LAB-${String(n).padStart(4, "0")}`;
}

function withInvoiceNumber(invoice) {
  return { ...invoice, invoiceNumber: formatInvoiceNumber(invoice.id) };
}

router.post("/", requireRole("ADMIN", "LAB_ASSISTANT"), async (req, res) => {
  const { patientId, admissionId, tests } = req.body;
  if (!patientId || !Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: "patientId and at least one test are required" });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } });
      if (!patient) throw new HttpError(404, "Patient not found");

      if (admissionId) {
        const admission = await tx.admission.findUnique({ where: { id: Number(admissionId) } });
        if (!admission) throw new HttpError(404, "Admission not found");
      }

      const testIds = tests.map((t) => Number(t.testId));
      const catalogTests = await tx.labTest.findMany({ where: { id: { in: testIds } } });
      const catalogById = new Map(catalogTests.map((t) => [t.id, t]));

      const snapshotTests = tests.map((t) => {
        const catalogTest = catalogById.get(Number(t.testId));
        if (!catalogTest) throw new HttpError(404, `Lab test ${t.testId} not found`);
        const price = t.price != null ? Number(t.price) : catalogTest.price;
        return { testId: catalogTest.id, testName: catalogTest.testName, testCode: catalogTest.testCode, price };
      });

      const totalAmount = snapshotTests.reduce((sum, t) => sum + t.price, 0);

      return tx.labInvoice.create({
        data: {
          patientId: Number(patientId),
          admissionId: admissionId ? Number(admissionId) : null,
          tests: snapshotTests,
          totalAmount,
        },
        include: { patient: true, admission: true },
      });
    });

    res.status(201).json(withInvoiceNumber(invoice));
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/", async (req, res) => {
  const search = (req.query.search || "").trim();
  const status = req.query.status || null;
  const dateFrom = req.query.dateFrom ? startOfDay(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? endOfDay(req.query.dateTo) : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = {
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lt: dateTo } : {}) } }
      : {}),
    ...(search
      ? {
          OR: [
            { patient: { name: { contains: search } } },
            { patient: { patientId: { contains: search } } },
            { patient: { phone: { contains: search } } },
          ],
        }
      : {}),
  };

  const [total, invoices] = await Promise.all([
    prisma.labInvoice.count({ where }),
    prisma.labInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { patient: true, admission: true },
    }),
  ]);

  res.json({
    data: invoices.map(withInvoiceNumber),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.get("/:id", async (req, res) => {
  const invoice = await prisma.labInvoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { patient: true, admission: true },
  });
  if (!invoice) return res.status(404).json({ error: "Lab invoice not found" });
  res.json(withInvoiceNumber(invoice));
});

router.patch("/:id/pay", requireRole("ADMIN", "LAB_ASSISTANT"), async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.labInvoice.findUnique({ where: { id } });
  if (!invoice) return res.status(404).json({ error: "Lab invoice not found" });
  if (invoice.status === "PAID") return res.status(400).json({ error: "Invoice already marked paid" });

  const updated = await prisma.labInvoice.update({
    where: { id },
    data: { status: "PAID" },
    include: { patient: true, admission: true },
  });
  res.json(withInvoiceNumber(updated));
});

module.exports = router;
