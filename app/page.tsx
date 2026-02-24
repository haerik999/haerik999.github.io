import Link from 'next/link';
import dayjs from 'dayjs';
import { FolderOpen, Clock, FileText } from 'lucide-react';
import { getAllPosts, buildCategoryTree, CategoryNode } from '@/lib/posts';
import { SearchTrigger } from '@/components/SearchTrigger';

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

function getSubcategoryNames(node: CategoryNode): string[] {
  return node.children.map(child => child.name);
}

export default function Home() {
  const posts = getAllPosts();
  const categoryTree = buildCategoryTree(posts);
  const recentPosts = posts.slice(0, 5);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-light text-gray-900">Learning Dev</h1>
          <SearchTrigger />
        </div>

        {/* Category cards grid */}
        <section className="mb-16">
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-6">
            <FolderOpen size={18} className="text-gray-400" />
            카테고리
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categoryTree.map((category) => {
              const firstSlug = findFirstPost(category);
              const href = firstSlug ? `/posts/${firstSlug}` : '#';
              const subcategories = getSubcategoryNames(category);
              const postCount = countPosts(category);
              return (
                <Link key={category.path} href={href}>
                  <div className="group p-5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer h-full">
                    <h3 className="text-base font-medium text-gray-900 group-hover:text-gray-700">{category.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{postCount}개 문서</p>
                    {subcategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {subcategories.map(sub => (
                          <span key={sub} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{sub}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent updates */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-6">
            <Clock size={18} className="text-gray-400" />
            최근 업데이트
          </h2>
          <div className="space-y-0">
            {recentPosts.map((post) => (
              <Link key={post.slug} href={`/posts/${post.slug}`}>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2 -mx-2 rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">{post.title}</span>
                    {post.category && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-50 rounded text-gray-500 flex-shrink-0">{post.category}</span>
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
