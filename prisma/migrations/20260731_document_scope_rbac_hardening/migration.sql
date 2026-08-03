ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS "schoolId" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleId" TEXT,
  ADD COLUMN IF NOT EXISTS "studentId" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Document_schoolId_idx" ON "Document"("schoolId");
CREATE INDEX IF NOT EXISTS "Document_vehicleId_idx" ON "Document"("vehicleId");
CREATE INDEX IF NOT EXISTS "Document_studentId_idx" ON "Document"("studentId");
CREATE INDEX IF NOT EXISTS "Document_ownerUserId_idx" ON "Document"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Document_isDeleted_schoolId_idx" ON "Document"("isDeleted", "schoolId");
CREATE INDEX IF NOT EXISTS "Document_isDeleted_vehicleId_idx" ON "Document"("isDeleted", "vehicleId");
CREATE INDEX IF NOT EXISTS "Document_isDeleted_studentId_idx" ON "Document"("isDeleted", "studentId");
CREATE INDEX IF NOT EXISTS "Document_isDeleted_ownerUserId_idx" ON "Document"("isDeleted", "ownerUserId");
