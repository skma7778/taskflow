# TaskFlow – Setup Guide (Supabase + GitHub + Vercel)

## Files (13 total)

```
index.html          ← Login page
register.html       ← Registration page
dashboard.html      ← Role-based dashboard (Admin / Manager / Employee)
tasks.html          ← Task management (create, assign, update, upload files)
chat.html           ← Direct one-on-one chat (Supabase Realtime)
groupchat.html      ← Group chat — all team members (NEW)
notifications.html  ← Notification center with real-time updates
users.html          ← Admin-only user management
reports.html        ← CSV task report (Manager / Admin)
style.css           ← All UI styles
app.js              ← Shared helpers (auth, sidebar, notification popups, utils)
supabase.js         ← Supabase client
README.md           ← This file
```

---

## New Features Added

| Feature | Description |
|---------|-------------|
| **Employee Progress** | Manager/Admin dashboard shows each employee's task breakdown with color progress bars |
| **Group Chat** | `/groupchat.html` — all team members in one channel, real-time |
| **Notification Popups** | Floating popups appear instantly when a task is assigned or a message arrives |
| **Chat Bubble Fix** | Sender messages appear on the RIGHT, receiver messages on the LEFT |

---

## Step 1 — Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. Copy your **Project URL** and **anon public key** from Settings → API.
3. Open `supabase.js` and replace the values if needed.

---

## Step 2 — Run SQL in Supabase SQL Editor

Go to **Supabase → SQL Editor** and run the following:

```sql
-- Users (mirrors Supabase auth.users)
CREATE TABLE public.users (
  id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','employee')) DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Tasks
CREATE TABLE public.tasks (
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
CREATE POLICY "Authenticated users can read tasks" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Managers and admins can delete tasks" ON public.tasks FOR DELETE USING (auth.role() = 'authenticated');

-- Direct Chat
CREATE TABLE public.chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own chats" ON public.chat FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.chat FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Group Chat (NEW)
CREATE TABLE public.group_chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.group_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read group chat" ON public.group_chat FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can send group messages" ON public.group_chat FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id),
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Files
CREATE TABLE public.files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id),
  file_url    TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read files" ON public.files FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert files" ON public.files FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

## Step 3 — Enable Realtime for tables

In **Supabase → Database → Replication**, enable **Realtime** for:
- `chat` table
- `group_chat` table ← NEW
- `notifications` table ← NEW (for popup alerts)

---

## Step 4 — Create Storage bucket for files

In **Supabase → Storage**:
1. Click "New bucket" → name it **`task-files`**
2. Set it to **Public**

---

## Step 5 — Deploy to Vercel via GitHub

### Push to GitHub
```bash
git init
git add .
git commit -m "TaskFlow v2 - with group chat, notification popups, employee progress"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Deploy on Vercel
1. Go to https://vercel.com → **New Project** → Import your GitHub repo
2. No build step needed — it's a static site
3. Click **Deploy**

Your app will be live on a `.vercel.app` domain instantly.

---

## Role Capabilities

| Role     | Capabilities |
|----------|-------------|
| **Admin**    | All users, all tasks, reports, user management, all chat |
| **Manager**  | Create/assign tasks, employee progress view, chat, CSV reports |
| **Employee** | View own tasks, update status, upload files, chat |

---

## Demo Accounts

Create accounts via `/register.html`, choosing your role.

---

## Notification Popup Behavior

- **Task assigned** → employee gets a popup + notification in the bell icon
- **Status changed** → manager/admin who assigned the task gets a popup
- **New direct message** → receiver gets a popup in the top-right corner
- **New group message** → all other team members get a popup

Popups auto-dismiss after 4.5 seconds or can be closed manually.
