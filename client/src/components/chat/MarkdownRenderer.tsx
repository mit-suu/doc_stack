'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '../ui/Icon';

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-black/15 dark:border-white/10 bg-[#0b101b] dark:bg-[#070b14] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.08] text-[12px] font-label-mono text-outline">
        <span className="text-cyan-400 font-semibold uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          title="Sao chép mã nguồn"
        >
          <Icon name={copied ? 'check' : 'content_copy'} className="text-[14px]" />
          <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-label-mono leading-relaxed text-[#e2e8f0] scrollbar-thin scrollbar-thumb-white/10">
        <code>{value}</code>
      </pre>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
}) => {
  return (
    <div className="markdown-content text-on-surface leading-relaxed font-body-lg text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-on-surface mt-5 mb-3 pb-2 border-b border-black/[0.08] dark:border-white/[0.08]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-on-surface mt-4 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full inline-block" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-primary mt-3.5 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-on-surface mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-on-surface/95">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5 text-on-surface/95">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5 text-on-surface/95">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 marker:text-primary">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-on-surface text-primary-fixed-variant">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-4 border-primary/70 bg-primary/[0.03] dark:bg-primary/[0.08] py-2 pr-3 rounded-r-xl italic text-on-surface-variant">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-black/[0.03] dark:bg-white/[0.05] border-b border-black/10 dark:border-white/10 text-on-surface font-semibold font-label-md">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-semibold text-on-surface">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-on-surface-variant">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline inline-flex items-center gap-0.5"
            >
              <span>{children}</span>
              <Icon name="open_in_new" className="text-[12px] inline-block" />
            </a>
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlock
                  language={match ? match[1] : undefined}
                  value={codeString}
                />
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-fixed font-label-mono text-[13px] border border-primary/20 font-semibold"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-2.5 h-4.5 ml-1.5 bg-primary animate-pulse rounded-xs align-middle shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
      )}
    </div>
  );
};
