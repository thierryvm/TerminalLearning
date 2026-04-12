-- ─── 009: Add UPDATE policies for admin roles on profiles ────────────────────
-- Missing policies (discovered during THI-80 integration tests):
-- super_admin and institution_admin need UPDATE access on profiles
-- to manage user roles (approve teachers, assign institutions, etc.).
-- Without these policies, role management via the authenticated Supabase client
-- silently returns 0 rows updated.

create policy "profiles: super_admin update all"
  on public.profiles for update
  using (public.get_my_role() = 'super_admin');

create policy "profiles: institution_admin update own institution"
  on public.profiles for update
  using (
    public.get_my_role() = 'institution_admin'
    and institution_id = public.get_my_institution_id()
  );
