-- Migration 012: Fix RLS policy drift — institutions SELECT
-- Issue: Migrations 010 and 011 both create SELECT policies for institutions table.
-- When multiple policies exist, Postgres applies them with OR logic: if ANY policy
-- allows access, the operation is allowed. This defeats the security fix in 011.
--
-- Fix: Drop the permissive policy from 010, keep the restrictive policy from 011.
-- Verification: Only ONE policy should exist after this migration.

-- Drop the overly-permissive policy from migration 010
drop policy if exists "institutions: select by role" on public.institutions;

-- Verify that the restrictive policy from 011 exists
-- (should pass if migrations were applied in order: 010 → 011 → 012)
assert exists (
  select 1 from pg_policies
  where tablename = 'institutions'
    and policyname = 'institutions: users see own institution'
), 'Expected policy "institutions: users see own institution" from migration 011';

-- Verify that we now have exactly ONE SELECT policy on institutions
assert (
  select count(*) from pg_policies
  where tablename = 'institutions' and cmd = 'SELECT'
) = 1, 'Expected exactly 1 SELECT policy on institutions after cleanup';
