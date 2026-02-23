'use client';

import React, { useState } from 'react';

type Status = 'idle' | 'running' | 'done';

interface CodeRunnerProps {
  highlightedCode: string;
  output: string;
  language: string;
}

export function CodeRunner({ highlightedCode, output, language }: CodeRunnerProps) {
  const [status, setStatus] = useState<Status>('idle');

  const handleRun = () => {
    setStatus('running');
    setTimeout(() => {
      setStatus('done');
    }, 800);
  };

  const handleClear = () => {
    setStatus('idle');
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="bg-gray-100 flex justify-between items-center px-4 py-2">
        <span className="text-xs text-gray-500 font-mono">{language}</span>
        {status === 'done' ? (
          <button
            onClick={handleClear}
            className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {status === 'running' ? (
              <span className="animate-pulse">Running...</span>
            ) : (
              'Run'
            )}
          </button>
        )}
      </div>

      <div className="bg-gray-50 text-gray-800 p-4 overflow-x-auto text-sm">
        <code
          className="text-gray-800 font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>

      {status === 'done' && (
        <div className="bg-gray-900 text-green-400 p-4 font-mono text-sm">
          <div className="text-gray-500 text-xs mb-2">Output</div>
          <div className="terminal-output" style={{ whiteSpace: 'pre-wrap' }}>
            {output}
          </div>
        </div>
      )}
    </div>
  );
}
