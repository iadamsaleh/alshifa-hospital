const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");
const { startOfToday } = require("../utils/dateRange");

const router = express.Router();

router.get("/summary", requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.pharmacyItem.findMany();
  const totalInventoryValue = items.reduce((sum, i) => sum + i.stockQuantity * i.pricePerUnit, 0);
  const lowStockCount = items.filter((i) => i.stockQuantity < 10).length;

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoonCount = items.filter(
    (i) => i.expiryDate && i.expiryDate > now && i.expiryDate <= in30Days
  ).length;
  const expiredCount = items.filter((i) => i.expiryDate && i.expiryDate <= now).length;

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [todayInvoices, monthInvoices] = await Promise.all([
    prisma.pharmacyInvoice.findMany({ where: { createdAt: { gte: startOfToday() } }, select: { items: true } }),
    prisma.pharmacyInvoice.findMany({ where: { createdAt: { gte: startMonth } }, select: { items: true } }),
  ]);

  const sumQty = (invoices) =>
    invoices.reduce((sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity, 0), 0);

  res.json({
    totalInventoryValue,
    lowStockCount,
    expiringSoonCount,
    expiredCount,
    itemsSoldToday: sumQty(todayInvoices),
    itemsSoldThisMonth: sumQty(monthInvoices),
  });
});

module.exports = router;
