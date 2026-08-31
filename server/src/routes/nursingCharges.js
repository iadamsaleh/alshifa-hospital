const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const where = req.query.active === "true" ? { isActive: true } : {};
  const charges = await prisma.nursingCharge.findMany({ where, orderBy: { name: "asc" } });
  res.json(charges);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, type, defaultPrice } = req.body;
  if (!name || !type || defaultPrice == null) {
    return res.status(400).json({ error: "name, type and defaultPrice are required" });
  }

  try {
    const charge = await prisma.nursingCharge.create({
      data: { name, type, defaultPrice: Number(defaultPrice) },
    });
    res.status(201).json(charge);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A nursing charge with this name already exists" });
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, type, defaultPrice, isActive } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (type !== undefined) data.type = type;
  if (defaultPrice !== undefined) data.defaultPrice = Number(defaultPrice);
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  try {
    const charge = await prisma.nursingCharge.update({ where: { id: Number(req.params.id) }, data });
    res.json(charge);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Nursing charge not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "A nursing charge with this name already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const charge = await prisma.nursingCharge.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    });
    res.json(charge);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Nursing charge not found" });
    throw err;
  }
});

module.exports = router;
