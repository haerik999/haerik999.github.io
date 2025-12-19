import Link from 'next/link';
import dayjs from 'dayjs';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { getAllPosts } from '@/lib/posts';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <BookOpen size={16} />
            개발 학습 블로그
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Learning Dev
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            개발을 공부하며 정리한 개념들을 공유합니다
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">작성된 글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link href={`/posts/${post.slug}`} key={post.slug}>
                <article className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200 overflow-hidden cursor-pointer">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex-1">
                        {post.title}
                      </h2>
                      <ChevronRight className="ml-3 group-hover:translate-x-1 transition-transform text-gray-400 group-hover:text-blue-600" size={24} />
                    </div>
                    <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                      <Calendar size={16} />
                      {dayjs(post.date).format('YYYY년 M월 D일')}
                    </p>
                    {post.excerpt && (
                      <p className="text-gray-600 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
