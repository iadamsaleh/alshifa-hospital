-- CreateTable
CREATE TABLE "LabTestTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testName" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "parameters" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "labInvoiceId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "technicianId" INTEGER,
    "results" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabResult_labInvoiceId_fkey" FOREIGN KEY ("labInvoiceId") REFERENCES "LabInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LabTestTemplate_testCode_key" ON "LabTestTemplate"("testCode");

-- CreateIndex
CREATE UNIQUE INDEX "LabResult_labInvoiceId_key" ON "LabResult"("labInvoiceId");
