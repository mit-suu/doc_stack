export interface DocPreset {
  id: string;
  name: string;
  baseUrl: string;
  urls: string[];
}

export const docPresets: DocPreset[] = [
  {
    id: 'nextjs',
    name: 'Next.js',
    baseUrl: 'https://nextjs.org/docs',
    urls: [
      'https://nextjs.org/docs/app/building-your-application/routing',
      'https://nextjs.org/docs/app/building-your-application/rendering/server-components',
      'https://nextjs.org/docs/app/building-your-application/rendering/client-components',
      'https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations',
      'https://nextjs.org/docs/app/building-your-application/data-fetching/fetching',
      'https://nextjs.org/docs/app/building-your-application/caching',
      'https://nextjs.org/docs/app/building-your-application/routing/middleware',
    ],
  },
  {
    id: 'react',
    name: 'React',
    baseUrl: 'https://react.dev/learn',
    urls: [
      'https://react.dev/learn/thinking-in-react',
      'https://react.dev/learn/describing-the-ui',
      'https://react.dev/learn/adding-interactivity',
      'https://react.dev/learn/managing-state',
      'https://react.dev/learn/escape-hatches',
    ],
  },
  {
    id: 'flutter',
    name: 'Flutter',
    baseUrl: 'https://docs.flutter.dev',
    urls: [
      'https://docs.flutter.dev/get-started/fundamentals/widgets',
      'https://docs.flutter.dev/ui/layout',
      'https://docs.flutter.dev/data-and-backend/state-mgmt/intro',
      'https://docs.flutter.dev/ui/navigation',
      'https://docs.flutter.dev/cookbook',
    ],
  },
  {
    id: 'react-native',
    name: 'React Native',
    baseUrl: 'https://reactnative.dev/docs',
    urls: [
      'https://reactnative.dev/docs/getting-started',
      'https://reactnative.dev/docs/intro-react-native-components',
      'https://reactnative.dev/docs/style',
      'https://reactnative.dev/docs/handling-text-input',
      'https://reactnative.dev/docs/navigation',
    ],
  },
  {
    id: 'tailwindcss',
    name: 'Tailwind CSS',
    baseUrl: 'https://tailwindcss.com/docs',
    urls: [
      'https://tailwindcss.com/docs/installation',
      'https://tailwindcss.com/docs/utility-first',
      'https://tailwindcss.com/docs/responsive-design',
      'https://tailwindcss.com/docs/dark-mode',
      'https://tailwindcss.com/docs/theme',
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    baseUrl: 'https://www.typescriptlang.org/docs',
    urls: [
      'https://www.typescriptlang.org/docs/handbook/2/basic-types.html',
      'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
      'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      'https://www.typescriptlang.org/docs/handbook/2/functions.html',
      'https://www.typescriptlang.org/docs/handbook/2/objects.html',
      'https://www.typescriptlang.org/docs/handbook/2/generics.html',
    ],
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    baseUrl: 'https://www.mongodb.com/docs',
    urls: [
      'https://www.mongodb.com/docs/manual/crud/',
      'https://www.mongodb.com/docs/manual/core/aggregation-pipeline/',
      'https://www.mongodb.com/docs/manual/indexes/',
      'https://www.mongodb.com/docs/manual/core/data-modeling-introduction/',
      'https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/',
    ],
  },
  {
    id: 'sepay',
    name: 'Sepay',
    baseUrl: 'https://docs.sepay.vn',
    urls: [
      'https://docs.sepay.vn/sepay-la-gi.html',
      'https://docs.sepay.vn/tich-hop-webhooks.html',
      'https://docs.sepay.vn/lap-trinh-webhooks.html',
      'https://docs.sepay.vn/tao-qr-code-vietqr-dong.html',
      'https://docs.sepay.vn/gioi-thieu-api.html',
      'https://docs.sepay.vn/tao-api-token.html',
      'https://docs.sepay.vn/api-giao-dich.html',
      'https://docs.sepay.vn/api-tai-khoan-ngan-hang.html',
    ],
  },
];

export function getDocPresets(): DocPreset[] {
  return docPresets;
}

export function getDocPresetById(id: string): DocPreset | undefined {
  return docPresets.find((p) => p.id === id);
}

export function getAllDocPresetsSummary(): { id: string; name: string; urlCount: number }[] {
  return docPresets.map((p) => ({
    id: p.id,
    name: p.name,
    urlCount: p.urls.length,
  }));
}
