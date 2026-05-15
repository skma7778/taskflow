-- ============================================================
-- TaskFlow – Complete Database Setup (UPDATED)
-- Copy this entire file and paste into:
-- Supabase → SQL Editor → Run
-- ============================================================


-- ── 1. USERS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin','manager','employee')) DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles"   ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile"  ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.users;

CREATE POLICY "Users can read all profiles"  ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);


-- ── 2. TASKS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.users(id),
  assigned_by UUID REFERENCES public.users(id),
  status      TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed')) DEFAULT 'pending',
  deadline    DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read tasks"    ON public.tasks;
DROP POLICY IF EXISTS "Managers and admins can insert tasks"  ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks"  ON public.tasks;
DROP POLICY IF EXISTS "Managers and admins can delete tasks"  ON public.tasks;

CREATE POLICY "Authenticated users can read tasks"   ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can delete tasks" ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');


-- ── 3. DIRECT CHAT TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can send messages"        ON public.chat;

CREATE POLICY "Users can read their own chats" ON public.chat FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages"        ON public.chat FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- ── 4. GROUP CHAT TABLE (NEW) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.group_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read group chat"     ON public.group_chat;
DROP POLICY IF EXISTS "Authenticated users can send group messages" ON public.group_chat;

CREATE POLICY "Authenticated users can read group chat"     ON public.group_chat FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can send group messages" ON public.group_chat FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- ── 5. NOTIFICATIONS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications"     ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications"   ON public.notifications;

CREATE POLICY "Users can read own notifications"      ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own notifications"    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);


-- ── 6. FILES TABLE (FIXED RLS) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read files"   ON public.files;
DROP POLICY IF EXISTS "Authenticated users can insert files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files"     ON public.files;

CREATE POLICY "Authenticated users can read files"   ON public.files FOR SELECT USING (auth.role() = 'authenticated');

-- FIXED: Allow authenticated users to insert files (no status restriction)
CREATE POLICY "Authenticated users can insert files" ON public.files FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- FIXED: Allow users to delete their own files
CREATE POLICY "Users can delete their own files"     ON public.files FOR DELETE USING (auth.uid() = uploaded_by);


-- ── 7. ENABLE REALTIME ──────────────────────────────────────
-- Enables real-time updates for chat, group chat, and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================================
-- DONE! All tables and policies created.
-- 
-- Next step (do manually in Supabase dashboard):
--   Storage → New Bucket → name: task-files → set Public
--
-- IMPORTANT: 
-- - Employees can now upload files to completed tasks
-- - Files can be deleted by the user who uploaded them
-- ============================================================
