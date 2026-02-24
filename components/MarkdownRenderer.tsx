'use client';

import { MDXRemote } from 'next-mdx-remote/rsc';
import React from 'react';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
import { CodeRunner } from './CodeRunner';

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-3xl font-light mt-10 mb-5 text-gray-900 border-b border-gray-200 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-2xl font-light mt-8 mb-4 text-gray-900">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-light mt-6 mb-3 text-gray-800">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm leading-relaxed mb-5 text-gray-700">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-6 ml-2 text-gray-700 space-y-2">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-6 ml-2 text-gray-700 space-y-2">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-gray-700">{children}</li>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800 border border-gray-200">
      {children}
    </code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => {
    let codeContent = '';
    let language = 'javascript';

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const props = child.props as Record<string, unknown>;
        const className = (props.className as string) || '';
        const match = className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
        codeContent = (props.children as string) || '';
      }
    });

    const OUTPUT_SEPARATOR = '---output---';
    const separatorIndex = codeContent.indexOf(OUTPUT_SEPARATOR);

    if (separatorIndex !== -1) {
      const codePart = codeContent.substring(0, separatorIndex).trimEnd();
      const outputPart = codeContent.substring(separatorIndex + OUTPUT_SEPARATOR.length).trimStart();

      let highlightedCode = codePart;
      try {
        highlightedCode = hljs.highlight(codePart, { language, ignoreIllegals: true }).value;
      } catch (e) {
        highlightedCode = codePart;
      }

      return (
        <CodeRunner
          highlightedCode={highlightedCode}
          output={outputPart}
          language={language}
        />
      );
    }

    let highlightedCode = codeContent;
    try {
      highlightedCode = hljs.highlight(codeContent, { language, ignoreIllegals: true }).value;
    } catch (e) {
      highlightedCode = codeContent;
    }

    return (
      <pre className="bg-gray-50 text-gray-800 p-4 rounded-lg overflow-x-auto mb-6 text-sm border border-gray-200">
        <code
          className="text-gray-800 font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    );
  },
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full text-sm border-collapse border border-gray-200">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y divide-gray-200">{children}</tbody>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="border-b border-gray-100">{children}</tr>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border border-gray-200">{children}</th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="px-3 py-2 text-sm text-gray-700 border border-gray-200">{children}</td>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-3 border-gray-300 pl-4 italic text-gray-600 my-6 py-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => {
    const isInternal = href?.startsWith('/posts/');
    return (
      <a
        href={href}
        className={isInternal
          ? "text-blue-700 hover:text-blue-500 hover:underline transition-colors"
          : "text-gray-900 hover:text-gray-600 hover:underline transition-colors"
        }
      >
        {children}
      </a>
    );
  },
};

interface MarkdownRendererProps {
  content: string;
  allSlugs?: string[];
}

function processWikiLinks(content: string, allSlugs: string[]): string {
  // First, extract code blocks to protect them from processing
  const codeBlocks: string[] = [];
  let processed = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Also protect inline code
  const inlineCode: string[] = [];
  processed = processed.replace(/`[^`]+`/g, (match) => {
    inlineCode.push(match);
    return `__INLINE_CODE_${inlineCode.length - 1}__`;
  });

  // Process [[slug]] and [[slug|display text]]
  processed = processed.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, slug, displayText) => {
    const trimmedSlug = slug.trim();
    const display = displayText?.trim() || trimmedSlug;
    if (allSlugs.includes(trimmedSlug)) {
      return `[${display}](/posts/${trimmedSlug})`;
    }
    // Dead link - render as strikethrough red text
    return `~~${display}~~`;
  });

  // Restore inline code
  processed = processed.replace(/__INLINE_CODE_(\d+)__/g, (_, i) => inlineCode[Number(i)]);

  // Restore code blocks
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[Number(i)]);

  return processed;
}

export function MarkdownRenderer({ content, allSlugs = [] }: MarkdownRendererProps) {
  const processedContent = processWikiLinks(content, allSlugs);
  return (
    <div className="prose prose-lg max-w-4xl">
      <MDXRemote
        source={processedContent}
        components={components}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
    </div>
  );
}
