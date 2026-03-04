'use client';

import { Search } from 'lucide-react';
import { useCommandPalette } from './CommandPalette';

export function SearchTrigger() {
  const { open } = useCommandPalette();

  return (
    <button
      onClick={open}
      className="p-2 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
      aria-label="Search"
    >
      <Search size={18} />
    </button>
  );
}
