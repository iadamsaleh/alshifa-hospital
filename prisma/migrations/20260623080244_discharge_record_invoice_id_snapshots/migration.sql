/*
  Warnings:

  - Added the required column `labInvoiceIds` to the `DischargeRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pharmacyInvoiceIds` to the `DischargeRecord` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DischargeRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admissionId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "dischargeDate" DATETIME NOT NULL,
    "daysAdmitted" INTEGER NOT NULL,
    "roomCharges" REAL NOT NULL,
    "procedureCharges" JSONB NOT NULL,
    "nursingCharges" JSONB NOT NULL,
    "labCharges" REAL NOT NULL,
    "labInvoiceIds" JSONB NOT NULL,
    "pharmacyCharges" REAL NOT NULL,
    "pharmacyInvoiceIds" JSONB NOT NULL,
    "doctorFee" REAL NOT NULL,
    "customCharges" JSONB NOT NULL,
    "totalBill" REAL NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DischargeRecord_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DischargeRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DischargeRecord" ("admissionId", "createdAt", "customCharges", "daysAdmitted", "dischargeDate", "doctorFee", "id", "isPaid", "labCharges", "notes", "nursingCharges", "patientId", "pharmacyCharges", "procedureCharges", "roomCharges", "totalBill") SELECT "admissionId", "createdAt", "customCharges", "daysAdmitted", "dischargeDate", "doctorFee", "id", "isPaid", "labCharges", "notes", "nursingCharges", "patientId", "pharmacyCharges", "procedureCharges", "roomCharges", "totalBill" FROM "DischargeRecord";
DROP TABLE "DischargeRecord";
ALTER TABLE "new_DischargeRecord" RENAME TO "DischargeRecord";
CREATE UNIQUE INDEX "DischargeRecord_admissionId_key" ON "DischargeRecord"("admissionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
