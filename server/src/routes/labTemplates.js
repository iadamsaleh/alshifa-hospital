const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

router.get("/", async (req, res) => {
  const templates = await prisma.labTestTemplate.findMany({ orderBy: { testName: "asc" } });
  res.json(templates);
});

module.exports = router;
