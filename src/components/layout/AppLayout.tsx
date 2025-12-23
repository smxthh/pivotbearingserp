import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { useApp } from '@/contexts/AppContext';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <AppSidebar />
      {/* Spacer div to account for fixed sidebar */}
      {!sidebarCollapsed && <div className="w-[280px] flex-shrink-0" />}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
