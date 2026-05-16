-- ─── 013: LTI launches audit log (THI-131 Phase 7c Auth MVP) ─────────────────
-- Write-only forensic + replay-protection table for /api/lti/launch.
--
-- Design rationale:
-- - Append-only audit trail (every JWT verification outcome logged).
-- - UNIQUE (jti) enforces JWT replay protection at the database layer (defense
--   in depth on top of the in-memory nonceStore — survives function recycles).
-- - No SELECT/UPDATE/DELETE policy: only `service_role` (used by the LTI Vercel
--   Function via `SUPABASE_SERVICE_ROLE_KEY`) can write. Standard authenticated
--   users have zero visibility — appropriate for B2B forensics.
-- - Foundation for AGS V1.1 (Phase 2 post-10 juin): grade-passback worker will
--   join lti_launches → lti_grades on `jti` to compute lineitem URLs.
--
-- See: docs/adr/ADR-006-lti-1-3-implementation.md, docs/lti-install.md

create table if not exists public.lti_launches (
  id uuid primary key default gen_random_uuid(),

  -- JWT identity claims
  jti text not null,
  iss text not null,
  sub text not null,
  aud text not null,

  -- LTI 1.3 deployment + context
  deployment_id text not null,
  context_id text,
  roles text[] not null default '{}',
  target_link_uri text not null,

  -- Timestamps
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  received_at timestamptz not null default now(),

  -- Outcome (always logged, accepted or rejected)
  outcome text not null check (outcome in ('accepted', 'rejected')),
  rejection_reason text,

  -- Forensics
  client_ip text
);

-- Replay protection: same `jti` cannot be inserted twice (any iss).
-- This is the hard guarantee; the in-memory nonceStore is the fast first line
-- of defense, but a function cold-start would lose it. The DB unique index is
-- the canonical truth.
create unique index if not exists idx_lti_launches_jti on public.lti_launches(jti);

-- Tail queries (admin forensics, "show me the last N launches")
create index if not exists idx_lti_launches_received_at on public.lti_launches(received_at desc);

-- Per-user per-LMS lookups (Phase 9 admin dashboards: "show all launches for sub X from iss Y")
create index if not exists idx_lti_launches_iss_sub on public.lti_launches(iss, sub);

-- ── RLS: service_role only (no policies = no access for anon/authenticated) ──
alter table public.lti_launches enable row level security;

-- Documentation comment for future maintainers
comment on table public.lti_launches is
  'THI-131 — Audit log of every LTI 1.3 launch attempt (accepted or rejected). '
  'Write-only from /api/lti/launch (service_role). Standard users have zero '
  'access via RLS. UNIQUE(jti) enforces replay protection. '
  'Foundation for AGS V1.1 grade-passback (Phase 2 post-10 juin 2026).';

comment on column public.lti_launches.jti is
  'JWT unique identifier — UNIQUE constraint blocks replay attacks even across function cold-starts.';

comment on column public.lti_launches.target_link_uri is
  'LTI claim — validated same-origin against terminallearning.dev at /api/lti/launch before insert.';

comment on column public.lti_launches.outcome is
  'accepted = JWT verified + persisted user session created; rejected = signature/issuer/audience/jti/exp validation failed.';
