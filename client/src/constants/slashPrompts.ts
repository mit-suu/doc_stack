import { SlashPrompt } from '../types/workspace';

export const standardSlashPrompts: SlashPrompt[] = [
  {
    id: 'cmd-1',
    command: '/giaithich',
    description: 'Tóm tắt khái niệm và nguyên lý cốt lõi từ tài liệu',
    icon: 'insights',
    accentColor: 'text-secondary',
  },
  {
    id: 'cmd-2',
    command: '/sosanh',
    description: 'Đối chiếu các phương án kiến trúc, ưu & nhược điểm',
    icon: 'compare_arrows',
    accentColor: 'text-tertiary',
  },
  {
    id: 'cmd-3',
    command: '/code-mau',
    description: 'Sinh code implementation mẫu chuẩn production',
    icon: 'code_blocks',
    accentColor: 'text-primary',
  },
  {
    id: 'cmd-4',
    command: '/audit-security',
    description: 'Đánh giá rủi ro an toàn & bảo mật theo tài liệu',
    icon: 'shield',
    accentColor: 'text-secondary-fixed',
  },
];
