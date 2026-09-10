/**
 * AI Action Logger Utility
 * Định dạng visual nổi bật cho các hoạt động AI trong DocStack:
 * - ⚡ Embedding Generation
 * - 🔍 RAG Vector Search & Retrieval
 * - 💬 AI Chat & Streaming
 * - 📄 Document Processing & Chunking
 */

// Mã màu ANSI terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  bgMagenta: '\x1b[45m\x1b[37m',
  bgBlue: '\x1b[44m\x1b[37m',
  bgCyan: '\x1b[46m\x1b[30m',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(str: string, maxLen = 80): string {
  if (!str) return '';
  const clean = str.replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

export const aiLogger = {
  /**
   * Log khi sinh Vector Embedding
   */
  embedding(info: {
    mode: 'single' | 'batch';
    count: number;
    model: string;
    durationMs: number;
    sampleText?: string;
    error?: string;
  }) {
    const time = new Date().toLocaleTimeString('vi-VN');
    const { mode, count, model, durationMs, sampleText, error } = info;

    console.log('');
    console.log(
      `${colors.bgBlue}${colors.bold} ⚡ [AI ACTION: EMBEDDING] ${colors.reset} ${colors.dim}${time}${colors.reset}`
    );
    console.log(`  ${colors.bold}Chế độ:${colors.reset}    ${mode === 'single' ? '1 đoạn văn bản' : `Batch (${count} đoạn)`}`);
    console.log(`  ${colors.bold}Model:${colors.reset}     ${colors.cyan}${model}${colors.reset}`);
    console.log(`  ${colors.bold}Thời gian:${colors.reset} ${colors.yellow}${formatDuration(durationMs)}${colors.reset}`);

    if (sampleText) {
      console.log(`  ${colors.bold}Nội dung:${colors.reset}  ${colors.dim}"${truncate(sampleText, 70)}"${colors.reset}`);
    }

    if (error) {
      console.log(`  ${colors.bold}${colors.red}Lỗi:${colors.reset}       ${colors.red}${error}${colors.reset}`);
    } else {
      console.log(`  ${colors.bold}Trạng thái:${colors.reset} ${colors.green}✅ Thành công${colors.reset}`);
    }
    console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);
  },

  /**
   * Log khi thực hiện RAG Vector Search & Retrieval
   */
  retrieval(info: {
    query: string;
    topK: number;
    filterDocId?: string;
    resultsCount: number;
    topScore?: number;
    sources?: string[];
    durationMs: number;
    error?: string;
  }) {
    const time = new Date().toLocaleTimeString('vi-VN');
    const { query, topK, filterDocId, resultsCount, topScore, sources, durationMs, error } = info;

    console.log('');
    console.log(
      `${colors.bgMagenta}${colors.bold} 🔍 [AI ACTION: RAG RETRIEVAL] ${colors.reset} ${colors.dim}${time}${colors.reset}`
    );
    console.log(`  ${colors.bold}Truy vấn:${colors.reset}  ${colors.cyan}"${truncate(query, 75)}"${colors.reset}`);
    console.log(`  ${colors.bold}Top-K:${colors.reset}     Yêu cầu ${topK} | Tìm thấy ${colors.green}${resultsCount}${colors.reset} đoạn khớp`);

    if (filterDocId) {
      console.log(`  ${colors.bold}Lọc DocId:${colors.reset} ${colors.dim}${filterDocId}${colors.reset}`);
    }

    if (topScore !== undefined && resultsCount > 0) {
      const pct = (topScore * 100).toFixed(1);
      console.log(`  ${colors.bold}Top Score:${colors.reset} ${colors.green}${pct}% độ tương đồng vector${colors.reset}`);
    }

    if (sources && sources.length > 0) {
      const uniqueSources = Array.from(new Set(sources));
      console.log(`  ${colors.bold}Nguồn docs:${colors.reset} ${colors.dim}${uniqueSources.slice(0, 3).join(', ')}${uniqueSources.length > 3 ? ` (+${uniqueSources.length - 3})` : ''}${colors.reset}`);
    }

    console.log(`  ${colors.bold}Thời gian:${colors.reset}  ${colors.yellow}${formatDuration(durationMs)}${colors.reset}`);

    if (error) {
      console.log(`  ${colors.bold}${colors.red}Lỗi:${colors.reset}       ${colors.red}${error}${colors.reset}`);
    }
    console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);
  },

  /**
   * Log khi AI phản hồi chat (Streaming hoặc Non-streaming)
   */
  chat(info: {
    query: string;
    model: string;
    stream: boolean;
    chunksInjected: number;
    citationsCount: number;
    answerPreview?: string;
    answerLength?: number;
    durationMs: number;
    error?: string;
  }) {
    const time = new Date().toLocaleTimeString('vi-VN');
    const {
      query,
      model,
      stream,
      chunksInjected,
      citationsCount,
      answerPreview,
      answerLength,
      durationMs,
      error,
    } = info;

    console.log('');
    console.log(
      `${colors.bgCyan}${colors.bold} 💬 [AI ACTION: CHAT GENERATION] ${colors.reset} ${colors.dim}${time}${colors.reset}`
    );
    console.log(`  ${colors.bold}Câu hỏi:${colors.reset}   ${colors.cyan}"${truncate(query, 75)}"${colors.reset}`);
    console.log(`  ${colors.bold}Model:${colors.reset}     ${colors.magenta}${model}${colors.reset} (${stream ? 'SSE Streaming' : 'JSON'})`);
    console.log(
      `  ${colors.bold}RAG Input:${colors.reset} ${chunksInjected} chunks ngữ cảnh -> ${citationsCount} trích dẫn nguồn`
    );

    if (answerLength) {
      console.log(`  ${colors.bold}Độ dài:${colors.reset}    ${answerLength} ký tự (~${Math.round(answerLength / 4)} tokens)`);
    }

    if (answerPreview) {
      console.log(`  ${colors.bold}Phản hồi:${colors.reset}  ${colors.dim}"${truncate(answerPreview, 80)}"${colors.reset}`);
    }

    console.log(`  ${colors.bold}Thời gian:${colors.reset} ${colors.yellow}${formatDuration(durationMs)}${colors.reset}`);

    if (error) {
      console.log(`  ${colors.bold}${colors.red}Lỗi:${colors.reset}      ${colors.red}${error}${colors.reset}`);
    } else {
      console.log(`  ${colors.bold}Trạng thái:${colors.reset}${colors.green} ✅ Phản hồi hoàn tất${colors.reset}`);
    }
    console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);
  },

  /**
   * Log khi Document Processor cắt chunk & nhúng vector cho tài liệu
   */
  document(info: {
    title: string;
    docId: string;
    chunksCount: number;
    durationMs: number;
    error?: string;
  }) {
    const time = new Date().toLocaleTimeString('vi-VN');
    const { title, docId, chunksCount, durationMs, error } = info;

    console.log('');
    console.log(
      `${colors.bgBlue}${colors.bold} 📄 [AI ACTION: DOC PROCESSOR] ${colors.reset} ${colors.dim}${time}${colors.reset}`
    );
    console.log(`  ${colors.bold}Tài liệu:${colors.reset}  ${colors.cyan}"${truncate(title, 70)}"${colors.reset}`);
    console.log(`  ${colors.bold}Doc ID:${colors.reset}    ${colors.dim}${docId}${colors.reset}`);
    console.log(`  ${colors.bold}Chunks:${colors.reset}    ${colors.green}${chunksCount} chunks vector${colors.reset}`);
    console.log(`  ${colors.bold}Thời gian:${colors.reset} ${colors.yellow}${formatDuration(durationMs)}${colors.reset}`);

    if (error) {
      console.log(`  ${colors.bold}${colors.red}Lỗi:${colors.reset}      ${colors.red}${error}${colors.reset}`);
    } else {
      console.log(`  ${colors.bold}Trạng thái:${colors.reset}${colors.green} ✅ Đã nhúng vector thành công${colors.reset}`);
    }
    console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);
  },
};
