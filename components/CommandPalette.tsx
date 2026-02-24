'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchIndexItem {
  slug: string;
  title: string;
  category?: string;
  excerpt?: string;
  content?: string;
}

interface SearchResult extends SearchIndexItem {
  score: number;
}

function scoreItem(item: SearchIndexItem, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (item.title.toLowerCase().includes(q)) score += 10;
  if (item.content?.toLowerCase().includes(q)) score += 1;
  return score;
}

// Context

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}

// Provider + Dialog combined

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const [query, setQuery] = useState('');
  const router = useRouter();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  // Load search index once
  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then((data: SearchIndexItem[]) => setIndex(data))
      .catch(() => {});
  }, []);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results: SearchResult[] = query.trim()
    ? index
        .map(item => ({ ...item, score: scoreItem(item, query) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    : index.map(item => ({ ...item, score: 0 }));

  const handleSelect = (slug: string) => {
    close();
    router.push(`/posts/${slug}`);
  };

  return (
    <CommandPaletteContext.Provider value={{ open, close, isOpen }}>
      {children}

      <Command.Dialog
        open={isOpen}
        onOpenChange={val => !val && close()}
        label="Search posts"
        className="fixed inset-0 z-50"
        shouldFilter={false}
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />

        {/* Dialog content */}
        <div className="relative max-w-lg mx-auto mt-[20vh]">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Input row */}
            <div className="flex items-center border-b border-gray-200">
              <Search size={16} className="ml-4 text-gray-400 shrink-0" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search posts..."
                className="w-full px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
              <button
                onClick={close}
                className="mr-3 px-2 py-1 text-xs text-gray-400 border border-gray-200 rounded hover:bg-gray-50 transition-colors shrink-0"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto">
              {query.trim() && results.length === 0 && (
                <div className="px-4 py-8 text-sm text-center text-gray-400">
                  No results found.
                </div>
              )}

              {results.length > 0 && (
                <Command.Group
                  heading="Posts"
                  className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
                >
                  {results.map(item => (
                    <Command.Item
                      key={item.slug}
                      value={`${item.title} ${item.slug}`}
                      onSelect={() => handleSelect(item.slug)}
                      className="px-4 py-3 cursor-pointer data-[selected=true]:bg-gray-100 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.category && <span>{item.category}</span>}
                        {item.category && item.excerpt && <span> &mdash; </span>}
                        {item.excerpt && <span>{item.excerpt}</span>}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </div>
        </div>
      </Command.Dialog>
    </CommandPaletteContext.Provider>
  );
}
