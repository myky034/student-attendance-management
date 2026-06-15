-- Allow browser Supabase client (anon/authenticated) to read reference data.
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Semester" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_allow_select_academic_year" ON "AcademicYear";
CREATE POLICY "dev_allow_select_academic_year" ON "AcademicYear"
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "dev_allow_select_semester" ON "Semester";
CREATE POLICY "dev_allow_select_semester" ON "Semester"
  FOR SELECT
  TO anon, authenticated
  USING (true);
