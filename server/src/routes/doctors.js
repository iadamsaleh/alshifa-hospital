const express = require("express");
const prisma = require("../prismaClient");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const status = req.query.status || "active";
  const where = status === "all" ? {} : { isActive: status !== "inactive" };
  const doctors = await prisma.doctor.findMany({ where, orderBy: { name: "asc" } });
  res.json(doctors);
});

router.get("/:id/schedule", async (req, res) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, name: true, schedule: true, title: true },
  });
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json(doctor);
});

router.get("/:id", async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: Number(req.params.id) } });
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json(doctor);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, specialization, phone, email, consultationFee, title } = req.body;
  if (!name || !specialization || !phone || !email || consultationFee == null) {
    return res
      .status(400)
      .json({ error: "name, specialization, phone, email and consultationFee are required" });
  }

  try {
    const doctor = await prisma.doctor.create({
      data: { name, specialization, phone, email, consultationFee: Number(consultationFee), title: title || null },
    });
    res.status(201).json(doctor);
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A doctor with this email already exists" });
    throw err;
  }
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, specialization, phone, email, consultationFee, isActive, schedule, title } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (specialization !== undefined) data.specialization = specialization;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (consultationFee !== undefined) data.consultationFee = Number(consultationFee);
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (schedule !== undefined) data.schedule = schedule;
  if (title !== undefined) data.title = title || null;

  try {
    const doctor = await prisma.doctor.update({ where: { id: Number(req.params.id) }, data });
    res.json(doctor);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Doctor not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "A doctor with this email already exists" });
    throw err;
  }
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = Number(req.params.id);

  const admissionCount = await prisma.admission.count({ where: { doctorId: id } });
  if (admissionCount > 0) {
    return res
      .status(409)
      .json({ error: "Doctor has admission history and cannot be deleted — deactivate instead" });
  }

  try {
    await prisma.doctor.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Doctor not found" });
    throw err;
  }
});

module.exports = router;
