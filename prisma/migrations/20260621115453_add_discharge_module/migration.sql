-- CreateTable
CREATE TABLE "Procedure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "defaultPrice" REAL NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "DischargeRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admissionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "dischargeDate" DATETIME NOT NULL,
    "daysAdmitted" INTEGER NOT NULL,
    "roomCharges" REAL NOT NULL,
    "procedureCharges" JSONB NOT NULL,
    "labCharges" REAL NOT NULL,
    "pharmacyCharges" REAL NOT NULL,
    "doctorFee" REAL NOT NULL,
    "customCharges" JSONB NOT NULL,
    "totalBill" REAL NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DischargeRecord_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DischargeRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_name_key" ON "Procedure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeRecord_admissionId_key" ON "DischargeRecord"("admissionId");
