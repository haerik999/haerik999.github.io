import Link from 'next/link';
import dayjs from 'dayjs';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { getAllPosts } from '@/lib/posts';

export default function Home() {
  const posts = getAllPosts();

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
          <p className="text-lg text-gray-500 font-light">
            지식을 기록하고 공유합니다
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
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-light text-gray-900 group-hover:text-gray-600 transition-colors flex-1">
                      {post.title}
                    </h2>
                    <ChevronRight className="ml-4 text-gray-300 group-hover:text-gray-500 transition-all group-hover:translate-x-1" size={20} />
                  </div>
                  <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <Calendar size={14} />
                    {dayjs(post.date).format('YYYY년 M월 D일')}
                  </p>
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
      </div>
    </main>
  );
}
