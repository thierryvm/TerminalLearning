-- ─── security_audit_logs ─────────────────────────────────────────────────────
-- Stores weekly Security Sentinel results (Phase 9: Admin Panel / Security Center)
create table public.security_audit_logs (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null    default now(),
  trigger          text        not null    check (trigger in ('schedule', 'workflow_dispatch', 'manual')),
  npm_audit_status text        not null    check (npm_audit_status in ('pass', 'fail', 'skipped')),
  secrets_scan_status text     not null    check (secrets_scan_status in ('pass', 'fail', 'skipped')),
  headers_status   text        not null    check (headers_status in ('pass', 'fail', 'skipped')),
  cookies_status   text        not null    check (cookies_status in ('pass', 'fail', 'skipped')),
  overall_status   text        not null    check (overall_status in ('pass', 'warning', 'fail')),
  run_url          text,
  notes            text
);

alter table public.security_audit_logs enable row level security;

-- Only service_role (GitHub Actions) can insert/read — no client-side access
-- Phase 9 admin reads will be added via a separate policy using RBAC
create policy "security_audit_logs: service_role only"
  on public.security_audit_logs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
