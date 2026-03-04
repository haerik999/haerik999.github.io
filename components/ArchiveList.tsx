'use client';

import Link from 'next/link';
import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { PostMetadata } from '@/lib/posts';

const POSTS_PER_PAGE = 15;

interface ArchiveListProps {
  allPosts: PostMetadata[];
}

export function ArchiveList({ allPosts }: ArchiveListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE;
  const endIdx = startIdx + POSTS_PER_PAGE;
  const displayedPosts = allPosts.slice(startIdx, endIdx);

  return (
    <div className="py-16">
      <header className="mb-12">
        <h1 className="text-[32px] font-bold text-gray-900 mb-2">Archive</h1>
        <p className="text-base text-gray-400">
          {allPosts.length}개의 글
        </p>
      </header>

      {displayedPosts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400">작성된 글이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-0">
          {displayedPosts.map((post) => (
            <li key={post.slug} className="border-b border-gray-100 last:border-b-0">
              <Link href={`/posts/${post.slug}`} className="block py-6 group">
                <div className="flex items-center gap-3 mb-2">
                  {post.category && (
                    <span className="text-base font-semibold text-blue-500">
                      {post.category}
                    </span>
                  )}
                  <span className="text-base text-gray-400">
                    {dayjs(post.date).format('YYYY-MM-DD')}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-black group-hover:text-blue-500 transition-colors mb-1">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-base text-gray-500 leading-relaxed mb-2">
                    {post.excerpt}
                  </p>
                )}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-sm text-gray-500">#{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                currentPage === page
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
