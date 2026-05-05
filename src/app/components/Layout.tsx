import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar, MenuButton } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--github-bg)]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* THI-152 brick 7/9: pt/pl/pr env(safe-area-inset-*) on the flex-1
          wrapper shifts both the mobile top bar AND the main area below
          the iOS status bar in PWA standalone mode (Add-to-Home-Screen).
          Without this, `apple-mobile-web-app-status-bar-style:
          black-translucent` (set in index.html) lets wifi/battery/signal
          icons overlay the top-bar content. On non-standalone Safari and
          on desktop, env(safe-area-inset-*) resolves to 0 → no shift.
          Landscape iPhone: pl/pr handle the notch on the rotated side. */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Mobile top bar */}
        <div className="lg:hidden shrink-0 h-14 border-b border-[var(--github-border-primary)] bg-[var(--github-border-secondary)] flex items-center gap-3 px-3">
          <MenuButton onClick={() => setSidebarOpen(true)} />
          <span className="text-sm text-[var(--github-text-primary)] font-mono">Terminal Master</span>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
