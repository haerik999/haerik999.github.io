import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { BacklinkInfo } from '@/lib/posts';

interface BacklinkSectionProps {
  backlinks: BacklinkInfo[];
}

export function BacklinkSection({ backlinks }: BacklinkSectionProps) {
  if (backlinks.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-100">
      <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-4">
        <ArrowUpRight size={16} className="text-gray-400" />
        이 글을 참조하는 글
      </h2>
      <div className="space-y-3">
        {backlinks.map(bl => (
          <Link
            key={bl.slug}
            href={`/posts/${bl.slug}`}
            className="block p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <div className="text-base font-medium text-gray-900">{bl.title}</div>
            {bl.excerpt && (
              <div className="text-sm text-gray-400 mt-1 line-clamp-2">{bl.excerpt}</div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
