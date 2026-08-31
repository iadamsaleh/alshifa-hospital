const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

const LOW_STOCK_THRESHOLD = 10;

router.get("/low-stock", async (req, res) => {
  const items = await prisma.pharmacyItem.findMany({
    where: { stockQuantity: { lt: LOW_STOCK_THRESHOLD } },
    orderBy: { stockQuantity: "asc" },
  });
  res.json(items);
});

router.get("/", async (req, res) => {
  const search = (req.query.search || "").trim();
  const where = search
    ? { OR: [{ name: { contains: search } }, { category: { contains: search } }] }
    : {};

  const items = await prisma.pharmacyItem.findMany({ where, orderBy: { name: "asc" } });
  res.json(items);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, category, unit, pricePerUnit, stockQuantity, expiryDate, supplier } = req.body;
  if (!name || !unit || pricePerUnit == null) {
    return res.status(400).json({ error: "name, unit and pricePerUnit are required" });
  }

  try {
    const item = await prisma.pharmacyItem.create({
      data: {
        name,
        category: category || null,
        unit,
        pricePerUnit: Number(pricePerUnit),
        stockQuantity: stockQuantity != null ? Number(stockQuantity) : 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplier: supplier || null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "An item with this name already exists" });
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, category, unit, pricePerUnit, stockQuantity, expiryDate, supplier } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category || null;
  if (unit !== undefined) data.unit = unit;
  if (pricePerUnit !== undefined) data.pricePerUnit = Number(pricePerUnit);
  if (stockQuantity !== undefined) data.stockQuantity = Number(stockQuantity);
  if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (supplier !== undefined) data.supplier = supplier || null;

  try {
    const item = await prisma.pharmacyItem.update({ where: { id: Number(req.params.id) }, data });
    res.json(item);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Item not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "An item with this name already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.pharmacyItem.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Item not found" });
    throw err;
  }
});

module.exports = router;
