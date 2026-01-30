-- CreateTable
CREATE TABLE "PilotResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usability" INTEGER NOT NULL,
    "usefulness" INTEGER NOT NULL,
    "satisfaction" INTEGER NOT NULL,
    "barriers" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotResponse_userId_key" ON "PilotResponse"("userId");

-- AddForeignKey
ALTER TABLE "PilotResponse" ADD CONSTRAINT "PilotResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
