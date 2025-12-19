'use client';

import Link from 'next/link';
import { useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, ChevronRight, Clock, ChevronLeft } from 'lucide-react';
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
    <>
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 leading-tight">
          모든 글
        </h1>
        <p className="text-gray-600 text-sm">
          총 {allPosts.length}개의 글 · {currentPage} / {totalPages}
        </p>
      </header>

      {/* Posts */}
      {displayedPosts.length === 0 ? (
        <div className="py-16">
          <p className="text-gray-400">작성된 글이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {displayedPosts.map((post) => (
            <Link href={`/posts/${post.slug}`} key={post.slug}>
              <article className="group py-8 border-b border-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-light text-gray-900 group-hover:text-gray-600 transition-colors flex-1">
                    {post.title}
                  </h2>
                  <ChevronRight className="ml-4 text-gray-300 group-hover:text-gray-500 transition-all group-hover:translate-x-1 flex-shrink-0" size={20} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="px-2 py-1 bg-gray-50 rounded text-gray-600">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {dayjs(post.date).format('YYYY년 M월 D일')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readTime}분
                  </div>
                </div>
                {post.excerpt && (
                  <p className="text-gray-600 leading-relaxed text-sm mt-3">
                    {post.excerpt}
                  </p>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            <span>이전</span>
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  currentPage === page
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>다음</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
