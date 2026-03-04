import { getAllPosts } from '@/lib/posts';
import { ArchiveList } from '@/components/ArchiveList';

export const metadata = {
  title: '전체 글 목록',
  description: 'Haerik의 모든 글을 확인하세요.',
};

export default function ArchivePage() {
  const allPosts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <ArchiveList allPosts={allPosts} />
    </div>
  );
}
