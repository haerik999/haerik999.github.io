import Link from 'next/link';
import type { Metadata } from 'next';
import dayjs from 'dayjs';
import { Calendar, Clock } from 'lucide-react';
import { getPostBySlug, getPostSlugs } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const siteURL = 'https://haerik999.github.io';
const siteName = 'Learning Dev';

export function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const postURL = `${siteURL}/posts/${slug}`;

  return {
    title: post.title,
    description:
      post.excerpt ||
      '개발 개념 정리 블로그 - Learning Dev',
    keywords: [post.title, '개발 블로그', '기술 포스트'],
    authors: [{ name: 'haerik999' }],
    openGraph: {
      type: 'article',
      locale: 'ko_KR',
      url: postURL,
      siteName: siteName,
      title: post.title,
      description:
        post.excerpt ||
        '개발 개념 정리 블로그 - Learning Dev',
      publishedTime: post.date,
      authors: ['haerik999'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description:
        post.excerpt ||
        '개발 개념 정리 블로그 - Learning Dev',
    },
    alternates: {
      canonical: postURL,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '개발 개념 정리 글',
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: 'haerik999',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Learning Dev',
      url: siteURL,
    },
    url: `${siteURL}/posts/${slug}`,
    inLanguage: 'ko-KR',
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
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
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
              <span className="px-2 py-1 bg-gray-50 rounded text-gray-600">
                {post.category}
              </span>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <time dateTime={post.date}>
                  {dayjs(post.date).format('YYYY년 M월 D일')}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{post.readTime}분 읽음</span>
              </div>
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
