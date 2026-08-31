-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "admissionId" INTEGER,
    "prescriptionId" INTEGER,
    "tests" JSONB NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabInvoice_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabInvoice" ("admissionId", "createdAt", "id", "patientId", "status", "tests", "totalAmount") SELECT "admissionId", "createdAt", "id", "patientId", "status", "tests", "totalAmount" FROM "LabInvoice";
DROP TABLE "LabInvoice";
ALTER TABLE "new_LabInvoice" RENAME TO "LabInvoice";
CREATE UNIQUE INDEX "LabInvoice_prescriptionId_key" ON "LabInvoice"("prescriptionId");
CREATE TABLE "new_Prescription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "opdVisitId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "medicines" JSONB NOT NULL,
    "investigations" JSONB NOT NULL,
    "advisedInvestigations" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'COMPLETE',
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_opdVisitId_fkey" FOREIGN KEY ("opdVisitId") REFERENCES "OpdVisit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("comments", "createdAt", "doctorId", "id", "investigations", "medicines", "opdVisitId", "patientId") SELECT "comments", "createdAt", "doctorId", "id", "investigations", "medicines", "opdVisitId", "patientId" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
