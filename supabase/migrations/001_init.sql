-- ─── profiles (extends auth.users) ───────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"  on public.profiles for select  using (auth.uid() = id);
create policy "profiles: update own"  on public.profiles for update  using (auth.uid() = id);

-- ─── progress ────────────────────────────────────────────────────────────────
create table public.progress (
  user_id       uuid references public.profiles(id) on delete cascade,
  lesson_id     text        not null,
  completed     boolean     default false,
  completed_at  timestamptz,
  score         integer     check (score >= 0 and score <= 100),
  primary key (user_id, lesson_id)
);

alter table public.progress enable row level security;

create policy "progress: select own"  on public.progress for select  using (auth.uid() = user_id);
create policy "progress: insert own"  on public.progress for insert  with check (auth.uid() = user_id);
create policy "progress: update own"  on public.progress for update  using (auth.uid() = user_id);

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
