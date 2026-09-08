'use client';

import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { CodeSnippet } from '../../types/chat';

interface CodeSnippetBlockProps {
  snippet: CodeSnippet;
}

export const CodeSnippetBlock: React.FC<CodeSnippetBlockProps> = ({ snippet }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl backdrop-blur-xl bg-surface-container-lowest/90 dark:bg-surface-container-lowest/80 border border-black/[0.1] dark:border-white/[0.08] overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.1)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Code Block Header */}
      <div className="px-space-md py-space-xs bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="font-label-mono text-label-mono text-outline ml-2">
            {snippet.filePath}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label-mono text-label-mono px-2 py-0.5 rounded bg-primary-container/20 dark:bg-primary-container/30 text-primary font-medium">
            {snippet.language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-outline hover:text-on-surface font-label-mono text-label-mono transition-colors cursor-pointer"
          >
            <Icon name={copied ? 'check' : 'copy_all'} className="text-[15px]" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Syntax View */}
      <pre className="p-space-md font-code-block text-code-block text-on-surface overflow-x-auto leading-relaxed">
        <code>
          <span className="text-secondary">&apos;use server&apos;</span>
          {'\n\n'}
          <span className="text-primary">import</span> &#123; revalidatePath &#125;{' '}
          <span className="text-primary">from</span>{' '}
          <span className="text-secondary">&apos;next/cache&apos;</span>
          {'\n'}
          <span className="text-primary">import</span> &#123; db &#125;{' '}
          <span className="text-primary">from</span>{' '}
          <span className="text-secondary">&apos;@/lib/db&apos;</span>
          {'\n\n'}
          <span className="text-outline-variant">
            // Server Action: Thực thi an toàn trên Node.js runtime
          </span>
          {'\n'}
          <span className="text-primary">export async function</span>{' '}
          <span className="text-tertiary">updateUserBio</span>(userId:{' '}
          <span className="text-secondary">string</span>, formData: FormData) &#123;
          {'\n'}
          {'  '}
          <span className="text-primary">const</span> bio = formData.get(
          <span className="text-secondary">&apos;bio&apos;</span>){' '}
          <span className="text-primary">as string</span>
          {'\n\n'}
          {'  '}
          <span className="text-outline-variant">
            // Cập nhật trực tiếp DB mà không tạo riêng REST endpoint
          </span>
          {'\n'}
          {'  '}
          <span className="text-primary">await</span> db.user.update(&#123;
          {'\n'}
          {'    '}where: &#123; id: userId &#125;,{'\n'}
          {'    '}data: &#123; bio &#125;{'\n'}
          {'  '}&#125;)
          {'\n\n'}
          {'  '}
          <span className="text-outline-variant">
            // Tự động làm mới cache route mà không cần reload trang
          </span>
          {'\n'}
          {'  '}revalidatePath(
          <span className="text-secondary">&apos;/profile&apos;</span>)
          {'\n'}
          {'  '}
          <span className="text-primary">return</span> &#123; success:{' '}
          <span className="text-tertiary">true</span> &#125;{'\n'}
          &#125;
        </code>
      </pre>
    </div>
  );
};
