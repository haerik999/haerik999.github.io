import Link from 'next/link';
import dayjs from 'dayjs';
import { BookOpen, Calendar, ChevronRight, Clock } from 'lucide-react';
import { getAllPosts } from '@/lib/posts';

const POSTS_PER_PAGE = 10;

export default function Home() {
  const allPosts = getAllPosts();
  const posts = allPosts.slice(0, POSTS_PER_PAGE);
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const hasNextPage = allPosts.length > POSTS_PER_PAGE;

  // 카테고리별 그룹핑
  const categories = Array.from(
    new Set(allPosts.map((post) => post.category || 'General'))
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-32">
        {/* Header */}
        <div className="mb-24">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500 tracking-wide">Learning Dev</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-6 leading-tight">
            개발을 공부하며<br />정리한 개념들
          </h1>
          <p className="text-base text-gray-600 font-light leading-relaxed">
            웹 개발에 대해 배우고 학습한 개념들을 정리하는 블로그입니다.
            <br />
            JavaScript, React, Next.js, TypeScript 등 다양한 주제를 깊이 있게 다룹니다.
          </p>
        </div>

        {/* Categories */}
        <div className="mb-12 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-full"
            >
              {category}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="mb-12 py-4 border-t border-b border-gray-100">
          <p className="text-sm text-gray-500">
            총 {allPosts.length}개의 글 · 약 {Math.round(allPosts.reduce((acc, post) => acc + post.readTime, 0) / 60)}시간의 읽을 거리
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="py-16">
            <p className="text-gray-400">작성된 글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
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
      </div>
    </main>
  );
}
