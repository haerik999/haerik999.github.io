'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import type { CategoryNode, PostMetadata } from '@/lib/posts';

const STORAGE_KEY = 'wiki-sidebar-state';

function loadExpandState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExpandState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function findAncestorPaths(nodes: CategoryNode[], targetSlug: string): string[] {
  for (const node of nodes) {
    for (const post of node.posts) {
      if (post.slug === targetSlug) {
        return [node.path];
      }
    }
    const childPaths = findAncestorPaths(node.children, targetSlug);
    if (childPaths.length > 0) {
      return [node.path, ...childPaths];
    }
  }
  return [];
}

interface CategoryNodeItemProps {
  node: CategoryNode;
  currentSlug: string;
  expandState: Record<string, boolean>;
  onToggle: (path: string) => void;
}

function CategoryNodeItem({ node, currentSlug, expandState, onToggle }: CategoryNodeItemProps) {
  const isExpanded = expandState[node.path] ?? false;
  const hasChildren = node.children.length > 0;
  const hasPosts = node.posts.length > 0;
  const showContents = isExpanded && (hasChildren || hasPosts);

  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        className="flex items-center gap-1 w-full text-left px-2 py-1 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={14} className="flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight size={14} className="flex-shrink-0 text-gray-400" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {showContents && (
        <div className="pl-4">
          {node.children.map(child => (
            <CategoryNodeItem
              key={child.path}
              node={child}
              currentSlug={currentSlug}
              expandState={expandState}
              onToggle={onToggle}
            />
          ))}
          {node.posts.map(post => (
            <PostItem key={post.slug} post={post} isCurrent={post.slug === currentSlug} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PostItemProps {
  post: PostMetadata;
  isCurrent: boolean;
}

function PostItem({ post, isCurrent }: PostItemProps) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
        isCurrent
          ? 'bg-gray-900 text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <FileText size={13} className="flex-shrink-0 opacity-60" />
      <span className="truncate">{post.title}</span>
    </Link>
  );
}

interface CategoryTreeProps {
  categoryTree: CategoryNode[];
  currentSlug?: string;
}

export function CategoryTree({ categoryTree, currentSlug }: CategoryTreeProps) {
  const pathname = usePathname();
  const slug = currentSlug ?? pathname.replace('/posts/', '');

  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = loadExpandState();
    const ancestorPaths = findAncestorPaths(categoryTree, slug);

    const initial: Record<string, boolean> = { ...stored };
    for (const p of ancestorPaths) {
      initial[p] = true;
    }

    setExpandState(initial);
    setInitialized(true);
  }, [slug]);

  const handleToggle = (path: string) => {
    setExpandState(prev => {
      const next = { ...prev, [path]: !prev[path] };
      saveExpandState(next);
      return next;
    });
  };

  if (!initialized) return null;

  return (
    <div className="space-y-0.5">
      {categoryTree.map(node => (
        <CategoryNodeItem
          key={node.path}
          node={node}
          currentSlug={slug}
          expandState={expandState}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
