import type { Metadata } from 'next';
import dayjs from 'dayjs';
import { Calendar, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getPostBySlug, getPostSlugs, getAllPosts, buildBacklinkMap } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PrevNextNav } from '@/components/PrevNextNav';
import { SearchTrigger } from '@/components/SearchTrigger';
import { BacklinkSection } from '@/components/BacklinkSection';

const siteURL = 'https://haerik999.github.io';
const siteName = 'Haerik';

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getPostSlugs();
  if (slugs.length === 0) return [{ slug: '__placeholder' }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === '__placeholder') return { title: 'No posts' };
  const post = getPostBySlug(slug);

  const postURL = `${siteURL}/posts/${slug}`;

  return {
    title: post.title,
    description:
      post.excerpt ||
      '개발 개념 정리 블로그 - Haerik',
    keywords: [post.title, ...post.tags, '개발 위키', '기술 포스트'],
    authors: [{ name: 'haerik999' }],
    openGraph: {
      type: 'article',
      locale: 'ko_KR',
      url: postURL,
      siteName: siteName,
      title: post.title,
      description:
        post.excerpt ||
        '개발 개념 정리 블로그 - Haerik',
      publishedTime: post.date,
      authors: ['haerik999'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description:
        post.excerpt ||
        '개발 개념 정리 블로그 - Haerik',
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
  if (slug === '__placeholder') notFound();
  const post = getPostBySlug(slug);

  const allSlugs = getPostSlugs();

  const allPosts = getAllPosts();
  const backlinkMap = buildBacklinkMap();
  const backlinks = backlinkMap[slug] || [];
  const sameCategoryPosts = allPosts
    .filter(p => (p.category || 'General') === (post.category || 'General'))
    .sort((a, b) => a.title.localeCompare(b.title));
  const currentIndex = sameCategoryPosts.findIndex(p => p.slug === slug);
  const prevPost = currentIndex > 0
    ? { slug: sameCategoryPosts[currentIndex - 1].slug, title: sameCategoryPosts[currentIndex - 1].title }
    : null;
  const nextPost = currentIndex < sameCategoryPosts.length - 1
    ? { slug: sameCategoryPosts[currentIndex + 1].slug, title: sameCategoryPosts[currentIndex + 1].title }
    : null;

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
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
      name: 'Haerik',
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
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8">
          <Breadcrumb category={post.category || 'General'} />
        </div>

        <article>
          <header className="mb-16 pb-12 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-[32px] font-bold text-gray-900 leading-[1.3]">
                {post.title}
              </h1>
              <SearchTrigger />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-base">
              <span className="px-2 py-1 bg-gray-50 rounded text-gray-600">
                {post.category}
              </span>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
            <MarkdownRenderer content={post.content} allSlugs={allSlugs} />
          </div>

          <PrevNextNav prevPost={prevPost} nextPost={nextPost} />
          <BacklinkSection backlinks={backlinks} />
        </article>
      </div>
    </main>
  );
}
