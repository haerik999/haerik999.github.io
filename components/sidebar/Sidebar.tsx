'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ArrowLeft } from 'lucide-react';
import type { CategoryNode, PostMetadata } from '@/lib/posts';
import { useSidebar } from './SidebarProvider';
import { CategoryTree } from './CategoryTree';
import { SearchBox } from './SearchBox';

interface SidebarProps {
  categoryTree: CategoryNode[];
  allPosts: PostMetadata[];
}

function findTopCategory(allPosts: PostMetadata[], slug: string): string | null {
  const post = allPosts.find(p => p.slug === slug);
  if (!post || !post.category) return null;
  return post.category.split('/')[0];
}

export function Sidebar({ categoryTree, allPosts }: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const currentSlug = pathname.replace('/posts/', '');

  const topCategory = findTopCategory(allPosts, currentSlug);
  const filteredTree = topCategory
    ? categoryTree.filter(node => node.name === topCategory)
    : categoryTree;

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
          relative fixed top-0 left-0 z-30 h-screen w-64 bg-white border-r border-gray-200 overflow-y-auto
          transition-transform duration-200
          lg:translate-x-0 lg:static lg:z-auto lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
            onClick={close}
          >
            <ArrowLeft size={14} />
            <span>전체 카테고리</span>
          </Link>
          {topCategory && (
            <div className="text-base font-medium text-gray-900">{topCategory}</div>
          )}
          <button
            onClick={close}
            className="lg:hidden absolute top-4 right-4 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
          <CategoryTree categoryTree={filteredTree} />
        </nav>
      </aside>
    </>
  );
}
