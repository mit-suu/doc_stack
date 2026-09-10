import { Request, Response } from 'express';
import { getAllDocPresetsSummary, getDocPresetById } from '../config/docPresets.js';
import { crawlPreset } from '../services/batchCrawler.js';

/**
 * GET /api/presets
 * Lấy danh sách tóm tắt các preset tài liệu có sẵn
 */
export async function getPresetsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const presets = getAllDocPresetsSummary();
    res.status(200).json(presets);
  } catch (error: any) {
    console.error('[Presets Controller] ❌ Lỗi lấy danh sách presets:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi lấy danh sách bộ tài liệu' });
  }
}

/**
 * POST /api/presets/:id/import
 * Kích hoạt tải hàng loạt toàn bộ trang của 1 preset
 */
export async function importPresetHandler(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const presetId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!presetId) {
      res.status(400).json({ error: 'Vui lòng cung cấp mã preset hợp lệ' });
      return;
    }

    const preset = getDocPresetById(presetId);
    if (!preset) {
      res.status(404).json({ error: `Không tìm thấy bộ tài liệu preset với mã: "${presetId}"` });
      return;
    }

    const result = await crawlPreset(presetId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error(`[Presets Controller] ❌ Lỗi khi tải preset ${req.params.id}:`, error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: error.message || 'Lỗi server khi tải tài liệu theo preset',
    });
  }
}
