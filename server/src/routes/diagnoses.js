const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const all = await prisma.commonDiagnosis.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });

  const grouped = {};
  for (const d of all) {
    if (!grouped[d.category]) grouped[d.category] = [];
    grouped[d.category].push(d);
  }

  res.json({ diagnoses: all, grouped });
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });

  try {
    const created = await prisma.commonDiagnosis.create({ data: { name: name.trim(), category: category.trim() } });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Diagnosis already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.commonDiagnosis.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Diagnosis not found" });
    throw err;
  }
});

module.exports = router;
