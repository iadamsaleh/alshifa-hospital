/*
  Warnings:

  - Added the required column `nursingCharges` to the `DischargeRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PharmacyItem" ADD COLUMN "defaultDose" TEXT;
ALTER TABLE "PharmacyItem" ADD COLUMN "defaultDuration" TEXT;
ALTER TABLE "PharmacyItem" ADD COLUMN "defaultDurationUnit" TEXT;
ALTER TABLE "PharmacyItem" ADD COLUMN "defaultFrequency" TEXT;
ALTER TABLE "PharmacyItem" ADD COLUMN "defaultInstructions" TEXT;

-- AlterTable
ALTER TABLE "PrescriptionMedicine" ADD COLUMN "defaultDose" TEXT;
ALTER TABLE "PrescriptionMedicine" ADD COLUMN "defaultDuration" TEXT;
ALTER TABLE "PrescriptionMedicine" ADD COLUMN "defaultDurationUnit" TEXT;
ALTER TABLE "PrescriptionMedicine" ADD COLUMN "defaultFrequency" TEXT;
ALTER TABLE "PrescriptionMedicine" ADD COLUMN "defaultInstructions" TEXT;

-- CreateTable
CREATE TABLE "NursingCharge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "defaultPrice" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

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
INSERT INTO "new_DischargeRecord" ("admissionId", "createdAt", "customCharges", "daysAdmitted", "dischargeDate", "doctorFee", "id", "isPaid", "labCharges", "notes", "patientId", "pharmacyCharges", "procedureCharges", "roomCharges", "totalBill") SELECT "admissionId", "createdAt", "customCharges", "daysAdmitted", "dischargeDate", "doctorFee", "id", "isPaid", "labCharges", "notes", "patientId", "pharmacyCharges", "procedureCharges", "roomCharges", "totalBill" FROM "DischargeRecord";
DROP TABLE "DischargeRecord";
ALTER TABLE "new_DischargeRecord" RENAME TO "DischargeRecord";
CREATE UNIQUE INDEX "DischargeRecord_admissionId_key" ON "DischargeRecord"("admissionId");
CREATE TABLE "new_PharmacyInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER,
    "admissionId" INTEGER,
    "items" JSONB NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PharmacyInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PharmacyInvoice" ("admissionId", "createdAt", "id", "items", "patientId", "totalAmount") SELECT "admissionId", "createdAt", "id", "items", "patientId", "totalAmount" FROM "PharmacyInvoice";
DROP TABLE "PharmacyInvoice";
ALTER TABLE "new_PharmacyInvoice" RENAME TO "PharmacyInvoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NursingCharge_name_key" ON "NursingCharge"("name");
