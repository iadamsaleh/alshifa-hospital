const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const HttpError = require("../utils/httpError");
const { startOfDay, endOfDay } = require("../utils/dateRange");

const router = express.Router();

function formatInvoiceNumber(n) {
  return `PHARM-${String(n).padStart(4, "0")}`;
}

function withInvoiceNumber(invoice) {
  return { ...invoice, invoiceNumber: formatInvoiceNumber(invoice.id) };
}

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { patientId, admissionId, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      if (patientId) {
        const patient = await tx.patient.findUnique({ where: { id: Number(patientId) } });
        if (!patient) throw new HttpError(404, "Patient not found");
      }
      if (admissionId) {
        const admission = await tx.admission.findUnique({ where: { id: Number(admissionId) } });
        if (!admission) throw new HttpError(404, "Admission not found");
      }

      const itemIds = items.map((i) => Number(i.itemId));
      const catalogItems = await tx.pharmacyItem.findMany({ where: { id: { in: itemIds } } });
      const catalogById = new Map(catalogItems.map((i) => [i.id, i]));

      const snapshotItems = items.map((i) => {
        const catalogItem = catalogById.get(Number(i.itemId));
        if (!catalogItem) throw new HttpError(404, `Pharmacy item ${i.itemId} not found`);
        const quantity = Number(i.quantity);
        if (!quantity || quantity <= 0) throw new HttpError(400, `Invalid quantity for ${catalogItem.name}`);
        if (quantity > catalogItem.stockQuantity) {
          throw new HttpError(
            409,
            `Insufficient stock for ${catalogItem.name}: requested ${quantity}, available ${catalogItem.stockQuantity}`
          );
        }
        const price = i.price != null ? Number(i.price) : catalogItem.pricePerUnit;
        return { itemId: catalogItem.id, itemName: catalogItem.name, unit: catalogItem.unit, quantity, price };
      });

      const totalAmount = snapshotItems.reduce((sum, i) => sum + i.quantity * i.price, 0);

      const created = await tx.pharmacyInvoice.create({
        data: {
          patientId: patientId ? Number(patientId) : null,
          admissionId: admissionId ? Number(admissionId) : null,
          items: snapshotItems,
          totalAmount,
        },
        include: { patient: true, admission: true },
      });

      for (const item of snapshotItems) {
        await tx.pharmacyItem.update({
          where: { id: item.itemId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      return created;
    });

    res.status(201).json(withInvoiceNumber(invoice));
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/", async (req, res) => {
  const search = (req.query.search || "").trim();
  const dateFrom = req.query.dateFrom ? startOfDay(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? endOfDay(req.query.dateTo) : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const where = {
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
    prisma.pharmacyInvoice.count({ where }),
    prisma.pharmacyInvoice.findMany({
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
  const invoice = await prisma.pharmacyInvoice.findUnique({
    where: { id: Number(req.params.id) },
    include: { patient: true, admission: true },
  });
  if (!invoice) return res.status(404).json({ error: "Pharmacy invoice not found" });
  res.json(withInvoiceNumber(invoice));
});

router.patch("/:id/pay", requireRole("ADMIN", "RECEPTIONIST"), async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.pharmacyInvoice.findUnique({ where: { id } });
  if (!invoice) return res.status(404).json({ error: "Pharmacy invoice not found" });
  if (invoice.status === "PAID") return res.status(400).json({ error: "Invoice already marked paid" });

  const updated = await prisma.pharmacyInvoice.update({
    where: { id },
    data: { status: "PAID" },
    include: { patient: true, admission: true },
  });
  res.json(withInvoiceNumber(updated));
});

module.exports = router;
