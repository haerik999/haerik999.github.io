'use client';

import { MDXRemote } from 'next-mdx-remote/rsc';
import React from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';

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
      <pre className="bg-gray-50 text-gray-800 p-4 rounded-lg overflow-x-auto mb-6 text-sm border border-gray-200">
        <code
          className="text-gray-800 font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    );
  },
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-3 border-gray-300 pl-4 italic text-gray-600 my-6 py-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="text-gray-900 hover:text-gray-600 hover:underline transition-colors"
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
