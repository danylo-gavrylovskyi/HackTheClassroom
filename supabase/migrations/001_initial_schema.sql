-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  questions_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  transcript_text TEXT,
  scores_json JSONB,
  summary_text TEXT,
  total_score INTEGER,
  max_score INTEGER,
  callback_secret TEXT
);

-- RLS policies
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own data
CREATE POLICY "Teachers see own data" ON teachers
  FOR ALL USING (auth.uid() = id);

-- Teachers can only manage their own exams
CREATE POLICY "Teachers manage own exams" ON exams
  FOR ALL USING (teacher_id = auth.uid());

-- Teachers see sessions for their exams
CREATE POLICY "Teachers see own exam sessions" ON exam_sessions
  FOR SELECT USING (
    exam_id IN (SELECT id FROM exams WHERE teacher_id = auth.uid())
  );

-- Service role can insert/update sessions (for agent callbacks and start-session)
CREATE POLICY "Service role manages sessions" ON exam_sessions
  FOR ALL USING (auth.role() = 'service_role');
