'use client';

import Link from 'next/link';
import { useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, ChevronRight, Clock } from 'lucide-react';
import type { PostMetadata } from '@/lib/posts';

const POSTS_PER_PAGE = 10;

interface PostListProps {
  posts: PostMetadata[];
}

export function PostList({ posts }: PostListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 카테고리별 그룹핑
  const categories = Array.from(
    new Set(posts.map((post) => post.category || 'General'))
  );

  // 필터링된 포스트
  const filteredPosts = selectedCategory
    ? posts.filter((post) => (post.category || 'General') === selectedCategory)
    : posts;

  const displayedPosts = filteredPosts.slice(0, POSTS_PER_PAGE);
  const hasNextPage = filteredPosts.length > POSTS_PER_PAGE;

  return (
    <>
      {/* Categories */}
      <div className="mb-12 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            selectedCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

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
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
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
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {post.excerpt}
                  </p>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasNextPage && (
        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
          >
            더 보기
            <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
