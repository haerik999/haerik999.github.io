import Link from 'next/link';
import dayjs from 'dayjs';
import { getAllPosts } from '@/lib/posts';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Learning Dev</h1>
          <p className="text-xl text-gray-600">
            개발 공부하며 정리한 개념들
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-500 text-lg">작성된 글이 없습니다.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="border-b border-gray-200 pb-8 last:border-b-0"
              >
                <Link href={`/posts/${post.slug}`}>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors cursor-pointer">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-sm text-gray-500 mb-3">
                  {dayjs(post.date).format('YYYY년 M월 D일')}
                </p>
                {post.excerpt && (
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {post.excerpt}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
