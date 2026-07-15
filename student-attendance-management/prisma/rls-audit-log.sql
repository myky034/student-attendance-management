-- AuditLog: cho phép INSERT từ browser client; SELECT mở cho dev.
-- Lọc theo role (admin/supervisor/teacher) thực hiện ở application layer.
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

-- Production: thay SELECT/DELETE bằng policy theo JWT claims hoặc service role.
-- Giữ INSERT cho authenticated app users; không expose DELETE ngoài admin flow.
