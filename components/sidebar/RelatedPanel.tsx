'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tag, FileText, ArrowUpRight } from 'lucide-react';
import type { PostMetadata, BacklinkInfo } from '@/lib/posts';

interface RelatedPanelProps {
  allPosts: PostMetadata[];
  backlinkMap: Record<string, BacklinkInfo[]>;
}

function getCurrentPost(allPosts: PostMetadata[], slug: string): PostMetadata | undefined {
  return allPosts.find(p => p.slug === slug);
}

function getRelatedByTags(allPosts: PostMetadata[], currentPost: PostMetadata): PostMetadata[] {
  if (!currentPost.tags.length) return [];
  const tagSet = new Set(currentPost.tags);
  return allPosts
    .filter(p => p.slug !== currentPost.slug && p.tags.some(t => tagSet.has(t)))
    .sort((a, b) => {
      const aShared = a.tags.filter(t => tagSet.has(t)).length;
      const bShared = b.tags.filter(t => tagSet.has(t)).length;
      return bShared - aShared;
    })
    .slice(0, 5);
}

export function RelatedPanel({ allPosts, backlinkMap }: RelatedPanelProps) {
  const pathname = usePathname();
  const currentSlug = pathname.replace('/posts/', '');
  const currentPost = getCurrentPost(allPosts, currentSlug);

  if (!currentPost) return null;

  const tags = currentPost.tags || [];
  const relatedPosts = getRelatedByTags(allPosts, currentPost);
  const backlinks = backlinkMap[currentSlug] || [];

  return (
    <div className="space-y-6">
      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
            <Tag size={12} />
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5 px-2">
            {tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
            <FileText size={12} />
            Related
          </h3>
          <div className="space-y-0.5">
            {relatedPosts.map(post => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <FileText size={13} className="flex-shrink-0 opacity-60" />
                <span className="truncate">{post.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
            <ArrowUpRight size={12} />
            Backlinks
          </h3>
          <div className="space-y-0.5">
            {backlinks.map(bl => (
              <Link
                key={bl.slug}
                href={`/posts/${bl.slug}`}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <ArrowUpRight size={13} className="flex-shrink-0 opacity-60" />
                <span className="truncate">{bl.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
