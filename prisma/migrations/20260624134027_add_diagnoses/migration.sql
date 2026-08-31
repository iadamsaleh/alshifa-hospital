-- CreateTable
CREATE TABLE "CommonDiagnosis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prescription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "opdVisitId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "medicines" JSONB NOT NULL,
    "investigations" JSONB NOT NULL,
    "advisedInvestigations" JSONB NOT NULL DEFAULT [],
    "diagnoses" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'COMPLETE',
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_opdVisitId_fkey" FOREIGN KEY ("opdVisitId") REFERENCES "OpdVisit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("advisedInvestigations", "comments", "createdAt", "doctorId", "id", "investigations", "medicines", "opdVisitId", "patientId", "status") SELECT "advisedInvestigations", "comments", "createdAt", "doctorId", "id", "investigations", "medicines", "opdVisitId", "patientId", "status" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CommonDiagnosis_name_key" ON "CommonDiagnosis"("name");
