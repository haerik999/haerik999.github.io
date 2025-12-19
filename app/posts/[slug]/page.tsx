import Link from 'next/link';
import dayjs from 'dayjs';
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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-8 inline-block"
        >
          ← 돌아가기
        </Link>

        <article>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-gray-500 mb-12">
            {dayjs(post.date).format('YYYY년 M월 D일')}
          </p>

          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={post.content} />
          </div>
        </article>
      </div>
    </main>
  );
}
