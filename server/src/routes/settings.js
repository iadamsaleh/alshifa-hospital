const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/room-rates", requireRole("ADMIN"), async (req, res) => {
  const rates = await prisma.roomRate.findMany({ orderBy: { roomType: "asc" } });
  res.json(rates);
});

router.patch("/room-rates", requireRole("ADMIN"), async (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : [req.body];

  for (const { roomType, dailyRate } of updates) {
    if (!roomType || typeof dailyRate !== "number" || dailyRate < 0) {
      return res.status(400).json({ error: "Each update requires a roomType and a non-negative dailyRate" });
    }
  }

  const rates = await prisma.$transaction(
    updates.map(({ roomType, dailyRate }) =>
      prisma.roomRate.upsert({
        where: { roomType },
        update: { dailyRate },
        create: { roomType, dailyRate },
      })
    )
  );

  res.json(rates);
});

module.exports = router;
