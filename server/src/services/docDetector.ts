/**
 * docDetector.ts
 * Module nhận diện và tra cứu trang tài liệu chính thức theo ngữ cảnh câu hỏi (Query-Specific On-Demand)
 * 
 * Kiến trúc 2 tầng (Fallback Chain):
 * 1. FAST PATH (0ms): Tra cứu VERIFIED_DOCS_CATALOG đã kiểm chứng thủ công — Sync, tức thì.
 * 2. ON-DEMAND SEARCH (~500ms-1s): Dùng Gemini Flash trích xuất Intent + sinh canonical URL + xác minh HTTP HEAD.
 * 
 * Nguyên tắc:
 * 1. Tuyệt đối không bịa đặt link (No Hallucination): Mọi URL đề xuất đều phải qua HTTP HEAD 200 OK.
 * 2. Cào đúng 1 trang URL chi tiết theo từng topic.
 * 3. Nếu không phải câu hỏi lập trình hoặc URL không tồn tại → Trả về null.
 */

import { google, isModalConfigured, modalOpenAIClient, MODAL_CHAT_MODEL } from '../config/ai.js';
import { generateText } from 'ai';
import OpenAI from 'openai';

export interface MissingDocSuggestion {
  technology: string;
  topic: string;
  title: string;
  url: string;
  reason: string;
}

interface VerifiedDocEntry {
  technology: string;
  topic: string;
  title: string;
  url: string;
  keywords: RegExp[];
  reason: string;
}

// ============================================================================
// 1. WHITELIST CÁC TÊN MIỀN DOC CHÍNH THỨC (Trusted Documentation Domains)
// ============================================================================
const OFFICIAL_DOC_DOMAINS: string[] = [
  // JavaScript / TypeScript Ecosystem
  'nextjs.org',
  'react.dev',
  'vuejs.org',
  'angular.dev',
  'angular.io',
  'svelte.dev',
  'nuxt.com',
  'astro.build',
  'remix.run',
  'nodejs.org',
  'deno.land',
  'bun.sh',
  'typescriptlang.org',
  'expressjs.com',
  'nestjs.com',
  'vitejs.dev',
  'webpack.js.org',
  'jestjs.io',
  'vitest.dev',
  'playwright.dev',
  'tanstack.com',
  'trpc.io',
  'prisma.io',
  'sequelize.org',
  'mongoosejs.com',
  'redux.js.org',
  'zustand-demo.pmnd.rs',
  'mobx.js.org',

  // CSS Frameworks
  'tailwindcss.com',
  'getbootstrap.com',
  'chakra-ui.com',
  'mui.com',
  'ant.design',
  'ui.shadcn.com',

  // Mobile
  'docs.flutter.dev',
  'flutter.dev',
  'reactnative.dev',
  'developer.apple.com',
  'developer.android.com',
  'kotlinlang.org',
  'swift.org',

  // Backend & Systems
  'go.dev',
  'doc.rust-lang.org',
  'docs.python.org',
  'docs.djangoproject.com',
  'flask.palletsprojects.com',
  'fastapi.tiangolo.com',
  'laravel.com',
  'symfony.com',
  'rubyonrails.org',
  'ruby-lang.org',
  'spring.io',
  'docs.oracle.com',
  'learn.microsoft.com',
  'dotnet.microsoft.com',
  'elixir-lang.org',
  'erlang.org',

  // DevOps & Infrastructure
  'docs.docker.com',
  'kubernetes.io',
  'www.terraform.io',
  'docs.ansible.com',
  'docs.github.com',
  'docs.gitlab.com',
  'docs.aws.amazon.com',
  'cloud.google.com',
  'docs.microsoft.com',
  'vercel.com',
  'docs.netlify.com',

  // Database
  'www.mongodb.com',
  'docs.mongodb.com',
  'www.postgresql.org',
  'dev.mysql.com',
  'redis.io',
  'www.elastic.co',
  'firebase.google.com',
  'supabase.com',

  // AI / ML
  'platform.openai.com',
  'ai.google.dev',
  'docs.anthropic.com',
  'huggingface.co',
  'pytorch.org',
  'www.tensorflow.org',
  'scikit-learn.org',
  'langchain.com',

  // General Dev
  'developer.mozilla.org',
  'web.dev',
  'graphql.org',
  'grpc.io',
  'www.w3.org',

  // State management
  'riverpod.dev',
  'bloclibrary.dev',
  'pub.dev',
];

// ============================================================================
// 2. VERIFIED DOCS CATALOG — Fast Path (Sync, 0ms)
// ============================================================================
const VERIFIED_DOCS_CATALOG: VerifiedDocEntry[] = [
  // --- NEXT.JS ---
  {
    technology: 'Next.js',
    topic: 'Tổng quan & Kiến trúc (Overview)',
    title: 'Next.js Documentation — Getting Started',
    url: 'https://nextjs.org/docs',
    keywords: [
      /\b(hoạt động như thế nào|tổng quan|là gì|kiến trúc|architecture|how it works|overview|getting started|bắt đầu|giới thiệu|introduction)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến tổng quan, kiến trúc và cách thức hoạt động chung của Next.js.',
  },
  {
    technology: 'Next.js',
    topic: 'Caching & Revalidation',
    title: 'Next.js Caching Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/caching',
    keywords: [
      /\b(caching|catching|cache|catch|revalidate|revalidation|stale-while-revalidate|full route cache|data cache|router cache)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến cơ chế bộ nhớ đệm (Caching) và tái xác thực dữ liệu trong Next.js App Router.',
  },
  {
    technology: 'Next.js',
    topic: 'Server Actions & Mutations',
    title: 'Next.js Mutating Data Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/mutating-data',
    keywords: [
      /\b(server action|server actions|action|mutation|mutations|form action)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến Server Actions và xử lý form mutation trên server của Next.js.',
  },
  {
    technology: 'Next.js',
    topic: 'Routing & Layouts',
    title: 'Next.js Layouts and Pages Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/layouts-and-pages',
    keywords: [
      /\b(routing|route|app router|page router|nested route|dynamic route|layout\.tsx|page\.tsx|slug)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến cấu trúc định tuyến và Layout trong Next.js App Router.',
  },
  {
    technology: 'Next.js',
    topic: 'Proxy & Middleware',
    title: 'Next.js Proxy Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/proxy',
    keywords: [
      /\b(middleware|proxy|redirect|rewrite|nextrequest|nextresponse)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến cơ chế Proxy & Middleware trong Next.js.',
  },
  {
    technology: 'Next.js',
    topic: 'Data Fetching & Streaming',
    title: 'Next.js Fetching Data Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/fetching-data',
    keywords: [
      /\b(data fetching|fetch api|suspense|streaming|ssr|getserversideprops|getstaticprops)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến kỹ thuật lấy dữ liệu (Data Fetching) và truyền dữ liệu streaming trong Next.js.',
  },
  {
    technology: 'Next.js',
    topic: 'Rendering & Components',
    title: 'Next.js Server and Client Components Documentation',
    url: 'https://nextjs.org/docs/app/getting-started/server-and-client-components',
    keywords: [
      /\b(rendering|server component|client component|rsc|use client|use server|hydration)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến mô hình Render (Server Components vs Client Components) của Next.js.',
  },
  {
    technology: 'Next.js',
    topic: 'Image Optimization',
    title: 'Next.js Image Component Documentation',
    url: 'https://nextjs.org/docs/app/building-your-application/optimizing/images',
    keywords: [
      /\b(image optimization|next\/image|next image|tối ưu ảnh|webp|lazy load image)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến component Next Image và tối ưu hóa hình ảnh.',
  },
  {
    technology: 'Next.js',
    topic: 'Authentication & Session',
    title: 'Next.js Authentication Guide Documentation',
    url: 'https://nextjs.org/docs/app/building-your-application/authentication',
    keywords: [
      /\b(authentication|auth|next-auth|nextauth|session|rbac|xác thực)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến các mô hình xác thực (Authentication) và phân quyền trong Next.js.',
  },

  // --- REACT ---
  {
    technology: 'React',
    topic: 'Tổng quan & Học React (Overview)',
    title: 'React Documentation — Learn React',
    url: 'https://react.dev/learn',
    keywords: [
      /\b(react là gì|react hoạt động|tổng quan react|react overview|learn react|getting started react|bắt đầu react|giới thiệu react)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến tổng quan, giới thiệu và cách bắt đầu với React.',
  },
  {
    technology: 'React',
    topic: 'Built-in Hooks',
    title: 'React Built-in Hooks Documentation',
    url: 'https://react.dev/reference/react',
    keywords: [
      /\b(useeffect|usestate|usecontext|usereducer|usecallback|usememo|useref|custom hook|react hook)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến cách sử dụng các Hook tiêu chuẩn trong React.',
  },
  {
    technology: 'React',
    topic: 'React Server Components',
    title: 'React Server Components Reference',
    url: 'https://react.dev/reference/rsc/server-components',
    keywords: [
      /\b(react server component|rsc specification|server function)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến đặc tả và cơ chế hoạt động của React Server Components.',
  },

  // --- TAILWIND CSS ---
  {
    technology: 'Tailwind CSS',
    topic: 'Tổng quan & Utility-First (Overview)',
    title: 'Tailwind CSS Documentation — Utility-First Fundamentals',
    url: 'https://tailwindcss.com/docs/utility-first',
    keywords: [
      /\b(tailwind là gì|tailwind hoạt động|tổng quan tailwind|tailwind overview|tailwind getting started)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến tổng quan và triết lý Utility-First của Tailwind CSS.',
  },
  {
    technology: 'Tailwind CSS',
    topic: 'Dark Mode & Theming',
    title: 'Tailwind CSS Dark Mode Documentation',
    url: 'https://tailwindcss.com/docs/dark-mode',
    keywords: [
      /\b(tailwind dark mode|darkmode tailwind|dark:|theme toggle tailwind)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến thiết lập Dark Mode và giao diện sáng/tối trong Tailwind CSS.',
  },
  {
    technology: 'Tailwind CSS',
    topic: 'Flexbox & Grid Layouts',
    title: 'Tailwind CSS Flexbox & Grid Documentation',
    url: 'https://tailwindcss.com/docs/flex',
    keywords: [
      /\b(tailwind flex|tailwind grid|flex-col|grid-cols|layout tailwind)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến hệ thống bố cục Flexbox và Grid trong Tailwind CSS.',
  },

  // --- DOCKER ---
  {
    technology: 'Docker',
    topic: 'Tổng quan & Getting Started (Overview)',
    title: 'Docker Documentation — Getting Started',
    url: 'https://docs.docker.com/get-started/',
    keywords: [
      /\b(docker là gì|docker hoạt động|tổng quan docker|docker overview|docker getting started)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến tổng quan và cách bắt đầu với Docker.',
  },
  {
    technology: 'Docker',
    topic: 'Docker Compose',
    title: 'Docker Compose Documentation',
    url: 'https://docs.docker.com/compose/',
    keywords: [
      /\b(docker compose|docker-compose|compose\.yaml|compose\.yml|multi-container)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến định nghĩa và quản lý cụm container bằng Docker Compose.',
  },

  // --- FLUTTER ---
  {
    technology: 'Flutter',
    topic: 'Tổng quan & Kiến trúc (Overview)',
    title: 'Flutter Architectural Overview Documentation',
    url: 'https://docs.flutter.dev/resources/architectural-overview',
    keywords: [
      /\b(flutter là gì|flutter hoạt động|tổng quan flutter|flutter overview|flutter getting started|bắt đầu flutter|kiến trúc flutter|cơ chế flutter|flutter ntn|flutter như thế nào)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến tổng quan, kiến trúc và cách thức hoạt động bên dưới của Flutter.',
  },
  {
    technology: 'Flutter',
    topic: 'Widget & UI',
    title: 'Flutter Widget Intro Documentation',
    url: 'https://docs.flutter.dev/ui/widgets-intro',
    keywords: [
      /\b(widget|widgets|wiget|wigets|statefulwidget|statelesswidget|stateful|stateless|flutter ui|widget tree|build method|buildcontext|renderbox|element tree)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến cơ chế Widget và xây dựng giao diện người dùng trong Flutter.',
  },
  {
    technology: 'Flutter',
    topic: 'Layout & Bố cục UI',
    title: 'Flutter Layouts Documentation',
    url: 'https://docs.flutter.dev/ui/layout',
    keywords: [
      /\b(layout|column|row|stack|expanded|flexible|container|center|padding|flutter bố cục|flutter căn lề)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến hệ thống bố cục (Layouts, Column, Row, Stack) trong Flutter.',
  },
  {
    technology: 'Flutter',
    topic: 'State Management',
    title: 'Flutter State Management Documentation',
    url: 'https://docs.flutter.dev/data-and-backend/state-mgmt/simple',
    keywords: [
      /\b(state|state management|provider|riverpod|bloc|cubit|changenotifier|getx|mobx|inheritedwidget)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến quản lý trạng thái (State Management) trong Flutter.',
  },
  {
    technology: 'Flutter',
    topic: 'Navigation & Routing',
    title: 'Flutter Navigation & Routing Documentation',
    url: 'https://docs.flutter.dev/ui/navigation',
    keywords: [
      /\b(navigation|navigator|route|routing|gorouter|go_router|deep link)\b/i,
    ],
    reason: 'Câu hỏi liên quan đến điều hướng và định tuyến trong Flutter.',
  },
];

// ============================================================================
// 3. IN-MEMORY CACHE cho On-Demand Search (TTL: 1 giờ)
// ============================================================================
interface CacheEntry {
  result: MissingDocSuggestion | null;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

function getCachedResult(key: string): MissingDocSuggestion | null | undefined {
  const entry = searchCache.get(key);
  if (!entry) return undefined; // cache miss
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return undefined; // cache expired
  }
  return entry.result;
}

function setCacheResult(key: string, result: MissingDocSuggestion | null): void {
  // Giới hạn cache size tối đa 200 entries
  if (searchCache.size >= 200) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey !== undefined) searchCache.delete(firstKey);
  }
  searchCache.set(key, { result, timestamp: Date.now() });
}

// ============================================================================
// 4. SYNC DETECTION — Fast Path (Tra VERIFIED_DOCS_CATALOG, 0ms)
// ============================================================================

/**
 * Phát hiện tài liệu chính thức còn thiếu dựa trên câu hỏi của người dùng (SYNC — 0ms).
 * Trả về MissingDocSuggestion nếu câu hỏi khớp với trang tài liệu uy tín đã kiểm chứng.
 * Trả về null nếu không khớp → Gọi tiếp detectMissingDocWithSearch() để tìm bằng AI.
 */
export function detectMissingDocSuggestion(query: string): MissingDocSuggestion | null {
  if (!query || typeof query !== 'string') {
    return null;
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Kiểm tra độ dài câu hỏi quá ngắn hoặc chỉ chào hỏi đơn thuần
  if (normalizedQuery.length < 5) {
    return null;
  }

  let defaultTechOverviewEntry: VerifiedDocEntry | null = null;
  let matchedOverviewEntry: VerifiedDocEntry | null = null;

  // Kiểm tra từng entry trong Verified Catalog
  for (const entry of VERIFIED_DOCS_CATALOG) {
    const techName = entry.technology.toLowerCase();
    const isTechMentioned =
      normalizedQuery.includes(techName) ||
      (techName === 'next.js' && (normalizedQuery.includes('nextjs') || normalizedQuery.includes('next js') || normalizedQuery.includes('next 14') || normalizedQuery.includes('next 15'))) ||
      (techName === 'react' && (normalizedQuery.includes('react') || normalizedQuery.includes('reactjs'))) ||
      (techName === 'flutter' && normalizedQuery.includes('flutter')) ||
      (techName === 'docker' && normalizedQuery.includes('docker')) ||
      (techName === 'tailwind css' && (normalizedQuery.includes('tailwind') || normalizedQuery.includes('tailwindcss')));

    if (isTechMentioned && !defaultTechOverviewEntry && entry.topic.includes('Overview')) {
      defaultTechOverviewEntry = entry;
    }

    const hasKeywordMatch = entry.keywords.some((regex) => regex.test(normalizedQuery));

    if (hasKeywordMatch && isTechMentioned) {
      // Ưu tiên cao nhất cho chủ đề cụ thể (Caching, Widget, Routing, State...) trước Overview
      if (!entry.topic.includes('Overview')) {
        return {
          technology: entry.technology,
          topic: entry.topic,
          title: entry.title,
          url: entry.url,
          reason: entry.reason,
        };
      } else if (!matchedOverviewEntry) {
        matchedOverviewEntry = entry;
      }
    }
  }

  // Nếu có khớp từ khóa của Overview
  if (matchedOverviewEntry) {
    return {
      technology: matchedOverviewEntry.technology,
      topic: matchedOverviewEntry.topic,
      title: matchedOverviewEntry.title,
      url: matchedOverviewEntry.url,
      reason: matchedOverviewEntry.reason,
    };
  }

  // Fallback: nếu câu hỏi có nhắc tới công nghệ trong catalog (Flutter, Next.js, React, Docker, Tailwind...)
  // nhưng không khớp chủ đề con cụ thể, tự động trả về trang Overview/Fundamentals chính thức của công nghệ đó!
  if (defaultTechOverviewEntry) {
    return {
      technology: defaultTechOverviewEntry.technology,
      topic: defaultTechOverviewEntry.topic,
      title: defaultTechOverviewEntry.title,
      url: defaultTechOverviewEntry.url,
      reason: `Câu hỏi liên quan đến kiến trúc và cách thức hoạt động của ${defaultTechOverviewEntry.technology}.`,
    };
  }

  // Nếu không khớp với bất kỳ Verified Doc nào → Trả về null
  return null;
}

// ============================================================================
// 5. ASYNC ON-DEMAND SEARCH — Dùng Gemini trích xuất Intent + URL + xác minh
// ============================================================================

/**
 * Kiểm tra một URL có tồn tại thật hay không (HTTP HEAD/GET, timeout 5 giây).
 * Trả về true nếu server phản hồi 200-399 (OK hoặc redirect).
 */
async function verifyUrlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Thử HEAD trước (nhẹ nhất)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'DocStack-Bot/1.0 (URL Verification)',
      },
    });

    clearTimeout(timeout);

    if (response.ok) return true;

    // Một số server không hỗ trợ HEAD → fallback sang GET với range header
    if (response.status === 405 || response.status === 403) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 5000);

      const getResp = await fetch(url, {
        method: 'GET',
        signal: controller2.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'DocStack-Bot/1.0 (URL Verification)',
          'Range': 'bytes=0-100',
        },
      });

      clearTimeout(timeout2);
      return getResp.ok || getResp.status === 206;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra URL có thuộc danh sách tên miền doc chính thức (trusted) hay không.
 */
function isOfficialDocDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return OFFICIAL_DOC_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Regex đơn giản để phát hiện câu hỏi có liên quan đến lập trình / công nghệ hay không.
 * Dùng để lọc các câu hỏi chào hỏi, hỏi thời tiết, hỏi ăn gì... → Không cần gọi Gemini.
 */
const PROGRAMMING_SIGNALS = /\b(code|coding|lập trình|framework|library|thư viện|sdk|api|backend|frontend|database|deploy|devops|server|client|component|module|function|class|hook|state|render|compile|build|debug|test|query|orm|sql|nosql|rest|graphql|grpc|websocket|typescript|javascript|python|java|kotlin|swift|dart|flutter|react|vue|angular|svelte|next\.?js|nuxt|nest\.?js|express|django|fastapi|flask|laravel|spring|docker|kubernetes|k8s|redis|mongodb|postgres|mysql|git|ci\/cd|aws|gcp|azure|vercel|node\.?js|deno|bun|rust|golang|go\b|elixir|ruby|rails|tailwind|bootstrap|css|html|webpack|vite|npm|yarn|pnpm|pip|cargo|pub|gradle|maven|cocoapods|swift|xcode|android studio|riverpod|bloc|provider|zustand|redux|mobx|prisma|mongoose|sequelize|drizzle|trpc|graphql|apollo|relay|tanstack|playwright|jest|vitest|cypress|storybook|figma|mcp|llm|langchain|openai|gemini|claude|hugging\s?face|pytorch|tensorflow|ml|machine learning|deep learning|neural|transformer|embedding|vector|rag|prompt|fine.?tun|gpt|bert|rlhf)\b/i;

/**
 * Phát hiện tài liệu chính thức bằng AI (ASYNC — ~500ms-1s).
 * 
 * Quy trình:
 * 1. Kiểm tra cache → Nếu có kết quả cached, trả về ngay.
 * 2. Kiểm tra câu hỏi có liên quan đến lập trình không → Nếu không, trả null.
 * 3. Gọi Gemini Flash trích xuất { technology, topic, title, url } từ câu hỏi.
 * 4. Kiểm tra URL có thuộc tên miền doc chính thức → Ưu tiên.
 * 5. HTTP HEAD xác minh URL tồn tại thật (200 OK) → Nếu không → null.
 * 6. Lưu cache và trả về MissingDocSuggestion.
 */
export async function detectMissingDocWithSearch(
  query: string
): Promise<MissingDocSuggestion | null> {
  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    return null;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = normalizedQuery;

  // 1. Kiểm tra cache
  const cached = getCachedResult(cacheKey);
  if (cached !== undefined) {
    console.log(`[DocDetector] 📦 Cache hit cho: "${query.slice(0, 50)}"`);
    return cached;
  }

  // 2. Kiểm tra câu hỏi có liên quan đến lập trình không
  if (!PROGRAMMING_SIGNALS.test(normalizedQuery)) {
    console.log(`[DocDetector] ⏭️ Câu hỏi không liên quan lập trình: "${query.slice(0, 50)}"`);
    setCacheResult(cacheKey, null);
    return null;
  }

  // 3. Gọi Modal GLM (hoặc Gemini dự phòng) để trích xuất intent và sinh canonical URL
  try {
    console.log(`[DocDetector] 🔍 On-demand search cho: "${query.slice(0, 80)}"`);

    let rawResponse = '';

    const DOC_SYSTEM_PROMPT = `You are a documentation URL expert. Given a programming question, extract the technology name, specific topic, and return the EXACT official documentation URL.

RULES:
1. Only return URLs from OFFICIAL documentation sites (e.g., nextjs.org/docs, docs.flutter.dev, react.dev, go.dev, etc.)
2. Be as SPECIFIC as possible — link to the exact topic page, not just the homepage.
3. Canonical reference paths:
- Next.js (App Router):
  * Caching: https://nextjs.org/docs/app/getting-started/caching
  * Layouts & Routing: https://nextjs.org/docs/app/getting-started/layouts-and-pages
  * Components & Rendering: https://nextjs.org/docs/app/getting-started/server-and-client-components
  * Data Fetching: https://nextjs.org/docs/app/getting-started/fetching-data
  * Mutating Data: https://nextjs.org/docs/app/getting-started/mutating-data
  * Proxy: https://nextjs.org/docs/app/getting-started/proxy
- Flutter:
  * Overview & Architecture: https://docs.flutter.dev/resources/architectural-overview
  * Widgets & UI: https://docs.flutter.dev/ui/widgets-intro
  * Layouts: https://docs.flutter.dev/ui/layout
  * State Management: https://docs.flutter.dev/data-and-backend/state-mgmt/simple
  * Navigation: https://docs.flutter.dev/ui/navigation
4. Response MUST be valid JSON with exactly these fields: { "technology", "topic", "title", "url" }
5. If you are NOT SURE about the exact URL, still provide your best guess — it will be verified via HTTP check.
6. If the question is NOT about programming/technology at all, return: { "skip": true }
7. Do NOT wrap in markdown code blocks. Return raw JSON only.`;

    if (isModalConfigured) {
      try {
        const modalMessages: OpenAI.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: DOC_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Question: "${query}"\n\nReturn the JSON object with the official documentation URL for this question.`,
          },
        ];

        const completion = await modalOpenAIClient.chat.completions.create({
          model: MODAL_CHAT_MODEL,
          messages: modalMessages,
          temperature: 0.1,
          max_tokens: 300,
        });

        rawResponse = completion.choices[0]?.message?.content || '';
        if (rawResponse.includes('</think>')) {
          rawResponse = rawResponse.split('</think>')[1];
        }
      } catch (mErr: any) {
        console.warn('[DocDetector] ⚠️ Modal GLM failed for doc search, trying fallback:', mErr.message);
      }
    }

    if (!rawResponse) {
      const geminiModel = google(process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash');
      const genResult = await generateText({
        model: geminiModel,
        system: DOC_SYSTEM_PROMPT,
        prompt: `Question: "${query}"

Return the JSON object with the official documentation URL for this question.`,
        temperature: 0.1,
        maxOutputTokens: 300,
      });
      rawResponse = genResult.text;
    }

    // 4. Parse JSON response từ Gemini
    const cleanedResponse = rawResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch {
      console.warn(`[DocDetector] ⚠️ Gemini trả về không phải JSON hợp lệ:`, cleanedResponse.slice(0, 200));
      setCacheResult(cacheKey, null);
      return null;
    }

    // Kiểm tra nếu Gemini báo skip (câu hỏi không liên quan lập trình)
    if (parsed.skip === true) {
      console.log(`[DocDetector] ⏭️ Gemini xác nhận không phải câu hỏi lập trình`);
      setCacheResult(cacheKey, null);
      return null;
    }

    const { technology, topic, title, url } = parsed;

    if (!technology || !topic || !url) {
      console.warn(`[DocDetector] ⚠️ Gemini thiếu trường bắt buộc:`, parsed);
      setCacheResult(cacheKey, null);
      return null;
    }

    // 5. Kiểm tra URL có thuộc tên miền doc chính thức
    const isTrustedDomain = isOfficialDocDomain(url);
    if (!isTrustedDomain) {
      console.warn(`[DocDetector] ⚠️ URL không thuộc tên miền doc chính thức: ${url}`);
      // Vẫn tiếp tục verify, nhưng ghi log cảnh báo
    }

    // 6. HTTP HEAD xác minh URL tồn tại thật
    const urlExists = await verifyUrlExists(url);
    if (!urlExists) {
      console.warn(`[DocDetector] ❌ URL không tồn tại (HEAD check thất bại): ${url}`);
      setCacheResult(cacheKey, null);
      return null;
    }

    // 7. Tạo suggestion và cache
    const suggestion: MissingDocSuggestion = {
      technology: technology,
      topic: topic,
      title: title || `${technology} — ${topic}`,
      url: url,
      reason: `Tài liệu chính thức về ${topic} (${technology}) được tìm thấy tự động.`,
    };

    console.log(`[DocDetector] ✅ Tìm thấy doc chính thức: ${suggestion.title} → ${suggestion.url}`);
    setCacheResult(cacheKey, suggestion);
    return suggestion;
  } catch (err: any) {
    console.error(`[DocDetector] ❌ Lỗi on-demand search:`, err.message);
    setCacheResult(cacheKey, null);
    return null;
  }
}
