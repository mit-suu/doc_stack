import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

export interface CrawlResult {
  title: string;
  content: string;
}

/**
 * Kiểm tra xem hostname có phải là địa chỉ nội bộ/private (chống SSRF) hay không
 */
export function isPrivateOrBlockedHost(rawHostname: string): boolean {
  // Chuẩn hoá hostname: chuyển chữ thường, bỏ ngoặc vuông IPv6 nếu có
  const hostname = rawHostname.toLowerCase().replace(/^\[|\]$/g, '').trim();

  // 1. Chặn localhost và các biến thể
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'localhost.localdomain'
  ) {
    return true;
  }

  // 2. Chặn loopback và unspecified IPv6
  if (
    hostname === '::1' ||
    hostname === '::' ||
    hostname.startsWith('fe80:') || // IPv6 link-local
    hostname.startsWith('fc00:') || // IPv6 unique local
    hostname.startsWith('fd00:')
  ) {
    return true;
  }

  // Chặn IPv4-mapped IPv6 (ví dụ: ::ffff:127.0.0.1)
  let ipv4 = hostname;
  if (ipv4.startsWith('::ffff:')) {
    ipv4 = ipv4.replace('::ffff:', '');
  }

  // 3. Kiểm tra nếu hostname là IPv4 dạng x.x.x.x
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipv4.match(ipv4Regex);
  if (match) {
    const [, o1Str, o2Str, o3Str, o4Str] = match;
    const o1 = Number(o1Str);
    const o2 = Number(o2Str);
    const o3 = Number(o3Str);
    const o4 = Number(o4Str);

    // Không hợp lệ theo chuẩn IPv4 (vượt quá 255) coi như chặn
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
      return true;
    }

    // 127.0.0.0/8 (Loopback: 127.0.0.1 -> 127.255.255.255)
    if (o1 === 127) return true;

    // 0.0.0.0/8
    if (o1 === 0) return true;

    // 10.0.0.0/8 (Private IP)
    if (o1 === 10) return true;

    // 172.16.0.0/12 (Private IP: 172.16.0.0 -> 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

    // 192.168.0.0/16 (Private IP)
    if (o1 === 192 && o2 === 168) return true;

    // 169.254.0.0/16 (Link-local & AWS/Cloud Metadata e.g. 169.254.169.254)
    if (o1 === 169 && o2 === 254) return true;
  }

  return false;
}

/**
 * Crawl nội dung HTML từ URL và trích xuất text sạch
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  // 1. Kiểm tra format URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Giao thức URL không hợp lệ (chỉ hỗ trợ http:// hoặc https://)');
    }
  } catch (err: any) {
    throw new Error(`URL không hợp lệ: ${err.message}`);
  }

  // Kiểm tra chống SSRF trước khi gọi axios
  if (isPrivateOrBlockedHost(parsedUrl.hostname)) {
    throw new Error('URL không được phép truy cập');
  }

  // 2. Fetch HTML bằng axios với timeout 10s
  let responseData: string;
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      },
      responseType: 'text',
      maxRedirects: 5,
      beforeRedirect: (options) => {
        if (options.hostname && isPrivateOrBlockedHost(options.hostname)) {
          throw new Error('URL không được phép truy cập');
        }
      },
    });
    responseData = response.data;
  } catch (err: any) {
    if (err.message === 'URL không được phép truy cập') {
      throw err;
    }
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
        throw new Error('Không thể tải URL: Hết thời gian chờ phản hồi (timeout 10s)');
      }
      if (axiosErr.code === 'ENOTFOUND') {
        throw new Error('Không thể tìm thấy tên miền của URL này (máy chủ không tồn tại hoặc lỗi DNS)');
      }
      if (axiosErr.response) {
        throw new Error(`Máy chủ trả về lỗi HTTP ${axiosErr.response.status} (${axiosErr.response.statusText})`);
      }
    }
    throw new Error(`Lỗi kết nối tới URL: ${err.message || err}`);
  }

  // 3. Load HTML với cheerio
  const $ = cheerio.load(responseData);

  // 4. Lấy tiêu đề trước khi loại bỏ các thẻ
  let title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    parsedUrl.hostname + parsedUrl.pathname;

  // 5. Loại bỏ các thẻ rác, không liên quan đến nội dung bài viết
  $(
    'nav, footer, script, style, aside, noscript, iframe, svg, header, form, ' +
    'button, [role="button"], [aria-label*="copy" i], [aria-label*="feedback" i], ' +
    '.feedback, .feedback-widget, .breadcrumbs, .breadcrumb, .toc, .table-of-contents, .theme-edit-this-page'
  ).remove();

  // 6. Ưu tiên lấy vùng nội dung chính: <article> -> <main> -> <body>
  const article = $('article');
  const main = $('main');
  const container = article.length ? article : main.length ? main : $('body');

  const rawText = container.text() || '';

  // 7. Loại bỏ các cụm từ UI rác phổ biến trong trang tài liệu kỹ thuật
  const uiGarbagePatterns = [
    /This page is also available as Markdown:[^\n]+?(\/docs\/llms\.txt|\.md)?[^\n]*/gi,
    /Was this page's content helpful\??/gi,
    /Was this helpful\??/gi,
    /Edit this page on GitHub/gi,
    /Edit this page/gi,
    /Scroll to top/gi,
    /View source\s*or\s*report an issue\.?/gi,
    /\bthumb_up\b/gi,
    /\bthumb_down\b/gi,
    /\bCopy page\b/gi,
    /\bCopy code\b/gi,
    /\bOn this page\b/gi,
    /Previous\s*[A-Z][a-zA-Z0-9\s:-]*Next\s*[A-Z][a-zA-Z0-9\s:-]*/g,
  ];

  let filteredText = rawText;
  for (const pattern of uiGarbagePatterns) {
    filteredText = filteredText.replace(pattern, ' ');
  }

  // 8. Làm sạch text: loại bỏ khoảng trắng thừa, thu gọn các dòng trống liên tiếp
  const lines = filteredText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (line.length === 0) return false;
      const lower = line.toLowerCase();
      // Loại bỏ các dòng độc lập chỉ chứa các nhãn UI
      if (
        lower === 'copy' ||
        lower === 'copy page' ||
        lower === 'copy code' ||
        lower === 'on this page' ||
        lower === 'thumb_up' ||
        lower === 'thumb_down' ||
        lower === 'scroll to top' ||
        lower === 'was this helpful?' ||
        lower === 'was this page\'s content helpful?'
      ) {
        return false;
      }
      return true;
    });

  const cleanContent = lines.join('\n\n');

  if (!cleanContent) {
    throw new Error('Không thể trích xuất nội dung văn bản từ URL được cung cấp');
  }

  return {
    title: title.trim(),
    content: cleanContent,
  };
}

