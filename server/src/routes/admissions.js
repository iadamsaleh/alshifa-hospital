const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const HttpError = require("../utils/httpError");

const router = express.Router();

function formatToken(n) {
  return `T-${String(n).padStart(3, "0")}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function generateTokenNumber(tx) {
  const last = await tx.admission.findFirst({
    where: { admissionDate: { gte: startOfToday() } },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber || 0) + 1;
}

router.post("/", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const { patientId, doctorId, roomId, bedId } = req.body;
  if (!patientId || !doctorId) {
    return res.status(400).json({ error: "patientId and doctorId are required" });
  }

  try {
    const admission = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } });
      if (!patient) throw new HttpError(404, "Patient not found");

      const doctor = await tx.doctor.findUnique({ where: { id: Number(doctorId) } });
      if (!doctor) throw new HttpError(404, "Doctor not found");

      let bed = null;
      if (bedId) {
        bed = await tx.bed.findUnique({ where: { id: Number(bedId) } });
        if (!bed) throw new HttpError(404, "Bed not found");
        if (bed.isOccupied) throw new HttpError(409, "Selected bed is already occupied");
        if (roomId && bed.roomId !== Number(roomId)) {
          throw new HttpError(400, "Bed does not belong to the selected room");
        }
      }

      const tokenNumber = await generateTokenNumber(tx);

      const created = await tx.admission.create({
        data: {
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          roomId: bed ? bed.roomId : roomId ? Number(roomId) : null,
          bedId: bed ? bed.id : null,
          tokenNumber,
        },
        include: { patient: true, doctor: true, room: true, bed: true },
      });

      if (bed) {
        await tx.bed.update({ where: { id: bed.id }, data: { isOccupied: true } });
        await tx.room.update({ where: { id: bed.roomId }, data: { availableBeds: { decrement: 1 } } });
      }

      return created;
    });

    res.status(201).json({ ...admission, tokenLabel: formatToken(admission.tokenNumber) });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/active", async (req, res) => {
  const admissions = await prisma.admission.findMany({
    where: { status: "ADMITTED" },
    orderBy: { admissionDate: "desc" },
    include: { patient: true, doctor: true, room: true, bed: true },
  });
  res.json(admissions.map((a) => ({ ...a, tokenLabel: formatToken(a.tokenNumber) })));
});

router.get("/:id/discharge-summary", async (req, res) => {
  const admission = await prisma.admission.findUnique({
    where: { id: Number(req.params.id) },
    include: { patient: true, doctor: true, room: true, bed: true },
  });
  if (!admission) return res.status(404).json({ error: "Admission not found" });
  if (admission.status === "DISCHARGED") {
    return res.status(400).json({ error: "Admission already discharged" });
  }

  const roomRate = admission.room
    ? await prisma.roomRate.findUnique({ where: { roomType: admission.room.type } })
    : null;

  const daysAdmitted = Math.max(
    1,
    Math.ceil((Date.now() - admission.admissionDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const [labInvoices, pharmacyInvoices] = await Promise.all([
    prisma.labInvoice.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } }),
    prisma.pharmacyInvoice.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } }),
  ]);

  res.json({
    admission,
    daysAdmitted,
    roomDailyRate: roomRate?.dailyRate || 0,
    labInvoices,
    pharmacyInvoices,
  });
});

router.get("/:id/discharge-record", async (req, res) => {
  const record = await prisma.dischargeRecord.findUnique({
    where: { admissionId: Number(req.params.id) },
    include: {
      patient: true,
      admission: { include: { doctor: true, room: true, bed: true } },
    },
  });
  if (!record) return res.status(404).json({ error: "Discharge record not found" });

  const [labInvoices, pharmacyInvoices] = await Promise.all([
    prisma.labInvoice.findMany({ where: { id: { in: record.labInvoiceIds } } }),
    prisma.pharmacyInvoice.findMany({ where: { id: { in: record.pharmacyInvoiceIds } } }),
  ]);

  res.json({ ...record, labInvoices, pharmacyInvoices });
});

router.patch("/:id/discharge-record/pay", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const admissionId = Number(req.params.id);
  const record = await prisma.dischargeRecord.findUnique({ where: { admissionId } });
  if (!record) return res.status(404).json({ error: "Discharge record not found" });
  if (record.isPaid) return res.status(400).json({ error: "Already marked paid" });

  const updated = await prisma.dischargeRecord.update({ where: { admissionId }, data: { isPaid: true } });
  res.json(updated);
});

router.post("/:id/discharge", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const {
    dischargeDate,
    daysAdmitted,
    roomCharges,
    doctorFee,
    procedureCharges,
    nursingCharges,
    customCharges,
    includedLabInvoiceIds,
    includedPharmacyInvoiceIds,
    notes,
  } = req.body;

  try {
    const record = await prisma.$transaction(async (tx) => {
      const admission = await tx.admission.findUnique({ where: { id: Number(req.params.id) } });
      if (!admission) throw new HttpError(404, "Admission not found");
      if (admission.status === "DISCHARGED") throw new HttpError(400, "Admission already discharged");

      const labInvoiceIds = Array.isArray(includedLabInvoiceIds) ? includedLabInvoiceIds.map(Number) : [];
      const pharmacyInvoiceIds = Array.isArray(includedPharmacyInvoiceIds)
        ? includedPharmacyInvoiceIds.map(Number)
        : [];

      const [labInvoices, pharmacyInvoices] = await Promise.all([
        labInvoiceIds.length
          ? tx.labInvoice.findMany({ where: { id: { in: labInvoiceIds }, patientId: admission.patientId } })
          : [],
        pharmacyInvoiceIds.length
          ? tx.pharmacyInvoice.findMany({ where: { id: { in: pharmacyInvoiceIds }, patientId: admission.patientId } })
          : [],
      ]);

      const labCharges = labInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const pharmacyCharges = pharmacyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      const safeProcedureCharges = Array.isArray(procedureCharges) ? procedureCharges : [];
      const safeNursingCharges = Array.isArray(nursingCharges) ? nursingCharges : [];
      const safeCustomCharges = Array.isArray(customCharges) ? customCharges : [];
      const procedureChargesTotal = safeProcedureCharges.reduce((sum, p) => sum + Number(p.subtotal || 0), 0);
      const nursingChargesTotal = safeNursingCharges.reduce((sum, n) => sum + Number(n.subtotal || 0), 0);
      const customChargesTotal = safeCustomCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const finalRoomCharges = Number(roomCharges) || 0;
      const finalDoctorFee = Number(doctorFee) || 0;
      const finalDaysAdmitted = Number(daysAdmitted) || 1;
      const finalDischargeDate = dischargeDate ? new Date(dischargeDate) : new Date();

      const totalBill =
        finalRoomCharges +
        finalDoctorFee +
        procedureChargesTotal +
        nursingChargesTotal +
        customChargesTotal +
        labCharges +
        pharmacyCharges;

      const dischargeRecord = await tx.dischargeRecord.create({
        data: {
          admissionId: admission.id,
          patientId: admission.patientId,
          dischargeDate: finalDischargeDate,
          daysAdmitted: finalDaysAdmitted,
          roomCharges: finalRoomCharges,
          procedureCharges: safeProcedureCharges,
          nursingCharges: safeNursingCharges,
          labCharges,
          labInvoiceIds: labInvoices.map((i) => i.id),
          pharmacyCharges,
          pharmacyInvoiceIds: pharmacyInvoices.map((i) => i.id),
          doctorFee: finalDoctorFee,
          customCharges: safeCustomCharges,
          totalBill,
          notes: notes || null,
        },
      });

      await tx.admission.update({
        where: { id: admission.id },
        data: { status: "DISCHARGED", dischargeDate: finalDischargeDate, totalBill },
      });

      if (admission.bedId) {
        await tx.bed.update({ where: { id: admission.bedId }, data: { isOccupied: false } });
      }
      if (admission.roomId) {
        await tx.room.update({ where: { id: admission.roomId }, data: { availableBeds: { increment: 1 } } });
      }

      return dischargeRecord;
    });

    res.status(201).json(record);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

module.exports = router;
