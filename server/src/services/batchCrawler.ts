import { getDocPresetById } from '../config/docPresets.js';
import { crawlUrl } from './urlCrawler.js';
import { createDocument, updateDocument } from '../repositories/documentRepository.js';
import { processDocument } from './documentProcessor.js';

export interface BatchCrawlResult {
  presetId: string;
  presetName: string;
  totalUrls: number;
  succeeded: string[];
  failed: { url: string; error: string }[];
}

/**
 * Service crawl hàng loạt các trang tài liệu theo Preset
 * Xử lý tuần tự có delay, tự động nhúng vector (embedding) cho từng trang
 */
export async function crawlPreset(
  presetId: string,
  userId?: string
): Promise<BatchCrawlResult> {
  const preset = getDocPresetById(presetId);
  if (!preset) {
    const error: any = new Error(`Không tìm thấy bộ tài liệu mẫu (preset) với mã: "${presetId}"`);
    error.statusCode = 404;
    throw error;
  }

  const succeeded: string[] = [];
  const failed: { url: string; error: string }[] = [];

  console.log(`[BatchCrawler] 🚀 Bắt đầu tải preset "${preset.name}" (${preset.urls.length} trang)...`);

  for (let i = 0; i < preset.urls.length; i++) {
    const url = preset.urls[i];
    console.log(`[BatchCrawler] [${i + 1}/${preset.urls.length}] Đang xử lý: ${url}`);

    try {
      // 1. Tạo document pending gắn với userId của người dùng
      const createdDoc = await createDocument({
        title: url,
        sourceType: 'url',
        sourceUrl: url,
        rawText: '',
        status: 'pending',
        userId,
      });

      // 2. Crawl nội dung HTML và làm sạch rác UI
      const { title, content } = await crawlUrl(url);

      // 3. Cập nhật title và rawText vào DB
      await updateDocument(createdDoc._id!, {
        title: title || url,
        rawText: content,
        status: 'ready',
      });

      // 4. Kích hoạt cắt chunk và tạo embedding vector ngay
      try {
        await processDocument(createdDoc._id!.toString());
      } catch (embedErr: any) {
        console.error(`[BatchCrawler] ⚠️ Lỗi khi nhúng vector cho document ${createdDoc._id}:`, embedErr.message);
      }

      console.log(`[BatchCrawler] ✅ Hoàn tất tải & embedding: "${title}" (${url})`);
      succeeded.push(url);
    } catch (err: any) {
      console.error(`[BatchCrawler] ❌ Lỗi khi tải URL "${url}":`, err.message);
      failed.push({
        url,
        error: err.message || 'Lỗi không xác định khi tải trang',
      });
    }

    // Khoảng chờ delay 800ms giữa các request để bảo vệ máy chủ đích và quota Gemini
    if (i < preset.urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  console.log(
    `[BatchCrawler] 🏁 Hoàn thành preset "${preset.name}": ${succeeded.length}/${preset.urls.length} thành công.`
  );

  return {
    presetId: preset.id,
    presetName: preset.name,
    totalUrls: preset.urls.length,
    succeeded,
    failed,
  };
}
