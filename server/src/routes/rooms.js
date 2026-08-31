const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

router.get("/", async (req, res) => {
  const rooms = await prisma.room.findMany({
    orderBy: { roomNumber: "asc" },
    include: { beds: { orderBy: { bedNumber: "asc" } } },
  });
  res.json(rooms);
});

module.exports = router;
