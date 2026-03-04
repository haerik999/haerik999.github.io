'use client';

import { Search } from 'lucide-react';
import { useCommandPalette } from './CommandPalette';

export function SearchTrigger() {
  const { open } = useCommandPalette();

  return (
    <button
      onClick={open}
      className="flex items-center gap-2 w-56 px-3 py-1.5 text-base text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-white transition-colors cursor-pointer"
    >
      <Search size={16} className="shrink-0" />
      <span className="flex-1 text-left">Search posts...</span>
      <span className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-400">Ctrl+K</span>
    </button>
  );
}
