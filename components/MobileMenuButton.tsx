'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar/SidebarProvider';

export function MobileMenuButton() {
  const { toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      aria-label="Toggle sidebar"
    >
      <Menu size={20} />
    </button>
  );
}
