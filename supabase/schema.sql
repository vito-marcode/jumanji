-- ============================================================
-- JUMANJI — Supabase Schema
-- Run this in your Supabase project SQL editor
-- ============================================================

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       CHAR(6)     NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX sessions_code_idx ON sessions (code);

CREATE TABLE collections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX collections_session_idx ON collections (session_id);

CREATE TABLE options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID    NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  text          TEXT    NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX options_collection_idx ON options (collection_id, position);

CREATE TABLE display_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX display_messages_session_idx ON display_messages (session_id, sent_at DESC);

-- ============================================================
-- ROW-LEVEL SECURITY
-- Open policies — the 6-char session code acts as shared secret
-- ============================================================
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE options          ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_all"         ON sessions         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "collections_all"      ON collections      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "options_all"          ON options          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "display_messages_all" ON display_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME
-- Enable real-time on relevant tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE display_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE options;
