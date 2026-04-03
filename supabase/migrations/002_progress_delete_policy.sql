-- ─── RGPD — droit à l'effacement (Art. 17 RGPD) ──────────────────────────────
-- Permet à un utilisateur de supprimer ses propres données de progression.
-- La suppression du profil (cascade) supprime aussi progress via FK on delete cascade.

create policy "progress: delete own"
  on public.progress
  for delete
  using (auth.uid() = user_id);
