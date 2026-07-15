-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT', 'CANCEL', 'LOCK', 'ACTIVATE');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('User', 'AttendanceRecord', 'LeaveRequest', 'AcademicYear', 'Semester', 'AttendancePeriodConfig', 'Grade', 'Class');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" TEXT,
    "classId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_classId_idx" ON "AuditLog"("classId");

-- RenameForeignKey
ALTER TABLE "LeaveRequest" RENAME CONSTRAINT "LeaveRequest_student_id_fkey" TO "Leave_Request_student_id_fkey";

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: browser client dùng anon key — cần policy INSERT/SELECT hoặc mọi ghi audit sẽ fail 42501
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_allow_insert_audit_log" ON "AuditLog";
CREATE POLICY "dev_allow_insert_audit_log" ON "AuditLog"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_select_audit_log" ON "AuditLog";
CREATE POLICY "dev_allow_select_audit_log" ON "AuditLog"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_allow_delete_audit_log" ON "AuditLog";
CREATE POLICY "dev_allow_delete_audit_log" ON "AuditLog"
  FOR DELETE
  TO anon, authenticated
  USING (true);
