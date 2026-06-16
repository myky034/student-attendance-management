-- Allow browser Supabase client (anon/authenticated) to manage reference data.
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Semester" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_allow_select_academic_year" ON "AcademicYear";
CREATE POLICY "dev_allow_select_academic_year" ON "AcademicYear"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_allow_insert_academic_year" ON "AcademicYear";
CREATE POLICY "dev_allow_insert_academic_year" ON "AcademicYear"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_update_academic_year" ON "AcademicYear";
CREATE POLICY "dev_allow_update_academic_year" ON "AcademicYear"
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_delete_academic_year" ON "AcademicYear";
CREATE POLICY "dev_allow_delete_academic_year" ON "AcademicYear"
  FOR DELETE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_allow_select_semester" ON "Semester";
CREATE POLICY "dev_allow_select_semester" ON "Semester"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_allow_insert_semester" ON "Semester";
CREATE POLICY "dev_allow_insert_semester" ON "Semester"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_update_semester" ON "Semester";
CREATE POLICY "dev_allow_update_semester" ON "Semester"
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "dev_allow_delete_semester" ON "Semester";
CREATE POLICY "dev_allow_delete_semester" ON "Semester"
  FOR DELETE
  TO anon, authenticated
  USING (true);
