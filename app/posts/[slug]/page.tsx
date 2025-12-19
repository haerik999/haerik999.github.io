import Link from 'next/link';
import dayjs from 'dayjs';
import { Calendar } from 'lucide-react';
import { getPostBySlug, getPostSlugs } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-12 transition-colors"
        >
          <span>←</span>
          <span>돌아가기</span>
        </Link>

        <article>
          <header className="mb-16 pb-12 border-b border-gray-100">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Calendar size={16} />
              <time dateTime={post.date}>
                {dayjs(post.date).format('YYYY년 M월 D일')}
              </time>
            </div>
          </header>

          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={post.content} />
          </div>
        </article>
      </div>
    </main>
  );
}
