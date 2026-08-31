const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// ESR's normal range depends on the patient's gender, unlike every other
// templated parameter — handled as a narrow special case rather than adding
// a general gender-conditional range system to the schema for one parameter.
function effectiveMax(parameterName, normalRangeMax, gender) {
  if (parameterName === "ESR 1st Hour") {
    return gender === "Male" ? 20 : 30;
  }
  return normalRangeMax;
}

router.get("/pending", async (req, res) => {
  const invoices = await prisma.labInvoice.findMany({
    where: { labResult: null },
    include: { patient: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(invoices);
});

router.get("/patient/:patientId", async (req, res) => {
  const results = await prisma.labResult.findMany({
    where: { patientId: Number(req.params.patientId) },
    orderBy: { createdAt: "desc" },
  });
  res.json(results);
});

// All lab results for a specific OPD visit (via prescriptions linked to that visit)
router.get("/opd/:opdVisitId", async (req, res) => {
  const opdVisitId = Number(req.params.opdVisitId);

  // Find all lab invoices whose prescription belongs to this OPD visit
  const invoices = await prisma.labInvoice.findMany({
    where: { prescription: { opdVisitId } },
    select: { id: true },
  });

  if (invoices.length === 0) {
    return res.json([]);
  }

  const invoiceIds = invoices.map((i) => i.id);

  const results = await prisma.labResult.findMany({
    where: { labInvoiceId: { in: invoiceIds } },
    include: { labInvoice: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(results);
});

router.post("/", requireRole("ADMIN", "LAB_ASSISTANT"), async (req, res) => {
  const { labInvoiceId, results } = req.body;
  if (!labInvoiceId || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "labInvoiceId and results are required" });
  }

  const invoice = await prisma.labInvoice.findUnique({
    where: { id: Number(labInvoiceId) },
    include: { patient: true },
  });
  if (!invoice) return res.status(404).json({ error: "Lab invoice not found" });

  const processedResults = results.map((r) => {
    if (r.inputType === "numeric" && r.value !== "" && r.value != null) {
      const numValue = Number(r.value);
      const max = effectiveMax(r.parameterName, r.normalRangeMax, invoice.patient.gender);
      const isAbnormal =
        (r.normalRangeMin != null && numValue < r.normalRangeMin) || (max != null && numValue > max);
      return { ...r, value: numValue, isAbnormal };
    }
    // Text parameters: isAbnormal is determined by the frontend (no general
    // notion of a numeric "out of range" for free text), trusted as-is here.
    return { ...r, isAbnormal: Boolean(r.isAbnormal) };
  });

  const labResult = await prisma.labResult.upsert({
    where: { labInvoiceId: Number(labInvoiceId) },
    update: { results: processedResults, technicianId: req.user.id, status: "COMPLETED" },
    create: {
      labInvoiceId: Number(labInvoiceId),
      patientId: invoice.patientId,
      technicianId: req.user.id,
      results: processedResults,
      status: "COMPLETED",
    },
  });

  res.status(201).json(labResult);
});

router.get("/:labInvoiceId", async (req, res) => {
  const result = await prisma.labResult.findUnique({
    where: { labInvoiceId: Number(req.params.labInvoiceId) },
    include: {
      patient: true,
      labInvoice: { include: { admission: { include: { doctor: true } } } },
    },
  });
  if (!result) return res.status(404).json({ error: "Lab result not found" });

  let technician = null;
  if (result.technicianId) {
    technician = await prisma.user.findUnique({
      where: { id: result.technicianId },
      select: { id: true, name: true },
    });
  }

  res.json({ ...result, technician });
});

module.exports = router;
