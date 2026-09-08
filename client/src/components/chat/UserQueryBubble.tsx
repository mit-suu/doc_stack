import React from 'react';
import { Icon } from '../ui/Icon';
import { UserQueryMessage } from '../../types/chat';

interface UserQueryBubbleProps {
  message: UserQueryMessage;
}

export const UserQueryBubble: React.FC<UserQueryBubbleProps> = ({ message }) => {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] p-space-md sm:p-space-lg rounded-3xl bg-surface-container-high/90 backdrop-blur-xl border border-black/[0.1] dark:border-white/[0.1] shadow-lg">
        {/* Header info */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-5 h-5 rounded-full bg-primary-container text-[11px] font-bold text-on-primary flex items-center justify-center">
            {message.avatarLetter}
          </span>
          <span className="font-label-md text-label-md text-on-surface">
            {message.author}
          </span>
          <span className="font-label-mono text-label-mono text-outline">
            {message.time}
          </span>
        </div>

        {/* Query content */}
        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
          Dựa trên tệp{' '}
          <code className="font-code-inline text-code-inline px-1.5 py-0.5 rounded bg-surface-container-lowest text-secondary border border-black/[0.06] dark:border-transparent">
            {message.attachedDoc}
          </code>
          , hãy đối chiếu cơ chế hoạt động của React Server Components (RSC) với Traditional SSR thông thường. Khi nào thì dùng Server Action thay vì REST Endpoint?
        </p>

        {/* Attachment footer */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
          <Icon name="attachment" className="text-secondary text-[14px]" />
          <span className="font-label-mono text-label-mono text-outline">
            Đã gắn kèm 1 nguồn tài liệu • Mô hình: {message.model}
          </span>
        </div>
      </div>
    </div>
  );
};
