'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface SearchIndexItem {
  slug: string;
  title: string;
  category?: string;
  content?: string;
}

interface SearchResult {
  slug: string;
  title: string;
  category?: string;
  score: number;
}

function scoreItem(item: SearchIndexItem, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (item.title.toLowerCase().includes(q)) score += 10;
  if (item.content?.toLowerCase().includes(q)) score += 1;
  return score;
}

export function SearchBox() {
  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then((data: SearchIndexItem[]) => setIndex(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!value.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      const scored = index
        .map(item => ({ ...item, score: scoreItem(item, value) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setResults(scored);
      setIsOpen(scored.length > 0);
    }, 200);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative px-3 py-2">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search... (Ctrl+K)"
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
        />
      </div>

      {isOpen && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleClose} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            {results.map(result => (
              <Link
                key={result.slug}
                href={`/posts/${result.slug}`}
                onClick={handleClose}
                className="flex flex-col px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <span className="text-sm text-gray-900 truncate">{result.title}</span>
                {result.category && (
                  <span className="text-xs text-gray-400 mt-0.5 truncate">{result.category}</span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
