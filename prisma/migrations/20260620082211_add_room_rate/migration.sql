-- CreateTable
CREATE TABLE "RoomRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomType" TEXT NOT NULL,
    "dailyRate" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomRate_roomType_key" ON "RoomRate"("roomType");
