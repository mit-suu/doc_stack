import { IndexedDocument, DocumentStats } from '../types/document';
import { UserQueryMessage, AiAnalysisData } from '../types/chat';
import { SlashPrompt, RecentSession, WorkspaceContext } from '../types/workspace';

export const mockWorkspace: WorkspaceContext = {
  name: 'Không gian Kỹ thuật: v2.4 Architecture',
  branch: 'v2.4 Technical Architecture',
  activeDocumentsCount: 3,
  isPro: true,
};

export const mockDocumentStats: DocumentStats = {
  totalCount: 3,
  totalSize: '2.4 MB',
};

export const mockIndexedDocuments: IndexedDocument[] = [
  {
    id: 'doc-1',
    name: 'NextJS_14_Server_Actions.pdf',
    type: 'pdf',
    pages: 'Trang 1-48',
    vectorCount: 142,
    status: 'ready',
    size: '1.2 MB',
  },
  {
    id: 'doc-2',
    name: 'React_19_Hooks_RFC.docx',
    type: 'docx',
    pages: 'Toàn bộ',
    vectorCount: 98,
    status: 'ready',
    size: '800 KB',
  },
  {
    id: 'doc-3',
    name: 'Flutter_Architecture_v3.pdf',
    type: 'pdf',
    status: 'syncing',
    progressPercent: 86,
    size: '400 KB',
  },
];

export const mockSlashPrompts: SlashPrompt[] = [
  {
    id: 'cmd-1',
    command: '/giaithich',
    description: 'Tóm tắt khái niệm cốt lõi',
    icon: 'insights',
    accentColor: 'text-secondary',
  },
  {
    id: 'cmd-2',
    command: '/sosanh',
    description: 'Đối chiếu ưu & nhược điểm',
    icon: 'compare_arrows',
    accentColor: 'text-tertiary',
  },
  {
    id: 'cmd-3',
    command: '/code-mau',
    description: 'Sinh implementation mẫu',
    icon: 'code_blocks',
    accentColor: 'text-primary',
  },
  {
    id: 'cmd-4',
    command: '/audit-security',
    description: 'Kiểm tra rủi ro bảo mật',
    icon: 'shield',
    accentColor: 'text-secondary-fixed',
  },
];

export const mockRecentSessions: RecentSession[] = [
  {
    id: 'session-1',
    title: 'So sánh Cache Next.js vs Remix',
    preview: 'Revalidation strategies with tag-based purging...',
    timeAgo: '10:24',
    url: '#',
  },
  {
    id: 'session-2',
    title: 'Stripe Webhook Signature Verification',
    preview: 'Bảo vệ replay attack qua timestamp verification...',
    timeAgo: 'Hôm qua',
    url: '#',
  },
];

export const mockUserQuery: UserQueryMessage = {
  id: 'msg-1',
  author: 'Kỹ sư Trưởng',
  avatarLetter: 'U',
  time: '11:02 AM',
  queryText:
    'Dựa trên tệp NextJS_14_Server_Actions.pdf, hãy đối chiếu cơ chế hoạt động của React Server Components (RSC) với Traditional SSR thông thường. Khi nào thì dùng Server Action thay vì REST Endpoint?',
  attachedDoc: 'NextJS_14_Server_Actions.pdf',
  model: 'Claude 3.5 Sonnet',
};

export const mockAiAnalysis: AiAnalysisData = {
  title: 'DocStack AI Phân Tích',
  vectorSimilarity: '96.4%',
  executiveSummary:
    'Theo tài liệu tài liệu chỉ mục trang 14–22, điểm khác biệt mang tính cách mạng của React Server Components (RSC) so với SSR truyền thống là: RSC không bao giờ chuyển code JavaScript của server components về phía client. Toàn bộ quá trình render component tree được mã hóa dưới dạng stream JSON-like payload (RSC wire format), giúp kích thước bundle client tiệm cận mức tối thiểu.',
  stats: [
    {
      label: 'Client Bundle Size',
      value: '-68%',
      subtext: 'so với SSR cũ',
      type: 'tertiary',
    },
    {
      label: 'First Contentful Paint (FCP)',
      value: '0.42s',
      subtext: 'Edge Streaming',
      type: 'secondary',
    },
    {
      label: 'State Loss khi Refetch',
      value: 'Không mất (Preserved)',
      subtext: '',
      type: 'default',
    },
  ],
  comparisonTable: {
    title: 'Bảng so sánh Kiến trúc: RSC vs SSR Truyền thống',
    subtitle: 'Trích xuất từ Chương 3: Next.js 14 App Router Specs',
    badge: 'BẢNG MA TRẬN',
    rows: [
      {
        id: 'row-1',
        criteria: 'JS Bundle gửi về Client',
        rscDetail: '0 KB JS cho các Server Components',
        rscStatus: 'positive',
        ssrDetail: 'Toàn bộ component code cần nạp để Hydration',
        ssrStatus: 'neutral',
      },
      {
        id: 'row-2',
        criteria: 'Quá trình Hydration',
        rscDetail: "Chỉ hydrate các \"Client Component\" lá ('use client')",
        rscStatus: 'neutral',
        ssrDetail: 'Hydrate toàn bộ cây DOM (Toàn trang)',
        ssrStatus: 'neutral',
      },
      {
        id: 'row-3',
        criteria: 'Duy trì Client State khi cập nhật',
        rscDetail: 'Giữ nguyên trạng thái input, focus và scroll',
        rscStatus: 'positive',
        ssrDetail: 'Mất state do re-render toàn cây trang HTML',
        ssrStatus: 'negative',
      },
      {
        id: 'row-4',
        criteria: 'Truy cập trực tiếp DB/Backend',
        rscDetail: 'Truy vấn trực tiếp ORM/DB an toàn trên Server',
        rscStatus: 'lock',
        ssrDetail: 'Thường phải qua các hàm getServerSideProps',
        ssrStatus: 'neutral',
      },
    ],
  },
  codeSnippet: {
    filePath: 'app/actions/update-profile.ts',
    language: 'TypeScript',
    code: `'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

// Server Action: Thực thi an toàn trên Node.js runtime
export async function updateUserBio(userId: string, formData: FormData) {
  const bio = formData.get('bio') as string

  // Cập nhật trực tiếp DB mà không tạo riêng REST endpoint
  await db.user.update({
    where: { id: userId },
    data: { bio }
  })

  // Tự động làm mới cache route mà không cần reload trang
  revalidatePath('/profile')
  return { success: true }
}`,
  },
  citations: [
    {
      id: 'cite-1',
      sourceFile: 'NextJS_14_Server_Actions.pdf',
      reference: '#P18',
      quote:
        '"...Server Actions provide seamless RPC mechanics built directly on React transitions, reducing boilerplate REST route handlers."',
      accentColor: 'secondary',
    },
    {
      id: 'cite-2',
      sourceFile: 'React_19_Hooks_RFC.docx',
      reference: '#Section4',
      quote:
        '"...The `useActionState` hook replaces manual isLoading and error handling patterns when consuming server mutations."',
      accentColor: 'tertiary',
    },
  ],
  followUpSuggestions: [
    'Cách xử lý Optimistic UI với Server Action?',
    'So sánh chi phí Serverless Cold-start',
    'Kiến trúc phân quyền Authentication an toàn',
  ],
};
