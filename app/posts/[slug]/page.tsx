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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-8 transition-colors"
        >
          ← 돌아가기
        </Link>

        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <header className="mb-8 pb-8 border-b border-gray-200">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} />
                <time dateTime={post.date}>
                  {dayjs(post.date).format('YYYY년 M월 D일')}
                </time>
              </div>
            </header>

            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={post.content} />
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
