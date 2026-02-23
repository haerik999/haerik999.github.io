import Link from 'next/link';
import dayjs from 'dayjs';
import { FolderOpen, Clock, FileText } from 'lucide-react';
import { getAllPosts, buildCategoryTree, CategoryNode } from '@/lib/posts';

function countPosts(node: CategoryNode): number {
  return node.posts.length + node.children.reduce((sum, child) => sum + countPosts(child), 0);
}

function findFirstPost(node: CategoryNode): string | null {
  if (node.posts.length > 0) return node.posts[0].slug;
  for (const child of node.children) {
    const slug = findFirstPost(child);
    if (slug) return slug;
  }
  return null;
}

export default function Home() {
  const posts = getAllPosts();
  const categoryTree = buildCategoryTree(posts);
  const recentPosts = posts.slice(0, 5);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <h1 className="text-3xl font-light text-gray-900 mb-3">Learning Dev</h1>
        <p className="text-sm text-gray-500 mb-12">개발에 대해 배우고 학습한 개념들을 정리하는 위키입니다.</p>

        {/* Category cards grid */}
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-4">
            <FolderOpen size={18} className="text-gray-400" />
            카테고리
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTree.map((category) => {
              const firstSlug = findFirstPost(category);
              const href = firstSlug ? `/posts/${firstSlug}` : '#';
              return (
                <Link key={category.path} href={href}>
                  <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                    <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{countPosts(category)}개 문서</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent updates */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-4">
            <Clock size={18} className="text-gray-400" />
            최근 업데이트
          </h2>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link key={post.slug} href={`/posts/${post.slug}`}>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900">{post.title}</span>
                    {post.category && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-50 rounded text-gray-500">{post.category}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">{dayjs(post.date).format('YYYY.MM.DD')}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
