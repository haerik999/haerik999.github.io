'use client';

import { MDXRemote } from 'next-mdx-remote/rsc';
import React from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-4xl font-bold mt-8 mb-4 text-gray-900 border-b-2 border-blue-200 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-3xl font-bold mt-8 mb-4 text-gray-800 text-blue-600">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-2xl font-bold mt-6 mb-3 text-gray-800">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-lg leading-relaxed mb-4 text-gray-700">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-4 ml-4 text-gray-700 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-4 ml-4 text-gray-700 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-gray-700">{children}</li>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-blue-50 px-2 py-1 rounded text-sm font-mono text-blue-600 border border-blue-200">
      {children}
    </code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => {
    let codeContent = '';
    let language = 'javascript';

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'code') {
        const props = child.props as Record<string, unknown>;
        const className = (props.className as string) || '';
        const match = className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
        codeContent = (props.children as string) || '';
      }
    });

    let highlightedCode = codeContent;
    try {
      highlightedCode = hljs.highlight(codeContent, { language, ignoreIllegals: true }).value;
    } catch (e) {
      highlightedCode = codeContent;
    }

    return (
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm border-l-4 border-blue-400 shadow-lg">
        <code
          className="text-slate-100"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    );
  },
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-700 my-4 bg-blue-50 py-3 rounded-r-lg">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
    >
      {children}
    </a>
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-4xl">
      <MDXRemote source={content} components={components} />
    </div>
  );
}
