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
import { ArchitectureTable } from '../../components/chat/ArchitectureTable';
import { CodeSnippetBlock } from '../../components/chat/CodeSnippetBlock';
import { CitationsCard } from '../../components/chat/CitationsCard';
import { FollowUpPills } from '../../components/chat/FollowUpPills';
import { PromptInputBar } from '../../components/chat/PromptInputBar';
import { SettingsModal } from '../../components/ui/SettingsModal';
import {
  mockWorkspace,
  mockSlashPrompts,
  mockUserQuery,
  mockAiAnalysis,
} from '../../mock/homeData';
import { SlashPrompt, RecentSession } from '../../types/workspace';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { Citation, UserQueryMessage, AiAnalysisData } from '../../types/chat';
import {
  fetchDocuments,
  uploadDocument,
  sendChatMessage,
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
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  return `${diffDays} ngày`;
}

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [workspace, setWorkspace] = useState(mockWorkspace);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalCount: 0,
    totalSize: '0 MB',
  });
  const [selectedDoc, setSelectedDoc] = useState<IndexedDocument | null>(null);
  const [slashPrompts] = useState(mockSlashPrompts);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState<UserQueryMessage>(mockUserQuery);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisData>(mockAiAnalysis);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Auth Guard: Chưa đăng nhập sẽ chuyển về /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
        setDocuments(mapped);
        setDocumentStats({
          totalCount: mapped.length,
          totalSize: `${(mapped.length * 0.8).toFixed(1)} MB`,
        });
        setWorkspace((prev) => ({
          ...prev,
          docCount: mapped.length,
          vectorCount: mapped.length * 15,
        }));
      }
    } catch (err: any) {
      console.warn('[DocStack] Không thể kết nối tới backend, sử dụng danh sách mẫu:', err.message);
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
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserSessions();
    }
  }, [isAuthenticated, loadUserSessions]);

  const handleSelectPrompt = (prompt: SlashPrompt) => {
    showToast(`Đã kích hoạt lệnh: ${prompt.command}`);
    handleSendPrompt(prompt.description);
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
            attachedDoc: selectedDoc ? selectedDoc.name : 'Toàn bộ kho tài liệu',
            model: 'gemini-3.6-flash',
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

          setAiAnalysis((prev) => ({
            ...prev,
            title: 'DocStack RAG Assistant',
            vectorSimilarity: mappedCitations.length > 0 ? `${(lastAi.citations![0].score * 100).toFixed(1)}%` : '96.0%',
            executiveSummary: lastAi.content,
            citations: mappedCitations,
          }));
        }
      }
    } catch (err: any) {
      showToast(`❌ Không thể tải chi tiết phiên: ${err.message}`);
    }
  };

  // Bắt đầu một phiên chat mới độc lập
  const handleNewSession = () => {
    setActiveSessionId(null);
    setUserQuery({
      id: `new-${Date.now()}`,
      author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
      avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      queryText: 'Hãy đặt câu hỏi mới cho DocStack AI...',
      attachedDoc: selectedDoc ? selectedDoc.name : 'Toàn bộ kho tài liệu',
      model: 'gemini-3.6-flash',
    });
    setAiAnalysis((prev) => ({
      ...prev,
      title: 'DocStack AI Sẵn Sàng',
      vectorSimilarity: '100%',
      executiveSummary: 'Chào bạn! Đây là phiên làm việc mới của riêng bạn. Hãy nhập câu hỏi kỹ thuật bên dưới để AI tìm kiếm vector từ tài liệu và giải đáp chi tiết.',
      citations: [],
    }));
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

  const handleSelectDocument = (doc: IndexedDocument) => {
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
      showToast(`Đã bỏ chọn bộ lọc tài liệu. Ngữ cảnh: Toàn bộ kho tài liệu`);
    } else {
      setSelectedDoc(doc);
      showToast(`Đã chọn ngữ cảnh giới hạn: ${doc.name}`);
    }
  };

  const handleOpenCitation = (cite: Citation) => {
    showToast(`Mở đoạn trích từ: ${cite.sourceFile}`);
  };

  const handleSendPrompt = async (text: string) => {
    if (!text.trim()) return;

    // Cập nhật khung tin nhắn người dùng
    const userMsg: UserQueryMessage = {
      id: Date.now().toString(),
      author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
      avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      queryText: text,
      attachedDoc: selectedDoc ? selectedDoc.name : 'Toàn bộ kho tài liệu',
      model: 'gemini-3.6-flash',
    };
    setUserQuery(userMsg);
    setIsThinking(true);
    showToast('AI đang tìm kiếm vector và sinh câu trả lời...');

    try {
      const res = await sendChatMessage(text, activeSessionId || undefined, selectedDoc?.id);

      if (res.sessionId) {
        setActiveSessionId(res.sessionId);
      }

      // Tải lại danh sách phiên để cập nhật tiêu đề và tin nhắn mới nhất
      await loadUserSessions();

      const mappedCitations: Citation[] = (res.citations || []).map((c, idx) => ({
        id: `cite-${idx}`,
        sourceFile: c.originalName || c.title || 'Tài liệu',
        reference: `Chunk #${c.chunkIndex + 1} (${(c.score * 100).toFixed(1)}%)`,
        quote: c.snippet,
        accentColor: idx % 2 === 0 ? 'secondary' : 'tertiary',
      }));

      const topScore =
        res.citations && res.citations.length > 0
          ? `${(res.citations[0].score * 100).toFixed(1)}%`
          : '95.2%';

      setAiAnalysis((prev) => ({
        ...prev,
        title: 'DocStack RAG Assistant',
        vectorSimilarity: topScore,
        executiveSummary: res.answer,
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
            subtext: 'Google DeepMind',
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
    } catch (err: any) {
      showToast(`❌ Lỗi truy vấn: ${err.message}`);
      setAiAnalysis((prev) => ({
        ...prev,
        title: 'Lỗi truy vấn RAG',
        vectorSimilarity: '0%',
        executiveSummary: `Không thể hoàn tất phân tích: ${err.message}. Hãy đảm bảo server backend đang chạy tại http://localhost:5000.`,
      }));
    } finally {
      setIsThinking(false);
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
        workspaceId="WORKSPACE_MAIN"
        branchName={workspace.branch}
        onOpenSearch={() => showToast('Nhấn ⌘+K để tìm kiếm nhanh')}
        onToggleSidebar={() => showToast('Thu gọn / Mở bảng điều khiển')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Appearance Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Main Body */}
      <main className="flex-1 pt-14 w-full bg-background relative">
        <div className="flex flex-col w-full relative min-h-full pb-32">
          {/* Ambient Lighting Overlay */}
          <AmbientBackground />

          {/* Frosted Floating Workspace Header */}
          <FrostedWorkspaceBar
            workspace={workspace}
            onOpenRagSettings={() => showToast('Mở bảng cấu hình tham số RAG (Top-K: 4, Chunk: 1000, Model: Gemini 3.6)')}
            onUploadDocument={() => showToast('Kéo thả hoặc chọn tệp từ bảng Tài liệu bên trái')}
          />

          {/* Main Bento Grid Workspace */}
          <div className="w-full max-w-[1440px] mx-auto px-space-md sm:px-space-lg pt-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start relative z-10">
            {/* LEFT COLUMN: Sources, Quick Prompts & Navigation Bento (4 cols on lg) */}
            <aside className="lg:col-span-4 flex flex-col gap-space-md order-2 lg:order-1">
              <SourcesCard
                documents={documents}
                stats={documentStats}
                onSelectDocument={handleSelectDocument}
                onFileSelect={handleFileSelect}
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
              {/* User Query Card */}
              <UserQueryBubble message={userQuery} />

              {/* DocStack AI Response: Full Bento Experience */}
              <div className="flex flex-col gap-space-md">
                {/* Bento Block 1: AI Header & Key Takeaways Card */}
                <AiResponseCard
                  title={aiAnalysis.title}
                  vectorSimilarity={aiAnalysis.vectorSimilarity}
                  executiveSummary={aiAnalysis.executiveSummary}
                  stats={aiAnalysis.stats}
                  isLoading={isThinking}
                  onPin={() => showToast('Đã ghim phản hồi này vào danh sách lưu')}
                  onShare={() => showToast('Đã tạo liên kết chia sẻ phản hồi')}
                />

                {/* Bento Block 2: Comparison Table Grid */}
                <ArchitectureTable
                  title={aiAnalysis.comparisonTable.title}
                  subtitle={aiAnalysis.comparisonTable.subtitle}
                  badge={aiAnalysis.comparisonTable.badge}
                  rows={aiAnalysis.comparisonTable.rows}
                />

                {/* Bento Block 3: Code Implementation Snippet */}
                <CodeSnippetBlock snippet={aiAnalysis.codeSnippet} />

                {/* Bento Block 4: Citations & Verified Document Sources Grid */}
                {aiAnalysis.citations.length > 0 && (
                  <CitationsCard
                    citations={aiAnalysis.citations}
                    onOpenCitation={handleOpenCitation}
                  />
                )}

                {/* Bento Block 5: Follow-up Suggestions */}
                <FollowUpPills
                  suggestions={aiAnalysis.followUpSuggestions}
                  onSelectSuggestion={(text) => handleSendPrompt(text)}
                />
              </div>
            </section>
          </div>

          {/* Floating Apple Spotlight / Dynamic Prompt Input Bar Docked to Right Column */}
          <div className="fixed bottom-6 inset-x-0 mx-auto w-full max-w-[1440px] px-space-md sm:px-space-lg pointer-events-none z-40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Spacer for 4-column sidebar */}
              <div className="hidden lg:block lg:col-span-4" />

              {/* Input bar docked on the 8-column chat side */}
              <div className="lg:col-span-8 pointer-events-auto">
                <PromptInputBar
                  activeContextDoc={selectedDoc ? selectedDoc.name : null}
                  onSendPrompt={handleSendPrompt}
                  onRemoveContext={() => setSelectedDoc(null)}
                  onAttachFile={() => showToast('Chọn hoặc kéo thả tệp từ thanh Tài liệu bên trái')}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
