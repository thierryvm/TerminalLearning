import { useState } from 'react';
import { Outlet } from 'react-router';
import { Sidebar, MenuButton } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh flex overflow-hidden bg-[#0d1117]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden shrink-0 h-14 border-b border-[#30363d] bg-[#161b22] flex items-center gap-3 px-3">
          <MenuButton onClick={() => setSidebarOpen(true)} />
          <span className="text-sm text-[#e6edf3] font-mono">Terminal Master</span>
        </div>

        <main className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
