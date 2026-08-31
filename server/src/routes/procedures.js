const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const where = req.query.active === "true" ? { isActive: true } : {};
  const procedures = await prisma.procedure.findMany({ where, orderBy: { name: "asc" } });
  res.json(procedures);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, category, defaultPrice, description } = req.body;
  if (!name || defaultPrice == null) {
    return res.status(400).json({ error: "name and defaultPrice are required" });
  }

  try {
    const procedure = await prisma.procedure.create({
      data: { name, category: category || null, defaultPrice: Number(defaultPrice), description: description || null },
    });
    res.status(201).json(procedure);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A procedure with this name already exists" });
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, category, defaultPrice, description, isActive } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category || null;
  if (defaultPrice !== undefined) data.defaultPrice = Number(defaultPrice);
  if (description !== undefined) data.description = description || null;
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  try {
    const procedure = await prisma.procedure.update({ where: { id: Number(req.params.id) }, data });
    res.json(procedure);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Procedure not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "A procedure with this name already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const procedure = await prisma.procedure.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    });
    res.json(procedure);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Procedure not found" });
    throw err;
  }
});

module.exports = router;
