'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PostMetadata, BacklinkInfo } from '@/lib/posts';
import { useSidebar } from './SidebarProvider';
import { RelatedPanel } from './RelatedPanel';

interface SidebarProps {
  allPosts: PostMetadata[];
  backlinkMap: Record<string, BacklinkInfo[]>;
}

const SIDEBAR_WIDTH_KEY = 'wiki-sidebar-width';
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

function findTopCategory(allPosts: PostMetadata[], slug: string): string | null {
  const post = allPosts.find(p => p.slug === slug);
  if (!post || !post.category) return null;
  return post.category.split('/')[0];
}

export function Sidebar({ allPosts, backlinkMap }: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const currentSlug = pathname.replace('/posts/', '');

  const topCategory = findTopCategory(allPosts, currentSlug);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setSidebarWidth(parsed);
      }
    }
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const delta = e.clientX - dragStartX.current;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
    setSidebarWidth(newWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    setSidebarWidth(prev => {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(prev));
      return prev;
    });
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    setIsDragging(true);
  }, [sidebarWidth]);

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
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ width: `${sidebarWidth}px` }}
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

        {/* Related panel */}
        <nav className="px-2 py-3">
          <RelatedPanel allPosts={allPosts} backlinkMap={backlinkMap} />
        </nav>

        {/* Resize handle (desktop only) */}
        <div
          onMouseDown={onHandleMouseDown}
          className="hidden lg:flex absolute top-0 right-0 bottom-0 w-3 items-center justify-center group cursor-col-resize z-10"
          aria-hidden="true"
        >
          <div
            className={`w-0.5 h-full transition-colors ${
              isDragging ? 'bg-blue-400' : 'bg-transparent group-hover:bg-gray-300'
            }`}
          />
        </div>
      </aside>
    </>
  );
}
