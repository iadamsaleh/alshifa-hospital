const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const authRouter = require("./routes/auth");
const patientsRouter = require("./routes/patients");
const admissionsRouter = require("./routes/admissions");
const opdRouter = require("./routes/opd");
const doctorsRouter = require("./routes/doctors");
const roomsRouter = require("./routes/rooms");
const labTestsRouter = require("./routes/labTests");
const labInvoicesRouter = require("./routes/labInvoices");
const labTemplatesRouter = require("./routes/labTemplates");
const labResultsRouter = require("./routes/labResults");
const prescriptionsRouter = require("./routes/prescriptions");
const pharmacyItemsRouter = require("./routes/pharmacyItems");
const pharmacyInvoicesRouter = require("./routes/pharmacyInvoices");
const pharmacyReportsRouter = require("./routes/pharmacyReports");
const proceduresRouter = require("./routes/procedures");
const nursingChargesRouter = require("./routes/nursingCharges");
const settingsRouter = require("./routes/settings");
const dashboardRouter = require("./routes/dashboard");
const reportsRouter = require("./routes/reports");
const diagnosesRouter = require("./routes/diagnoses");
const { authenticate } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Al-Shifa Diagnostic Centre API" });
});

app.use("/api/auth", authRouter);

// Everything below this line requires a valid JWT.
app.use("/api", authenticate);

app.use("/api/patients", patientsRouter);
app.use("/api/admissions", admissionsRouter);
app.use("/api/opd", opdRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/lab/tests", labTestsRouter);
app.use("/api/lab/invoices", labInvoicesRouter);
app.use("/api/lab/templates", labTemplatesRouter);
app.use("/api/lab/results", labResultsRouter);
app.use("/api/prescription", prescriptionsRouter);
app.use("/api/pharmacy/items", pharmacyItemsRouter);
app.use("/api/pharmacy/invoices", pharmacyInvoicesRouter);
app.use("/api/pharmacy/reports", pharmacyReportsRouter);
app.use("/api/procedures", proceduresRouter);
app.use("/api/nursing-charges", nursingChargesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/diagnoses", diagnosesRouter);

// Express 4 does not forward rejected promises from async route handlers to
// error middleware (unlike Express 5), so an uncaught Prisma error in any
// route would otherwise crash the whole process. Routes should still catch
// and handle expected errors themselves — this is just the safety net.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

function startServer() {
  return app.listen(PORT, () => {
    console.log(`Al-Shifa API server running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
