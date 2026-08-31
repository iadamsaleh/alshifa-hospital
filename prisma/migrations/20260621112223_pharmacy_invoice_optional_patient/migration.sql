-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PharmacyInvoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER,
    "admissionId" INTEGER,
    "items" JSONB NOT NULL,
    "totalAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyInvoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PharmacyInvoice_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PharmacyInvoice" ("admissionId", "createdAt", "id", "items", "patientId", "totalAmount") SELECT "admissionId", "createdAt", "id", "items", "patientId", "totalAmount" FROM "PharmacyInvoice";
DROP TABLE "PharmacyInvoice";
ALTER TABLE "new_PharmacyInvoice" RENAME TO "PharmacyInvoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
