const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const HttpError = require("../utils/httpError");

const router = express.Router();

router.get("/medicines", async (req, res) => {
  const search = (req.query.search || "").trim();
  const where = search ? { name: { contains: search } } : {};

  const [pharmacyItems, customMedicines] = await Promise.all([
    prisma.pharmacyItem.findMany({ where, orderBy: { name: "asc" } }),
    prisma.prescriptionMedicine.findMany({ where, orderBy: { name: "asc" } }),
  ]);

  const combined = [
    ...pharmacyItems.map((p) => ({
      id: p.id,
      name: p.name,
      genericName: null,
      category: p.category,
      source: "pharmacy",
      defaultDose: p.defaultDose,
      defaultFrequency: p.defaultFrequency,
      defaultInstructions: p.defaultInstructions,
      defaultDuration: p.defaultDuration,
      defaultDurationUnit: p.defaultDurationUnit,
    })),
    ...customMedicines.map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      source: m.isCustom ? "custom" : "pharmacy",
      defaultDose: m.defaultDose,
      defaultFrequency: m.defaultFrequency,
      defaultInstructions: m.defaultInstructions,
      defaultDuration: m.defaultDuration,
      defaultDurationUnit: m.defaultDurationUnit,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  res.json(combined);
});

router.post("/medicines", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const { name, genericName, category } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const medicine = await prisma.prescriptionMedicine.create({
    data: { name, genericName: genericName || null, category: category || null, isCustom: true },
  });
  res.status(201).json(medicine);
});

router.put("/medicines/:id", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const { source, defaultDose, defaultFrequency, defaultInstructions, defaultDuration, defaultDurationUnit } =
    req.body;
  if (source !== "pharmacy" && source !== "custom") {
    return res.status(400).json({ error: "source must be 'pharmacy' or 'custom'" });
  }

  const data = {};
  if (defaultDose !== undefined) data.defaultDose = defaultDose || null;
  if (defaultFrequency !== undefined) data.defaultFrequency = defaultFrequency || null;
  if (defaultInstructions !== undefined) data.defaultInstructions = defaultInstructions || null;
  if (defaultDuration !== undefined) data.defaultDuration = defaultDuration ? String(defaultDuration) : null;
  if (defaultDurationUnit !== undefined) data.defaultDurationUnit = defaultDurationUnit || null;

  try {
    const updated =
      source === "pharmacy"
        ? await prisma.pharmacyItem.update({ where: { id: Number(req.params.id) }, data })
        : await prisma.prescriptionMedicine.update({ where: { id: Number(req.params.id) }, data });
    res.json({ ...updated, source });
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Medicine not found" });
    throw err;
  }
});

router.delete("/medicines/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.prescriptionMedicine.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Medicine not found" });
    throw err;
  }
});

// GET /pending — prescriptions waiting for lab results
// DOCTOR: only their own patients; ADMIN: all
router.get("/pending", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const where = { status: "PENDING_INVESTIGATIONS" };

  if (req.user.role === "DOCTOR" && req.user.doctorId) {
    where.doctorId = req.user.doctorId;
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      patient: true,
      doctor: true,
      opdVisit: true,
      labInvoice: true,
    },
  });

  res.json(prescriptions);
});

router.post("/", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const { patientId, opdVisitId, doctorId, medicines, investigations, advisedInvestigations, diagnoses, comments } = req.body;
  if (!patientId || !opdVisitId || !doctorId) {
    return res.status(400).json({ error: "patientId, opdVisitId and doctorId are required" });
  }
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: "At least one medicine is required" });
  }

  const advised = Array.isArray(advisedInvestigations) ? advisedInvestigations : [];
  const hasPendingInvestigations = advised.length > 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } });
      if (!patient) throw new HttpError(404, "Patient not found");

      const visit = await tx.opdVisit.findUnique({ where: { id: Number(opdVisitId) } });
      if (!visit) throw new HttpError(404, "OPD visit not found");

      const doctor = await tx.doctor.findUnique({ where: { id: Number(doctorId) } });
      if (!doctor) throw new HttpError(404, "Doctor not found");

      const prescription = await tx.prescription.create({
        data: {
          patientId: Number(patientId),
          opdVisitId: Number(opdVisitId),
          doctorId: Number(doctorId),
          medicines,
          investigations: Array.isArray(investigations) ? investigations : [],
          advisedInvestigations: advised,
          diagnoses: Array.isArray(diagnoses) ? diagnoses : [],
          status: hasPendingInvestigations ? "PENDING_INVESTIGATIONS" : "COMPLETE",
          comments: comments || null,
        },
        include: { patient: true, doctor: true, opdVisit: true },
      });

      if (!hasPendingInvestigations) {
        return { prescription, labInvoice: null };
      }

      // Snapshot test details from catalog; advised array already carries name/code/price
      // (doctor picked from lab tests list which has current catalog prices).
      // We still verify tests exist to avoid phantom test IDs.
      const testIds = advised.map((t) => Number(t.testId));
      const catalogTests = await tx.labTest.findMany({ where: { id: { in: testIds } } });
      const catalogById = new Map(catalogTests.map((t) => [t.id, t]));

      const snapshotTests = advised.map((t) => {
        const catalog = catalogById.get(Number(t.testId));
        if (!catalog) throw new HttpError(404, `Lab test ${t.testId} not found`);
        return {
          testId: catalog.id,
          testName: catalog.testName,
          testCode: catalog.testCode,
          price: catalog.price,
        };
      });

      const totalAmount = snapshotTests.reduce((sum, t) => sum + t.price, 0);

      const labInvoice = await tx.labInvoice.create({
        data: {
          patientId: Number(patientId),
          prescriptionId: prescription.id,
          tests: snapshotTests,
          totalAmount,
          status: "PENDING",
        },
        include: { patient: true },
      });

      return { prescription, labInvoice };
    });

    res.status(201).json({
      ...result.prescription,
      labInvoiceId: result.labInvoice?.id ?? null,
    });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

// PATCH /:id — update prescription fields (used by Review & Save flow)
router.patch("/:id", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const id = Number(req.params.id);
  const { medicines, investigations, diagnoses, comments } = req.body;

  const prescription = await prisma.prescription.findUnique({ where: { id } });
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });

  const data = {};
  if (medicines !== undefined) data.medicines = medicines;
  if (investigations !== undefined) data.investigations = investigations;
  if (diagnoses !== undefined) data.diagnoses = diagnoses;
  if (comments !== undefined) data.comments = comments || null;

  const updated = await prisma.prescription.update({
    where: { id },
    data,
    include: { patient: true, doctor: true, opdVisit: true, labInvoice: true },
  });

  res.json(updated);
});

// PATCH /:id/complete — mark prescription COMPLETE (ADMIN/DOCTOR only)
router.patch("/:id/complete", requireRole("ADMIN", "DOCTOR"), async (req, res) => {
  const id = Number(req.params.id);
  const { medicines, investigations, diagnoses, comments } = req.body;

  const prescription = await prisma.prescription.findUnique({ where: { id } });
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });

  const data = { status: "COMPLETE" };
  if (medicines !== undefined) data.medicines = medicines;
  if (investigations !== undefined) data.investigations = investigations;
  if (diagnoses !== undefined) data.diagnoses = diagnoses;
  if (comments !== undefined) data.comments = comments || null;

  const updated = await prisma.prescription.update({
    where: { id },
    data,
    include: { patient: true, doctor: true, opdVisit: true, labInvoice: true },
  });

  res.json(updated);
});

router.get("/patient/:patientId", async (req, res) => {
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId: Number(req.params.patientId) },
    orderBy: { createdAt: "desc" },
    include: { doctor: true },
  });

  res.json(
    prescriptions.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      status: p.status,
      doctorName: p.doctor.name,
      medicineNames: (p.medicines || []).map((m) => m.name),
    }))
  );
});

router.get("/:id", async (req, res) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id: Number(req.params.id) },
    include: { patient: true, doctor: true, opdVisit: true, labInvoice: true },
  });
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });
  res.json(prescription);
});

module.exports = router;
