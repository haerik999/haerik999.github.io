import Link from 'next/link';
import { Home } from 'lucide-react';

interface BreadcrumbProps {
  category: string;
}

export function Breadcrumb({ category }: BreadcrumbProps) {
  const parts = category.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-base text-gray-500">
      <Link href="/" className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <Home size={16} />
      </Link>
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-2">
          <span className="text-gray-400">{'>'}</span>
          <span>{part}</span>
        </span>
      ))}
    </nav>
  );
}
