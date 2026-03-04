import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PrevNextNavProps {
  prevPost: { slug: string; title: string } | null;
  nextPost: { slug: string; title: string } | null;
}

export function PrevNextNav({ prevPost, nextPost }: PrevNextNavProps) {
  if (!prevPost && !nextPost) return null;

  return (
    <div className="border-t border-gray-100 pt-8 mt-16 flex justify-between">
      <div className="max-w-[45%]">
        {prevPost && (
          <Link
            href={`/posts/${prevPost.slug}`}
            className="flex items-center gap-1 text-base text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} className="flex-shrink-0" />
            <span className="truncate">이전: {prevPost.title}</span>
          </Link>
        )}
      </div>
      <div className="max-w-[45%]">
        {nextPost && (
          <Link
            href={`/posts/${nextPost.slug}`}
            className="flex items-center gap-1 text-base text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="truncate">다음: {nextPost.title}</span>
            <ChevronRight size={16} className="flex-shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
