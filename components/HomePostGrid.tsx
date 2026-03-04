'use client';

import Link from 'next/link';
import Image from 'next/image';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import type { PostMetadata } from '@/lib/posts';
import { getCategoryTheme, getTopCategory } from '@/lib/category-theme';

interface HomePostGridProps {
  posts: PostMetadata[];
}

interface CategoryOption {
  name: string;
  count: number;
}

function buildCategoryOptions(posts: PostMetadata[]): CategoryOption[] {
  const countMap = new Map<string, number>();
  for (const post of posts) {
    const topCategory = getTopCategory(post.category);
    countMap.set(topCategory, (countMap.get(topCategory) || 0) + 1);
  }

  const categories = [...countMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));

  return [{ name: 'All', count: posts.length }, ...categories];
}

export function HomePostGrid({ posts }: HomePostGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categoryOptions = useMemo(() => buildCategoryOptions(posts), [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') return posts;
    return posts.filter((post) => getTopCategory(post.category) === selectedCategory);
  }, [posts, selectedCategory]);

  const shouldShowCategoryFilter = categoryOptions.length > 1;

  return (
    <article>
      {shouldShowCategoryFilter && (
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categoryOptions.map((option) => {
              const isActive = option.name === selectedCategory;
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => setSelectedCategory(option.name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900'
                  }`}
                >
                  <span>{option.name}</span>
                  <span className={`${isActive ? 'text-gray-200' : 'text-gray-400'}`}>{option.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
          <p className="text-base text-gray-500">
            아직 표시할 글이 없습니다. 새로운 글을 작성하면 여기에 카드 형태로 노출됩니다.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6">
          {filteredPosts.map((post) => {
            const topCategory = getTopCategory(post.category);
            const theme = getCategoryTheme(post.category);
            return (
              <li key={post.slug}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-44 overflow-hidden border-b border-gray-100">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={`${post.title} cover image`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className={`relative h-full w-full bg-gradient-to-br ${theme.cardGradientClass}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.7),transparent_50%)]" />
                        <div className="absolute bottom-4 left-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${theme.badgeClass}`}>
                            {topCategory}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm text-gray-400">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${theme.badgeClass}`}>{topCategory}</span>
                      <span>{dayjs(post.date).format('YYYY.MM.DD')}</span>
                      <span>{post.readTime}분</span>
                    </div>

                    <h2 className="mb-2 text-xl font-extrabold leading-snug text-gray-900 transition-colors group-hover:text-gray-700">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="mb-4 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>
                    )}

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
