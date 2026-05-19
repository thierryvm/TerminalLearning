/**
 * StaffQuickActions — THI-235 Sprint 2.A étape 2.bis.
 *
 * Role-gated quick actions section displayed on `/app` Dashboard for staff
 * users (teacher, super_admin). Anonymous and student users do not see this
 * section at all — preserves the anonymous-friendly UX of TL where a guest
 * can use the app without any role-specific UI.
 *
 * Pattern : industry-standard 2026 B2B SaaS "role-specific KPIs" pattern
 * (cf. Orbix 2026 dashboard design — 5 contextual decisions per role, not
 * 40 generic metrics). Cards are non-intrusive (1-2 max per role) and act
 * as discoverable entry points to role-gated routes the user might otherwise
 * miss in the Sidebar (empirical bug 19/05 : @thierry himself did not notice
 * the Sidebar "Mes classes" entry).
 *
 * Defense-in-depth :
 *   - Client-side : useUserRole() drives conditional rendering
 *   - Server-side : the linked routes (`/app/teacher`, `/app/admin`) are
 *     gated by RequireRole on the server (route component level). A malicious
 *     user manipulating useUserRole client-side cannot access protected data
 *     — only the UI hint disappears/appears.
 */
import { ChevronRight, School, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';

import { useUserRole } from '@/lib/hooks/useUserRole';
import { Card } from '../ui/card';

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
}

function QuickActionCard({ icon, label, description, href }: QuickActionCardProps) {
  return (
    <Card
      variant="tl-surface"
      className="px-5 py-4 transition-colors hover:border-emerald-500/40 hover:bg-[var(--github-border-secondary)]/30 focus-within:border-emerald-500/40"
    >
      <Link
        to={href}
        className="flex items-center gap-3 -mx-5 -my-4 px-5 py-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <span className="text-emerald-400 shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--github-text-primary)]">{label}</div>
          <div className="text-xs text-[var(--github-text-secondary)] truncate">{description}</div>
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--github-text-secondary)]/70 shrink-0"
          aria-hidden="true"
        />
      </Link>
    </Card>
  );
}

export function StaffQuickActions() {
  const { role } = useUserRole();
  const isTeacher = role === 'teacher' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  // No staff card visible → render nothing (preserves student/anonymous flow)
  if (!isTeacher && !isSuperAdmin) return null;

  return (
    <section className="mb-8" aria-labelledby="staff-quick-actions-heading">
      <h2
        id="staff-quick-actions-heading"
        className="text-xs text-[var(--github-text-secondary)] uppercase tracking-widest font-mono mb-3 px-1"
      >
        Mes outils
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isTeacher && (
          <QuickActionCard
            icon={<School size={20} />}
            label="Mes classes"
            description="Créer, partager les codes d'invitation, suivre les élèves"
            href="/app/teacher"
          />
        )}
        {isSuperAdmin && (
          <QuickActionCard
            icon={<ShieldCheck size={20} />}
            label="Administration"
            description="Supervision plateforme, monitoring, santé Supabase"
            href="/app/admin"
          />
        )}
      </div>
    </section>
  );
}
