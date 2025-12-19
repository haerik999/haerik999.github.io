import { BookOpen } from 'lucide-react';
import { getAllPosts } from '@/lib/posts';
import { PostList } from '@/components/PostList';

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
          <p className="text-base text-gray-600 font-light">
            개발에 대해 배우고 학습한 개념들을 정리하는 블로그입니다.
          </p>
        </div>

        <PostList posts={posts} />
      </div>
    </main>
  );
}
