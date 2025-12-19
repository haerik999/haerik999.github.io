import Link from 'next/link';
import dayjs from 'dayjs';
import { Calendar, ChevronRight, Clock } from 'lucide-react';
import { getAllPosts } from '@/lib/posts';

export const metadata = {
  title: '전체 글 목록',
  description: 'Learning Dev의 모든 글을 확인하세요.',
};

const POSTS_PER_PAGE = 20;

export default function ArchivePage() {
  const allPosts = getAllPosts();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-12 transition-colors"
        >
          <span>←</span>
          <span>돌아가기</span>
        </Link>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 leading-tight">
            모든 글
          </h1>
          <p className="text-gray-600 text-sm">
            총 {allPosts.length}개의 글
          </p>
        </header>

        {/* Posts */}
        {allPosts.length === 0 ? (
          <div className="py-16">
            <p className="text-gray-400">작성된 글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {allPosts.map((post) => (
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
      </div>
    </main>
  );
}
