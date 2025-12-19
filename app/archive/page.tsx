import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { ArchiveList } from '@/components/ArchiveList';

export const metadata = {
  title: '전체 글 목록',
  description: 'Learning Dev의 모든 글을 확인하세요.',
};

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

        <ArchiveList allPosts={allPosts} />
      </div>
    </main>
  );
}
