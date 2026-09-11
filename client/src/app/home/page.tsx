'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { TopSystemHeader } from '../../components/layout/TopSystemHeader';
import { FrostedWorkspaceBar } from '../../components/layout/FrostedWorkspaceBar';
import { AmbientBackground } from '../../components/layout/AmbientBackground';
import { SourcesCard } from '../../components/sidebar/SourcesCard';
import { RecentSessions } from '../../components/sidebar/RecentSessions';
import { UserQueryBubble } from '../../components/chat/UserQueryBubble';
import { AiResponseCard } from '../../components/chat/AiResponseCard';
import { CitationsCard } from '../../components/chat/CitationsCard';
import { FollowUpPills } from '../../components/chat/FollowUpPills';
import { MissingDocActionCard } from '../../components/chat/MissingDocActionCard';
import { PromptInputBar } from '../../components/chat/PromptInputBar';
import { SettingsModal } from '../../components/ui/SettingsModal';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { PresetDocsDownloader } from '../../components/sidebar/PresetDocsDownloader';
import { Icon } from '../../components/ui/Icon';
import { RecentSession, WorkspaceContext } from '../../types/workspace';
import { IndexedDocument, DocumentStats } from '../../types/document';
import { Citation, UserQueryMessage, AiAnalysisData, MissingDocSuggestion } from '../../types/chat';
import {
  fetchDocuments,
  uploadDocument,
  crawlDocument,
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

export interface ChatTurn {
  id: string;
  userQuery: UserQueryMessage;
  aiAnalysis: AiAnalysisData;
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
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Cuộc trò chuyện nhiều lượt như ChatGPT (Multi-turn conversation thread)
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Tự động cuộn mượt xuống cuối hội thoại khi có tin nhắn mới hoặc đang stream
  useEffect(() => {
    if (chatTurns.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatTurns.length, isStreaming]);

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
    if (doc.sourceType === 'url') type = 'url';
    else if (doc.fileType === 'pdf') type = 'pdf';
    else if (doc.fileType === 'docx') type = 'docx';
    else if (doc.fileType === 'md') type = 'markdown';

    const isSyncing = doc.status === 'processing' || doc.status === 'pending';
    const isFailed = doc.status === 'failed';

    return {
      id: doc._id,
      name: doc.title || doc.originalName || doc.sourceUrl || 'Tài liệu không tên',
      type,
      pages: doc.sourceType === 'url' ? 'Web link' : (doc.fileType?.toUpperCase() || 'FILE'),
      status: isSyncing ? 'syncing' : isFailed ? 'failed' : 'ready',
      progressPercent: isSyncing ? 65 : 100,
      vectorCount: doc.status === 'embedded' ? 15 : 0,
      sourceUrl: doc.sourceUrl,
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
        // Mặc định chọn toàn bộ tài liệu như NotebookLM khi mới tải
        setSelectedDocIds((prev) => (prev.length === 0 ? deduped.map((d) => d.id) : prev));

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
    showToast('Đã bỏ chọn toàn bộ tài liệu (Deselected)');
  };

  // Xóa tài liệu thật từ database
  const handleDeleteDocument = async (doc: IndexedDocument) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.name}" và các vector chunk liên quan không?`)) {
      try {
        // Cập nhật UI ngay lập tức (Optimistic Update)
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id && d.name !== doc.name));
        setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id));
        showToast(`Đã xóa tài liệu: ${doc.name}`);

        await apiDeleteDocument(doc.id);
        await loadDocuments();
      } catch (err: any) {
        showToast(`❌ Lỗi xóa tài liệu: ${err.message}`);
        await loadDocuments();
      }
    }
  };

  // Chọn một phiên chat để xem lại lịch sử đầy đủ các câu hỏi
  const handleSelectSession = async (session: RecentSession) => {
    setActiveSessionId(session.id);
    showToast(`Đang mở phiên: ${session.title}...`);
    try {
      const detail = await fetchSessionDetail(session.id);
      if (detail && detail.messages && detail.messages.length > 0) {
        const reconstructedTurns: ChatTurn[] = [];
        let pendingUserMsg: UserQueryMessage | null = null;

        for (const msg of detail.messages) {
          if (msg.role === 'user') {
            pendingUserMsg = {
              id: msg.id,
              author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
              avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
              time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              queryText: msg.content,
              attachedDoc: 'Phiên trò chuyện đã lưu',
              model: 'GLM-5.3 (Modal)',
            };
          } else if (msg.role === 'assistant' && pendingUserMsg) {
            const mappedCitations: Citation[] = (msg.citations || []).map((c, idx) => ({
              id: `cite-${idx}`,
              sourceFile: c.originalName || c.title || 'Tài liệu',
              reference: `Chunk #${c.chunkIndex + 1} (${(c.score * 100).toFixed(1)}%)`,
              quote: c.snippet,
              accentColor: idx % 2 === 0 ? 'secondary' : 'tertiary',
            }));

            const topScore =
              msg.citations && msg.citations.length > 0
                ? `${(msg.citations[0].score * 100).toFixed(1)}%`
                : '96.0%';

            reconstructedTurns.push({
              id: msg.id || `turn-${reconstructedTurns.length}`,
              userQuery: pendingUserMsg,
              aiAnalysis: {
                title: 'DocStack RAG Assistant',
                vectorSimilarity: topScore,
                executiveSummary: msg.content,
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
                    value: 'GLM-5.3 (Modal)',
                    subtext: 'Dự phòng: Gemini 3.6',
                    type: 'secondary',
                  },
                  {
                    label: 'Atlas Vector Search',
                    value: 'Cosine Index',
                    subtext: '3072 dims (gemini-embedding-001)',
                    type: 'default',
                  },
                ],
              },
            });
            pendingUserMsg = null;
          }
        }

        setChatTurns(reconstructedTurns);
      }
    } catch (err: any) {
      showToast(`❌ Không thể tải chi tiết phiên: ${err.message}`);
    }
  };

  // Bắt đầu một phiên chat mới độc lập (Reset về Welcome State)
  const handleNewSession = () => {
    setActiveSessionId(null);
    setChatTurns([]);
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

  const handleSendPrompt = async (text: string, overrideDocIds?: string[]) => {
    if (!text.trim()) return;

    // Sử dụng overrideDocIds nếu có (ví dụ: khi gửi lại câu hỏi sau khi nạp doc mới)
    const effectiveDocIds = overrideDocIds || selectedDocIds;

    // Xác định tên ngữ cảnh tài liệu để hiển thị footer
    let contextLabel = '0 tài liệu (Bỏ chọn - Deselected)';
    if (effectiveDocIds.length === 1) {
      const matched = documents.find((d) => d.id === effectiveDocIds[0]);
      contextLabel = matched?.name || '1 tài liệu đã chọn';
    } else if (effectiveDocIds.length > 1) {
      contextLabel = `${effectiveDocIds.length} tài liệu đã chọn`;
    }

    const turnId = Date.now().toString();

    // Cập nhật tin nhắn người dùng
    const userMsg: UserQueryMessage = {
      id: `user-${turnId}`,
      author: user?.name ? `${user.name} (Kỹ sư)` : 'Bạn (Kỹ sư hệ thống)',
      avatarLetter: user?.name ? user.name.charAt(0).toUpperCase() : 'U',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      queryText: text.trim(),
      attachedDoc: contextLabel,
      model: 'GLM-5.3 (Modal)',
    };

    const initialAiAnalysis: AiAnalysisData = {
      title: 'DocStack RAG Assistant',
      vectorSimilarity: 'Đang tính toán...',
      executiveSummary: '',
      citations: [],
      missingDocSuggestion: null,
      stats: [
        {
          label: 'Độ tương đồng Vector',
          value: 'Đang tính...',
          subtext: 'Atlas Vector Search',
          type: 'tertiary',
        },
        {
          label: 'Mô hình suy luận',
          value: 'GLM-5.3 (Modal)',
          subtext: 'Dự phòng: Gemini 3.6',
          type: 'secondary',
        },
        {
          label: 'Atlas Vector Search',
          value: 'Cosine Index',
          subtext: '3072 dims',
          type: 'default',
        },
      ],
    };

    // Append turn mới vào danh sách chatTurns (bảo toàn 100% các câu hỏi trước đó!)
    setChatTurns((prev) => [
      ...prev,
      {
        id: turnId,
        userQuery: userMsg,
        aiAnalysis: initialAiAnalysis,
      },
    ]);

    setIsThinking(true);
    setIsStreaming(true);

    try {
      await streamChatMessage(
        text.trim(),
        activeSessionId || undefined,
        effectiveDocIds,
        {
          onMetadata: (meta) => {
            if (meta.sessionId) {
              setActiveSessionId(meta.sessionId);
            }
            const suggestion = meta.missingDocSuggestion || null;

            if (meta.citations !== undefined) {
              const mappedCitations: Citation[] = meta.citations.map((c, idx) => ({
                id: `cite-${idx}`,
                sourceFile: c.originalName || c.title || 'Tài liệu',
                reference: `Chunk #${c.chunkIndex + 1} (${(c.score * 100).toFixed(1)}%)`,
                quote: c.snippet,
                accentColor: idx % 2 === 0 ? 'secondary' : 'tertiary',
              }));

              const isDeselected = effectiveDocIds.length === 0;

              const topScore =
                meta.citations && meta.citations.length > 0
                  ? `${(meta.citations[0].score * 100).toFixed(1)}%`
                  : suggestion
                  ? 'Chờ nạp tài liệu'
                  : isDeselected
                  ? '0%'
                  : 'N/A';

              setChatTurns((prev) =>
                prev.map((turn) => {
                  if (turn.id !== turnId) return turn;
                  return {
                    ...turn,
                    aiAnalysis: {
                      ...turn.aiAnalysis,
                      vectorSimilarity: topScore,
                      citations: mappedCitations,
                      missingDocSuggestion: suggestion,
                      stats: suggestion
                        ? [
                            {
                              label: 'Đề xuất tài liệu',
                              value: suggestion.technology,
                              subtext: suggestion.topic,
                              type: 'tertiary',
                            },
                            {
                              label: 'Trạng thái',
                              value: 'Sẵn sàng nạp vào',
                              subtext: 'Chính chủ Verified',
                              type: 'secondary',
                            },
                            {
                              label: 'Hành động',
                              value: 'Nạp & Giải đáp',
                              subtext: 'Bấm nút nạp ở thẻ bên dưới',
                              type: 'default',
                            },
                          ]
                        : isDeselected
                        ? [
                            {
                              label: 'Độ tương đồng Vector',
                              value: '0%',
                              subtext: '0 tài liệu được chọn',
                              type: 'tertiary',
                            },
                            {
                              label: 'Trạng thái nguồn',
                              value: 'Bỏ chọn (Deselected)',
                              subtext: 'Chưa chọn tài liệu nào',
                              type: 'secondary',
                            },
                            {
                              label: 'Hành động',
                              value: 'Cần chọn tài liệu',
                              subtext: 'Tích chọn tại bảng Nguồn bên trái',
                              type: 'default',
                            },
                          ]
                        : [
                            {
                              label: 'Độ tương đồng Vector',
                              value: topScore,
                              subtext: `${mappedCitations.length} nguồn tham chiếu Atlas`,
                              type: 'tertiary',
                            },
                            {
                              label: 'Mô hình suy luận',
                              value: 'GLM-5.3 (Modal)',
                              subtext: 'Dự phòng: Gemini 3.6',
                              type: 'secondary',
                            },
                            {
                              label: 'Atlas Vector Search',
                              value: 'Cosine Index',
                              subtext: '3072 dims (gemini-embedding-001)',
                              type: 'default',
                            },
                          ],
                    },
                  };
                })
              );
            }
          },
          onToken: (_token, accumulated) => {
            setIsThinking(false);
            setChatTurns((prev) =>
              prev.map((turn) =>
                turn.id === turnId
                  ? {
                      ...turn,
                      aiAnalysis: {
                        ...turn.aiAnalysis,
                        executiveSummary: accumulated,
                      },
                    }
                  : turn
              )
            );
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
      setChatTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                aiAnalysis: {
                  ...turn.aiAnalysis,
                  title: 'Lỗi truy vấn RAG',
                  vectorSimilarity: '0%',
                  executiveSummary: `Không thể hoàn tất phân tích: ${err.message}. Hãy đảm bảo server backend đang hoạt động.`,
                },
              }
            : turn
        )
      );
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

  const handleCrawlUrl = async (url: string) => {
    if (!url || !url.trim()) return;
    showToast('Đang kết nối và cào nội dung từ URL...');
    try {
      const created = await crawlDocument(url.trim());
      showToast(`✅ Đã cào & nhúng vector: ${created.title || url}`);
      await loadDocuments();
      if (created._id) {
        setSelectedDocIds((prev) => [...new Set([...prev, created._id])]);
      }
    } catch (err: any) {
      showToast(`❌ Lỗi crawl URL: ${err.message}`);
      throw err;
    }
  };

  const handleConfirmCrawlSuggestion = async (suggestion: MissingDocSuggestion) => {
    showToast(`Đang kết nối & nạp tài liệu từ: ${suggestion.title}...`);
    try {
      const created = await crawlDocument(suggestion.url);
      showToast(`✅ Đã nạp thành công: ${created.title || suggestion.topic}`);
      await loadDocuments();

      // Lấy câu hỏi cuối cùng của người dùng
      const lastQuery = chatTurns[chatTurns.length - 1]?.userQuery?.queryText;

      // Ẩn thẻ đề xuất sau khi đã nạp
      setChatTurns((prev) =>
        prev.map((turn) => ({
          ...turn,
          aiAnalysis: {
            ...turn.aiAnalysis,
            missingDocSuggestion: null,
          },
        }))
      );

      if (created._id) {
        // CHỈ tick mỗi tài liệu mới nạp (bỏ tick tất cả cái cũ)
        setSelectedDocIds([created._id]);
        showToast(`📌 Đã chọn riêng tài liệu: ${created.title || suggestion.topic}`);

        // Gửi lại câu hỏi trực tiếp với doc IDs mới — truyền thẳng vào hàm, không phụ thuộc state
        if (lastQuery) {
          showToast('🔍 Đang giải đáp dựa trên tài liệu vừa nạp...');
          handleSendPrompt(lastQuery, [created._id]);
        }
      }
    } catch (err: any) {
      showToast(`❌ Lỗi nạp tài liệu: ${err.message}`);
      throw err;
    }
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
            {/* LEFT COLUMN: Sticky Fixed Sidebar with Sources, Preset & Recent Sessions */}
            <aside className="lg:col-span-4 flex flex-col gap-space-md order-2 lg:order-1 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto pr-1 pb-6 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
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
                onCrawlUrl={handleCrawlUrl}
              />

              <PresetDocsDownloader
                onDownloadComplete={async () => {
                  await loadDocuments();
                }}
                showToast={showToast}
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
              {chatTurns.length === 0 ? (
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
                /* Giao diện hiển thị toàn bộ lịch sử các lượt hội thoại (Multi-turn Chat Thread) */
                <div className="flex flex-col gap-8 pb-36">
                  {chatTurns.map((turn, index) => {
                    const isLastTurn = index === chatTurns.length - 1;

                    return (
                      <div key={turn.id} className="flex flex-col gap-space-md">
                        {/* User Query Bubble */}
                        <UserQueryBubble message={turn.userQuery} />

                        {/* DocStack AI Response */}
                        <div className="flex flex-col gap-space-md">
                          {/* AI Header & Key Takeaways Card */}
                          <AiResponseCard
                            title={turn.aiAnalysis.title}
                            vectorSimilarity={turn.aiAnalysis.vectorSimilarity}
                            executiveSummary={turn.aiAnalysis.executiveSummary}
                            stats={turn.aiAnalysis.stats}
                            isLoading={isThinking && isLastTurn && !turn.aiAnalysis.executiveSummary}
                            isStreaming={isStreaming && isLastTurn}
                            onPin={() => showToast('Đã ghim phản hồi này vào danh sách lưu')}
                            onShare={() => showToast('Đã tạo liên kết chia sẻ phản hồi')}
                          />

                          {/* Thẻ xác nhận nạp tài liệu chính thức theo ngữ cảnh (Chiến lược 2) */}
                          {turn.aiAnalysis.missingDocSuggestion && isLastTurn && !isStreaming && (
                            <MissingDocActionCard
                              suggestion={turn.aiAnalysis.missingDocSuggestion}
                              onConfirmCrawl={handleConfirmCrawlSuggestion}
                              onDismiss={() => {
                                setChatTurns((prev) =>
                                  prev.map((t) =>
                                    t.id === turn.id
                                      ? {
                                          ...t,
                                          aiAnalysis: {
                                            ...t.aiAnalysis,
                                            missingDocSuggestion: null,
                                          },
                                        }
                                      : t
                                  )
                                );
                              }}
                            />
                          )}

                          {/* Citations & Verified Document Sources Grid */}
                          {turn.aiAnalysis.citations.length > 0 && (
                            <CitationsCard
                              citations={turn.aiAnalysis.citations}
                              onOpenCitation={handleOpenCitation}
                            />
                          )}

                          {/* Follow-up Suggestions if any (chỉ hiển thị ở lượt cuối cùng) */}
                          {isLastTurn && turn.aiAnalysis.followUpSuggestions && turn.aiAnalysis.followUpSuggestions.length > 0 && (
                            <FollowUpPills
                              suggestions={turn.aiAnalysis.followUpSuggestions}
                              onSelectSuggestion={(text) => handleSendPrompt(text)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Ref để cuộn mượt xuống cuối trang */}
                  <div ref={chatBottomRef} className="h-4" />
                </div>
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
