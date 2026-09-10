import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans, Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-headline',
  subsets: ['latin'],
  weight: ['600', '700'],
});

const geistSans = Geist({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'DocStack - AI-Powered Technical Architecture & RAG Intelligence',
  description:
    'Nền tảng phân tích tài liệu kỹ thuật, RAG vector similarity và đối chiếu kiến trúc thông minh với Google Gemini và DocStack AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`light ${plusJakartaSans.variable} ${geistSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
