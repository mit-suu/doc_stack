'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { TopSystemHeader } from '../../components/layout/TopSystemHeader';
import { FrostedWorkspaceBar } from '../../components/layout/FrostedWorkspaceBar';
import { AmbientBackground } from '../../components/layout/AmbientBackground';
import { SourcesCard } from '../../components/sidebar/SourcesCard';
import { QuickSlashPrompts } from '../../components/sidebar/QuickSlashPrompts';
import { RecentSessions } from '../../components/sidebar/RecentSessions';
import { UserQueryBubble } from '../../components/chat/UserQueryBubble';
import { AiResponseCard } from '../../components/chat/AiResponseCard';
import { CitationsCard } from '../../components/chat/CitationsCard';
import { FollowUpPills } from '../../components/chat/FollowUpPills';
import { PromptInputBar } from '../../components/chat/PromptInputBar';
import { SettingsModal } from '../../components/ui/SettingsModal';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { PresetDocsDownloader } from '../../components/sidebar/PresetDocsDownloader';
import { Icon } from '../../components/ui/Icon';
import { standardSlashPrompts } from '../../constants/slashPrompts';
import { SlashPrompt, RecentSession, WorkspaceContext } from '../../types/workspace';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { Citation, UserQueryMessage, AiAnalysisData } from '../../types/chat';
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument as apiDeleteDocument,
  streamChatMessage,
  fetchSessions,
  fetchSessionDetail,
  deleteSession as apiDeleteSession,
  BackendDocument,
} from '../../services/api';

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Vừa xong';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  return `${diffDays} ngày`;
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [workspace, setWorkspace] = useState<WorkspaceContext>({
    name: 'Kho Tri Thức Kỹ Thuật',
    branch: 'Architecture Workspace',
    activeDocumentsCount: 0,
    isPro: false,
  });

  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalCount: 0,
    totalSize: '0 MB',
  });

  // Chọn nhiều tài liệu (Multi-select)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [slashPrompts] = useState<SlashPrompt[]>(standardSlashPrompts);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Cuộc trò chuyện thực tế (khởi tạo null - không còn mock data)
  const [userQuery, setUserQuery] = useState<UserQueryMessage | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisData | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Auth Guard: Chưa đăng nhập sẽ chuyển về /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cập nhật tên workspace theo người dùng thật
  useEffect(() => {
    if (user?.name) {
      setWorkspace((prev) => ({
        ...prev,
        name: `Không gian của ${user.name}`,
        branch: user.email ? user.email.split('@')[0] : 'Engineer',
      }));
    }
  }, [user]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const mapBackendDocToIndexed = (doc: BackendDocument): IndexedDocument => {
    let type: IndexedDocument['type'] = 'code';
    if (doc.fileType === 'pdf') type = 'pdf';
    else if (doc.fileType === 'docx') type = 'docx';
    else if (doc.fileType === 'md') type = 'markdown';

    const isSyncing = doc.status === 'processing' || doc.status === 'pending';
    const isFailed = doc.status === 'failed';

    return {
      id: doc._id,
      name: doc.title || doc.originalName || 'Tài liệu không tên',
      type,
      pages: doc.sourceType === 'url' ? 'Web crawl' : (doc.fileType?.toUpperCase() || 'FILE'),
      status: isSyncing ? 'syncing' : isFailed ? 'failed' : 'ready',
      progressPercent: isSyncing ? 65 : 100,
      vectorCount: doc.status === 'embedded' ? 15 : 0,
    };
  };

  const loadDocuments = useCallback(async () => {
    try {
      const backendDocs = await fetchDocuments();
      if (backendDocs && Array.isArray(backendDocs)) {
        const mapped = backendDocs.map(mapBackendDocToIndexed);

        // Lọc trùng lặp tài liệu theo name
        const seen = new Set<string>();
        const deduped: IndexedDocument[] = [];
        for (const doc of mapped) {
          const key = doc.name.trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(doc);
          }
        }

        setDocuments(deduped);
        setDocumentStats({
          totalCount: deduped.length,
          totalSize: `${(deduped.length * 0.8).toFixed(1)} MB`,
        });
        setWorkspace((prev) => ({
          ...prev,
          activeDocumentsCount: deduped.length,
          docCount: deduped.length,
          vectorCount: deduped.length * 15,
        }));
      }
    } catch (err: any) {
      console.warn('[DocStack] Lỗi kết nối tới backend để tải tài liệu:', err.message);
    }
  }, []);

  const loadUserSessions = useCallback(async () => {
    try {
      const backendSessions = await fetchSessions();
      if (backendSessions && Array.isArray(backendSessions)) {
        const mapped: RecentSession[] = backendSessions.map((s) => ({
          id: s.id,
          title: s.title,
          preview: s.lastMessage || 'Chưa có tin nhắn...',
          timeAgo: formatRelativeTime(s.updatedAt || s.createdAt),
        }));
        setRecentSessions(mapped);
      }
    } catch (err: any) {
      console.warn('[DocStack] Lỗi tải danh sách phiên của user:', err.message);
    }
  }, []);

  // Tải danh sách tài liệu và phiên chat ban đầu từ Backend
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
      loadUserSessions();
    }
  }, [isAuthenticated, loadDocuments, loadUserSessions]);

  // Chọn/Bỏ chọn một tài liệu (Multi-select)
  const handleToggleDocument = (docId: string) => {
    setSelectedDocIds((prev) => {
      const isSelected = prev.includes(docId);
      const next = isSelected ? prev.filter((id) => id !== docId) : [...prev, docId];

      if (isSelected) {
        showToast(`Đã bỏ chọn 1 tài liệu`);
      } else {
        const docName = documents.find((d) => d.id === docId)?.name || 'tài liệu';
        showToast(`Đã chọn: ${docName}`);
      }
      return next;
    });
  };

  // Chọn toàn bộ tài liệu
  const handleSelectAll = () => {
    setSelectedDocIds(documents.map((d) => d.id));
    showToast(`Đã chọn toàn bộ ${documents.length} tài liệu làm ngữ cảnh`);
  };

  // Bỏ chọn toàn bộ tài liệu
  const handleClearAll = () => {
    setSelectedDocIds([]);
    showToast(`Đã bỏ chọn. Ngữ cảnh: Toàn bộ kho tài liệu của bạn`);
  };

  // Xóa tài liệu thật từ database
  const handleDeleteDocument = async (doc: IndexedDocument) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.name}" và các vector chunk liên quan không?`)) {
      try {
        await apiDeleteDocument(doc.id);
        setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id));
        showToast(`Đã xóa tài liệu: ${doc.name}`);
        await loadDocuments();
      } catch (err: any) {
        showToast(`❌ Lỗi xóa tài liệu: ${err.message}`);
      }
    }
  };

  const handleSelectPrompt = (prompt: SlashPrompt) => {
    showToast(`Đã chọn lệnh: ${prompt.command}`);
    handleSendPrompt(`${prompt.command} ${prompt.description}`);
  };

  // Chọn một phiên chat để xem lại lịch sử
  const handleSelectSession = async (session: RecentSession) => {
    setActiveSessionId(session.id);
    showToast(`Đang mở phiên: ${session.title}...`);
    try {
      const detail = await fetchSessionDetail(session.id);
      if (detail && detail.messages && detail.messages.length > 0) {
        const userMsgs = detail.messages.filter((m) => m.role === 'user');
        const aiMsgs = detail.messages.filter((m) => m.role === 'assistant');

        const lastUser = userMsgs[userMsgs.length - 1];
        const lastAi = aiMsgs[aiMsgs.length - 1];

        if (lastUser) {
          setUserQuery({
            id: lastUser.id,
            author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
            avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
            time: new Date(lastUser.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            queryText: lastUser.content,
            attachedDoc: 'Phiên trò chuyện đã lưu',
            model: 'Gemini 3.6 Flash',
          });
        }

        if (lastAi) {
          const mappedCitations: Citation[] = (lastAi.citations || []).map((c, idx) => ({
            id: `cite-${idx}`,
            sourceFile: c.originalName || c.title || 'Tài liệu',
            reference: `Chunk #${c.chunkIndex + 1} (${(c.score * 100).toFixed(1)}%)`,
            quote: c.snippet,
            accentColor: idx % 2 === 0 ? 'secondary' : 'tertiary',
          }));

          const topScore =
            lastAi.citations && lastAi.citations.length > 0
              ? `${(lastAi.citations[0].score * 100).toFixed(1)}%`
              : '96.0%';

          setAiAnalysis({
            title: 'DocStack RAG Assistant',
            vectorSimilarity: topScore,
            executiveSummary: lastAi.content,
            citations: mappedCitations,
            stats: [
              {
                label: 'Độ tương đồng Vector',
                value: topScore,
                subtext: `${mappedCitations.length} nguồn tham chiếu Atlas`,
                type: 'tertiary',
              },
              {
                label: 'Mô hình suy luận',
                value: 'Gemini 3.6',
                subtext: 'Google DeepMind (Streaming)',
                type: 'secondary',
              },
              {
                label: 'Atlas Vector Search',
                value: 'Cosine Index',
                subtext: '3072 dims (gemini-embedding-001)',
                type: 'default',
              },
            ],
          });
        }
      }
    } catch (err: any) {
      showToast(`❌ Không thể tải chi tiết phiên: ${err.message}`);
    }
  };

  // Bắt đầu một phiên chat mới độc lập (Reset về Welcome State)
  const handleNewSession = () => {
    setActiveSessionId(null);
    setUserQuery(null);
    setAiAnalysis(null);
    showToast('Đã bắt đầu phiên trò chuyện mới');
  };

  // Xóa một phiên chat
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDeleteSession(sessionId);
      showToast('Đã xóa phiên làm việc');
      if (activeSessionId === sessionId) {
        handleNewSession();
      }
      await loadUserSessions();
    } catch (err: any) {
      showToast(`❌ Lỗi xóa phiên: ${err.message}`);
    }
  };

  const handleOpenCitation = (cite: Citation) => {
    const matched = documents.find(
      (d) => d.name === cite.sourceFile || d.id === (cite as any).documentId
    );
    if (matched) {
      setPreviewDocId(matched.id);
      showToast(`Mở xem trước tài liệu: ${matched.name}`);
    } else {
      showToast(`Mở đoạn trích từ: ${cite.sourceFile}`);
    }
  };

  const handleSendPrompt = async (text: string) => {
    if (!text.trim()) return;

    // Xác định tên ngữ cảnh tài liệu để hiển thị footer
    let contextLabel = 'Toàn bộ kho tài liệu';
    if (selectedDocIds.length === 1) {
      const matched = documents.find((d) => d.id === selectedDocIds[0]);
      contextLabel = matched?.name || '1 tài liệu đã chọn';
    } else if (selectedDocIds.length > 1) {
      contextLabel = `${selectedDocIds.length} tài liệu đã chọn`;
    }

    // Cập nhật khung tin nhắn người dùng thuần túy, KHÔNG chèn prefix
    const userMsg: UserQueryMessage = {
      id: Date.now().toString(),
      author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
      avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      queryText: text.trim(),
      attachedDoc: contextLabel,
      model: 'Gemini 3.6 Flash',
    };

    setUserQuery(userMsg);
    setIsThinking(true);
    setIsStreaming(true);

    // Chuẩn bị khung phân tích của AI sẵn sàng nhận luồng dữ liệu streaming thật
    setAiAnalysis({
      title: 'DocStack RAG Assistant',
      vectorSimilarity: 'Đang tính toán...',
      executiveSummary: '',
      citations: [],
      stats: [
        {
          label: 'Độ tương đồng Vector',
          value: 'Đang tính...',
          subtext: 'Atlas Vector Search',
          type: 'tertiary',
        },
        {
          label: 'Mô hình suy luận',
          value: 'Gemini 3.6',
          subtext: 'Google DeepMind (Streaming)',
          type: 'secondary',
        },
        {
          label: 'Atlas Vector Search',
          value: 'Cosine Index',
          subtext: '3072 dims',
          type: 'default',
        },
      ],
    });

    try {
      await streamChatMessage(
        text.trim(),
        activeSessionId || undefined,
        selectedDocIds.length > 0 ? selectedDocIds : undefined,
        {
          onMetadata: (meta) => {
            if (meta.sessionId) {
              setActiveSessionId(meta.sessionId);
            }
            if (meta.citations) {
              const mappedCitations: Citation[] = meta.citations.map((c, idx) => ({
                id: `cite-${idx}`,
                sourceFile: c.originalName || c.title || 'Tài liệu',
                reference: `Chunk #${c.chunkIndex + 1} (${(c.score * 100).toFixed(1)}%)`,
                quote: c.snippet,
                accentColor: idx % 2 === 0 ? 'secondary' : 'tertiary',
              }));

              const topScore =
                meta.citations && meta.citations.length > 0
                  ? `${(meta.citations[0].score * 100).toFixed(1)}%`
                  : 'N/A';

              setAiAnalysis((prev) => ({
                ...(prev || {
                  title: 'DocStack RAG Assistant',
                  executiveSummary: '',
                  stats: [],
                  citations: [],
                }),
                vectorSimilarity: topScore,
                citations: mappedCitations,
                stats: [
                  {
                    label: 'Độ tương đồng Vector',
                    value: topScore,
                    subtext: `${mappedCitations.length} nguồn tham chiếu Atlas`,
                    type: 'tertiary',
                  },
                  {
                    label: 'Mô hình suy luận',
                    value: 'Gemini 3.6',
                    subtext: 'Google DeepMind (Streaming)',
                    type: 'secondary',
                  },
                  {
                    label: 'Atlas Vector Search',
                    value: 'Cosine Index',
                    subtext: '3072 dims (gemini-embedding-001)',
                    type: 'default',
                  },
                ],
              }));
            }
          },
          onToken: (_token, accumulated) => {
            setIsThinking(false);
            setAiAnalysis((prev) => ({
              ...(prev || {
                title: 'DocStack RAG Assistant',
                vectorSimilarity: '95%',
                stats: [],
                citations: [],
              }),
              executiveSummary: accumulated,
            }));
          },
          onComplete: async () => {
            setIsStreaming(false);
            setIsThinking(false);
            await loadUserSessions();
          },
        }
      );
    } catch (err: any) {
      showToast(`❌ Lỗi truy vấn: ${err.message}`);
      setAiAnalysis((prev) => ({
        ...(prev || {
          title: 'Lỗi truy vấn RAG',
          stats: [],
          citations: [],
        }),
        title: 'Lỗi truy vấn RAG',
        vectorSimilarity: '0%',
        executiveSummary: `Không thể hoàn tất phân tích: ${err.message}. Hãy đảm bảo server backend đang hoạt động.`,
      }));
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    showToast(`Đang nạp ${files.length} tệp lên hệ thống DocStack...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        showToast(`Đang xử lý & nhúng vector: ${file.name}...`);
        await uploadDocument(file);
        showToast(`✅ Đã nhúng vector thành công: ${file.name}`);
      } catch (err: any) {
        showToast(`❌ Lỗi tải tệp ${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    await loadDocuments();
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-background font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2.5 rounded-xl bg-surface-container-high/95 border border-primary/40 text-on-surface backdrop-blur-xl shadow-2xl animate-fade-in text-body-sm font-label-md flex items-center gap-2">
          {notification}
        </div>
      )}

      {/* Top Global Fixed Header */}
      <TopSystemHeader
        workspaceId={user?.email ? user.email.split('@')[0].toUpperCase() : 'WORKSPACE'}
        branchName={workspace.name}
        onOpenSearch={() => showToast('Nhấn ⌘+K để tìm kiếm nhanh')}
        onToggleSidebar={() => showToast('Thu gọn / Mở bảng điều khiển')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Appearance Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Document Content & Chunks Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDocId}
        documentId={previewDocId}
        onClose={() => setPreviewDocId(null)}
        isSelectedContext={!!previewDocId && selectedDocIds.includes(previewDocId)}
        onSelectAsContext={(doc) => {
          handleToggleDocument(doc.id);
          setPreviewDocId(null);
        }}
      />

      {/* Main Body */}
      <main className="flex-1 pt-14 w-full bg-background relative">
        <div className="flex flex-col w-full relative min-h-full pb-32">
          {/* Ambient Lighting Overlay */}
          <AmbientBackground />

          {/* Frosted Floating Workspace Header */}
          <FrostedWorkspaceBar
            workspace={workspace}
            onOpenRagSettings={() => showToast('Cấu hình tham số RAG: Top-K 4, Gemini 3.6 Flash, Dimensions 3072')}
            onUploadDocument={() => showToast('Kéo thả hoặc chọn tệp từ bảng Tài liệu bên trái')}
          />

          {/* Main Bento Grid Workspace */}
          <div className="w-full max-w-[1440px] mx-auto px-space-md sm:px-space-lg pt-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start relative z-10">
            {/* LEFT COLUMN: Sources, Quick Prompts & Navigation Bento (4 cols on lg) */}
            <aside className="lg:col-span-4 flex flex-col gap-space-md order-2 lg:order-1">
              <SourcesCard
                documents={documents}
                stats={documentStats}
                selectedDocIds={selectedDocIds}
                onToggleDocument={handleToggleDocument}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                onPreviewDocument={(doc) => setPreviewDocId(doc.id)}
                onDeleteDocument={handleDeleteDocument}
                onFileSelect={handleFileSelect}
              />

              <PresetDocsDownloader
                onDownloadComplete={async () => {
                  await loadDocuments();
                }}
                showToast={showToast}
              />

              <QuickSlashPrompts
                prompts={slashPrompts}
                onSelectPrompt={handleSelectPrompt}
              />

              <RecentSessions
                sessions={recentSessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onDeleteSession={handleDeleteSession}
              />
            </aside>

            {/* RIGHT / MAIN COLUMN: Conversation & Intelligence Bento (8 cols on lg) */}
            <section className="lg:col-span-8 flex flex-col gap-space-lg order-1 lg:order-2">
              {/* Nếu chưa có câu hỏi nào: Hiển thị Welcome Hero State sang trọng */}
              {!userQuery ? (
                <div className="p-space-xl rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_36px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                      <Icon name="auto_awesome" className="text-white text-[24px]" />
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Xin chào, {user?.name || 'Kỹ sư'}!
                      </h2>
                      <p className="text-body-sm text-outline mt-0.5">
                        Trợ lý kiến trúc phần mềm & tra cứu tài liệu kỹ thuật RAG chuẩn xác.
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[12px] font-label-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {documents.length} tài liệu đã index vector sẵn sàng
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[12px] font-label-md">
                      Atlas Vector Search (3072 dims)
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 text-[12px] font-label-md">
                      Gemini 3.6 Flash Streaming
                    </span>
                  </div>

                  {/* Prompt Suggestions Grid */}
                  <div>
                    <h4 className="text-[13px] font-semibold text-on-surface mb-2.5">
                      Gợi ý câu hỏi bắt đầu tra cứu:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          title: 'Tóm lược kiến trúc cốt lõi',
                          desc: 'Tóm tắt các nguyên lý, thành phần chính từ tài liệu của bạn.',
                          cmd: '/giaithich Tóm lược các kiến trúc và khái niệm cốt lõi trong tài liệu',
                        },
                        {
                          title: 'So sánh ưu & nhược điểm',
                          desc: 'Đối chiếu các giải pháp công nghệ, so sánh cơ chế thực thi.',
                          cmd: '/sosanh So sánh ưu và nhược điểm giữa các giải pháp trong tài liệu',
                        },
                        {
                          title: 'Sinh code implementation',
                          desc: 'Tạo mã nguồn mẫu hoàn chỉnh chuẩn TypeScript / framework.',
                          cmd: '/code-mau Sinh code implementation hoàn chỉnh theo tài liệu',
                        },
                        {
                          title: 'Audit an toàn & best practice',
                          desc: 'Rà soát các lỗ hổng bảo mật và đề xuất quy chuẩn triển khai.',
                          cmd: '/audit-security Kiểm tra rủi ro an toàn và các best practice',
                        },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendPrompt(item.cmd)}
                          className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-primary/10 hover:border-primary/40 border border-black/[0.06] dark:border-white/[0.06] text-left transition-all group cursor-pointer"
                        >
                          <p className="text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-outline mt-1 line-clamp-2">
                            {item.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-outline italic pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                    💡 Mẹo: Tích chọn 1 hoặc nhiều tài liệu ở cột trái để giới hạn phạm vi tìm kiếm. Mặc định AI sẽ tìm trên toàn bộ kho tài liệu của bạn.
                  </p>
                </div>
              ) : (
                /* Giao diện khi đã có câu hỏi và câu trả lời */
                <>
                  {/* User Query Card */}
                  <UserQueryBubble message={userQuery} />

                  {/* DocStack AI Response */}
                  {aiAnalysis && (
                    <div className="flex flex-col gap-space-md">
                      {/* AI Header & Key Takeaways Card */}
                      <AiResponseCard
                        title={aiAnalysis.title}
                        vectorSimilarity={aiAnalysis.vectorSimilarity}
                        executiveSummary={aiAnalysis.executiveSummary}
                        stats={aiAnalysis.stats}
                        isLoading={isThinking}
                        isStreaming={isStreaming}
                        onPin={() => showToast('Đã ghim phản hồi này vào danh sách lưu')}
                        onShare={() => showToast('Đã tạo liên kết chia sẻ phản hồi')}
                      />

                      {/* Citations & Verified Document Sources Grid */}
                      {aiAnalysis.citations.length > 0 && (
                        <CitationsCard
                          citations={aiAnalysis.citations}
                          onOpenCitation={handleOpenCitation}
                        />
                      )}

                      {/* Follow-up Suggestions if any */}
                      {aiAnalysis.followUpSuggestions && aiAnalysis.followUpSuggestions.length > 0 && (
                        <FollowUpPills
                          suggestions={aiAnalysis.followUpSuggestions}
                          onSelectSuggestion={(text) => handleSendPrompt(text)}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Floating Dynamic Prompt Input Bar Docked to Right Column */}
          <div className="fixed bottom-6 inset-x-0 mx-auto w-full max-w-[1440px] px-space-md sm:px-space-lg pointer-events-none z-40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Spacer for 4-column sidebar */}
              <div className="hidden lg:block lg:col-span-4" />

              {/* Input bar docked on the 8-column chat side */}
              <div className="lg:col-span-8 pointer-events-auto">
                <PromptInputBar
                  onSendPrompt={handleSendPrompt}
                  onAttachFile={() => showToast('Chọn hoặc kéo thả tệp từ thanh Tài liệu bên trái')}
                  isLoading={isThinking || isStreaming}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
