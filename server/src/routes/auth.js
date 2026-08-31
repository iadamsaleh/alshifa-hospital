const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  let doctorId = null;
  if (user.role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    doctorId = doctor?.id ?? null;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, doctorId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, doctorId },
  });
});

router.post("/logout", authenticate, (req, res) => {
  // JWTs are stateless and held in memory on the client, so there is no
  // server-side session to invalidate — this just confirms the token was valid.
  res.json({ success: true });
});

module.exports = router;
