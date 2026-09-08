'use client';

import React, { useState } from 'react';
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
  mockDocumentStats,
  mockIndexedDocuments,
  mockSlashPrompts,
  mockRecentSessions,
  mockUserQuery,
  mockAiAnalysis,
} from '../../mock/homeData';
import { SlashPrompt, RecentSession } from '../../types/workspace';
import { IndexedDocument } from '../../types/document';
import { Citation } from '../../types/chat';

export default function HomePage() {
  const [workspace] = useState(mockWorkspace);
  const [documents] = useState(mockIndexedDocuments);
  const [documentStats] = useState(mockDocumentStats);
  const [slashPrompts] = useState(mockSlashPrompts);
  const [recentSessions] = useState(mockRecentSessions);
  const [userQuery] = useState(mockUserQuery);
  const [aiAnalysis] = useState(mockAiAnalysis);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectPrompt = (prompt: SlashPrompt) => {
    showToast(`Đã kích hoạt lệnh: ${prompt.command}`);
  };

  const handleSelectSession = (session: RecentSession) => {
    showToast(`Mở phiên làm việc: ${session.title}`);
  };

  const handleSelectDocument = (doc: IndexedDocument) => {
    showToast(`Xem tài liệu: ${doc.name}`);
  };

  const handleOpenCitation = (cite: Citation) => {
    showToast(`Mở đoạn trích từ ${cite.sourceFile}`);
  };

  const handleSendPrompt = (text: string) => {
    showToast(`Đã gửi câu hỏi: "${text.slice(0, 30)}..."`);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      showToast(`Đã chọn ${files.length} tệp để nạp vào hệ thống.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-background font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 rounded-xl bg-surface-container-high/90 border border-primary/40 text-on-surface backdrop-blur-xl shadow-xl animate-fade-in text-body-sm font-label-md">
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
            onOpenRagSettings={() => showToast('Mở bảng cấu hình tham số RAG (Top-K, Chunk size, Threshold)')}
            onUploadDocument={() => showToast('Chọn tệp PDF, DOCX hoặc MD để nạp')}
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
                onSelectSession={handleSelectSession}
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
                <CitationsCard
                  citations={aiAnalysis.citations}
                  onOpenCitation={handleOpenCitation}
                />

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
                  activeContextDoc="NextJS_14...pdf"
                  onSendPrompt={handleSendPrompt}
                  onAttachFile={() => showToast('Chọn tệp để đính kèm vào ngữ cảnh hội thoại')}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
