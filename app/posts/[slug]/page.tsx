import type { Metadata } from 'next';
import dayjs from 'dayjs';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPostBySlug, getPostSlugs, getAllPosts, buildBacklinkMap } from '@/lib/posts';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { PrevNextNav } from '@/components/PrevNextNav';
import { BacklinkSection } from '@/components/BacklinkSection';
import { getCategoryTheme, getTopCategory } from '@/lib/category-theme';
import { extractTocHeadings } from '@/lib/markdown';

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
  const topCategory = getTopCategory(post.category);
  const theme = getCategoryTheme(post.category);
  const tocHeadings = extractTocHeadings(post.content);
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
    <main className="py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <article>
        <header className="mb-10">
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200">
            <div className="relative h-[220px] md:h-[320px]">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={`${post.title} cover image`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 960px"
                  priority
                />
              ) : (
                <div className={`relative h-full w-full bg-gradient-to-br ${theme.heroGradientClass}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.7),transparent_45%)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badgeClass}`}>
                  {topCategory}
                </span>
              </div>
            </div>
          </div>

          <div className={`mb-3 text-sm font-semibold uppercase tracking-wide ${theme.accentClass}`}>
            {post.category}
          </div>
          <h1 className="text-[32px] font-bold text-gray-900 leading-[1.3] mb-3">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-gray-500 mb-4 leading-relaxed">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-base text-gray-400">
            {dayjs(post.date).format('YYYY.MM.DD')}
            <span>·</span>
            <span>약 {post.readTime}분</span>
          </div>
        </header>

        {tocHeadings.length > 0 && (
          <section className="mb-10 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 md:p-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-600">목차</h2>
            <ul className="space-y-2">
              {tocHeadings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? 'pl-4' : ''}>
                  <a
                    href={`#${heading.id}`}
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mb-16">
          <MarkdownRenderer content={post.content} allSlugs={allSlugs} />
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-12">
            {post.tags.map(tag => (
              <span key={tag} className="text-sm text-gray-500">#{tag}</span>
            ))}
          </div>
        )}

        <PrevNextNav prevPost={prevPost} nextPost={nextPost} />
        <BacklinkSection backlinks={backlinks} />
      </article>
    </main>
  );
}
