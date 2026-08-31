-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consultationFee" REAL NOT NULL,
    "schedule" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Doctor" ("consultationFee", "email", "id", "isActive", "name", "phone", "schedule", "specialization") SELECT "consultationFee", "email", "id", "isActive", "name", "phone", "schedule", "specialization" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
