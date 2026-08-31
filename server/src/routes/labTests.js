const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const tests = await prisma.labTest.findMany({
    orderBy: [{ category: "asc" }, { testName: "asc" }],
  });
  res.json(tests);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { testName, testCode, price, category, description } = req.body;
  if (!testName || !testCode || price == null) {
    return res.status(400).json({ error: "testName, testCode and price are required" });
  }

  try {
    const test = await prisma.labTest.create({
      data: { testName, testCode, price: Number(price), category: category || null, description: description || null },
    });
    res.status(201).json(test);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A test with this code already exists" });
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { testName, testCode, price, category, description } = req.body;
  const data = {};
  if (testName !== undefined) data.testName = testName;
  if (testCode !== undefined) data.testCode = testCode;
  if (price !== undefined) data.price = Number(price);
  if (category !== undefined) data.category = category || null;
  if (description !== undefined) data.description = description || null;

  try {
    const test = await prisma.labTest.update({ where: { id: Number(req.params.id) }, data });
    res.json(test);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Test not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "A test with this code already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await prisma.labTest.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Test not found" });
    throw err;
  }
});

module.exports = router;
