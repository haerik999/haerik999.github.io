'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { CategoryNode } from '@/lib/posts';
import { useSidebar } from './SidebarProvider';
import { CategoryTree } from './CategoryTree';
import { SearchBox } from './SearchBox';

interface SidebarProps {
  categoryTree: CategoryNode[];
}

export function Sidebar({ categoryTree }: SidebarProps) {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto
          transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <Link
            href="/"
            className="text-base font-medium text-gray-900 hover:text-gray-600 transition-colors"
          >
            Learning Dev
          </Link>
          <button
            onClick={close}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100">
          <SearchBox />
        </div>

        {/* Category tree */}
        <nav className="px-2 py-3">
          <CategoryTree categoryTree={categoryTree} />
        </nav>
      </aside>
    </>
  );
}
