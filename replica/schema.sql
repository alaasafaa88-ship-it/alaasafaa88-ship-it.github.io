-- اختياري: مزامنة سحابية على Supabase. غير مستخدم في الإصدار الحالي (التخزين محلي).
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  data jsonb not null,                       -- نموذج المشروع كما في js/state.js
  thumb text,                                -- data URL صغيرة
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on projects (user_id, updated_at desc);
alter table projects enable row level security;
create policy "owner reads" on projects for select using (auth.uid() = user_id);
create policy "owner writes" on projects for insert with check (auth.uid() = user_id);
create policy "owner updates" on projects for update using (auth.uid() = user_id);
create policy "owner deletes" on projects for delete using (auth.uid() = user_id);
