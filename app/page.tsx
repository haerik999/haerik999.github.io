import Link from 'next/link';
import dayjs from 'dayjs';
import { getAllPosts } from '@/lib/posts';

export default function Home() {
  const posts = getAllPosts();

  return (
    <main className="py-16">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-[32px] font-bold text-gray-900 mb-2">Haerik</h1>
        <p className="text-lg text-gray-500">Story of a Developer</p>
      </section>

      {/* Post list */}
      <article>
        <ul className="space-y-0">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-gray-100 last:border-b-0">
              <Link
                href={`/posts/${post.slug}`}
                className="block py-8 group"
              >
                {/* Category + Date */}
                <div className="flex items-center gap-3 mb-3">
                  {post.category && (
                    <span className="text-base font-semibold text-blue-500">
                      {post.category}
                    </span>
                  )}
                  <span className="text-base text-gray-400">
                    {dayjs(post.date).format('YYYY-MM-DD')}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-black group-hover:text-blue-500 transition-colors mb-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-base font-medium text-black mb-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-sm text-gray-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
