'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { AmbientBackground } from '../../components/layout/AmbientBackground';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Icon } from '../../components/ui/Icon';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, loginWithGoogle, setSession } = useAuth();
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const gsiInitializedRef = useRef(false);

  // Nếu đã đăng nhập thì tự động chuyển tiếp vào /home
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  // Khởi tạo Google Identity Services (GSI)
  useEffect(() => {
    if (typeof window === 'undefined' || !googleClientId) return;
    if (gsiInitializedRef.current) return;

    const initGSI = () => {
      if (window.google?.accounts?.id && !gsiInitializedRef.current) {
        gsiInitializedRef.current = true;
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response?.credential) {
                try {
                  setIsSigningIn(true);
                  setErrorMessage(null);
                  await loginWithGoogle(response.credential);
                } catch (err: any) {
                  setErrorMessage(err.message || 'Đăng nhập Google thất bại');
                  setIsSigningIn(false);
                }
              }
            },
            auto_select: false,
          });

          // Render Google button chính thức nếu container có sẵn
          if (googleBtnContainerRef.current) {
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'filled_black',
              size: 'large',
              type: 'standard',
              shape: 'pill',
              text: 'continue_with',
              width: 340,
            });
          }
        } catch (e: any) {
          console.error('[Google GSI Error]:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGSI();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId, loginWithGoogle]);

  const handleManualGoogleClick = () => {
    setErrorMessage(null);

    if (!googleClientId) {
      setErrorMessage(
        'Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong client/.env.local. Bạn có thể sử dụng nút "Đăng nhập nhanh Test Account" bên dưới để trải nghiệm ngay.'
      );
      return;
    }

    // Sử dụng OAuth2 Token Client popup tiêu chuẩn (không bị lỗi FedCM One Tap prompt)
    if (window.google?.accounts?.oauth2) {
      setIsSigningIn(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setErrorMessage(`Lỗi Google OAuth: ${tokenResponse.error}`);
              setIsSigningIn(false);
              return;
            }
            if (tokenResponse?.access_token) {
              try {
                await loginWithGoogle(tokenResponse.access_token);
              } catch (err: any) {
                setErrorMessage(err.message || 'Đăng nhập Google thất bại');
                setIsSigningIn(false);
              }
            }
          },
          error_callback: (err: any) => {
            console.warn('[Google OAuth Popup Error]:', err);
            setIsSigningIn(false);
            if (err?.type !== 'popup_closed') {
              setErrorMessage(err?.message || 'Cửa sổ đăng nhập Google đã đóng');
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (e: any) {
        console.error(e);
        setIsSigningIn(false);
        setErrorMessage(e.message || 'Không thể mở popup Google');
      }
    } else if (googleBtnContainerRef.current) {
      // Fallback click vào button do Google render
      const btn = googleBtnContainerRef.current.querySelector('div[role=button], iframe') as HTMLElement;
      if (btn) {
        btn.click();
      } else {
        setErrorMessage('Google Sign-in SDK chưa sẵn sàng, vui lòng thử lại sau giây lát.');
      }
    }
  };

  // Nút đăng nhập thử nghiệm (dành cho môi trường dev khi chưa có Google Client ID thật)
  const handleQuickDemoLogin = async () => {
    setIsSigningIn(true);
    try {
      // Gửi mock test credential qua endpoint hoặc tạo session trực tiếp
      const mockUser = {
        id: 'dev_user_' + Date.now(),
        googleId: 'google_oauth_1092837465',
        email: 'engineer@docstack.io',
        name: 'Kỹ sư DocStack',
        picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DocStackEngineer',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      setSession('mock_access_token_docstack_' + Date.now(), mockUser);
      router.push('/home');
    } catch (e: any) {
      setErrorMessage(e.message);
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-body-sm text-outline font-label-mono animate-pulse">
            Đang kiểm tra phiên làm việc...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-background font-body-md text-on-surface px-space-md selection:bg-primary-container selection:text-on-primary-container overflow-hidden">
      {/* Ambient Lighting Overlay */}
      <AmbientBackground />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <ThemeToggle />
      </div>

      {/* Main Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-md p-space-lg sm:p-10 rounded-3xl backdrop-blur-2xl bg-white/80 dark:bg-surface-container-high/70 border border-black/[0.1] dark:border-white/[0.12] shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
        {/* Decorative Glow Ring */}
        <div className="absolute -top-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo & Shark Icon */}
        <div className="flex items-center gap-2 mb-6">
          {!logoError ? (
            <img
              alt="DocStack Shark Logo"
              className="h-10 w-auto object-contain select-none drop-shadow-md"
              src="/shark_icon.png"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_16px_rgba(79,70,229,0.5)]">
              <Icon name="diamond" className="text-white text-[22px]" />
            </div>
          )}
          <span className="font-headline-sm text-2xl tracking-tight select-none">
            <span className="text-slate-900 dark:text-white font-bold">Doc</span>
            <span className="text-primary font-bold ml-[1px]">Stack</span>
          </span>
          <span className="font-label-mono text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 dark:bg-primary-container/30 text-primary border border-primary/20 tracking-widest font-semibold uppercase ml-1">
            PRO
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-headline-sm text-2xl sm:text-[28px] font-bold text-on-surface tracking-tight mb-2">
          Chào mừng trở lại
        </h1>
        <p className="font-body-md text-body-md text-outline max-w-xs mb-8 leading-relaxed">
          Nền tảng RAG Intelligence & Phân tích Kiến trúc Kỹ thuật với Google Gemini.
        </p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full mb-5 p-3.5 rounded-2xl bg-error/10 border border-error/30 text-error text-body-sm font-label-md flex items-start gap-2.5 text-left animate-fade-in">
            <Icon name="error" className="text-[18px] shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hidden GSI Container for rendered button if needed */}
        <div ref={googleBtnContainerRef} className="hidden" />

        {/* Custom Premium "Continue with Google" Button */}
        <button
          onClick={handleManualGoogleClick}
          disabled={isSigningIn}
          className="w-full py-3.5 px-6 rounded-2xl bg-white dark:bg-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.14] border border-black/[0.12] dark:border-white/[0.16] shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 font-label-md text-on-surface transition-all transform active:scale-[0.98] cursor-pointer group disabled:opacity-50"
        >
          {isSigningIn ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span className="font-semibold text-[15px]">
            {isSigningIn ? 'Đang xác thực Google...' : 'Continue with Google'}
          </span>
        </button>

        {/* Demo Fast-Login Option for quick testing */}
        <div className="w-full mt-4">
          <div className="flex items-center gap-2 my-3">
            <div className="h-[1px] bg-black/[0.08] dark:bg-white/[0.08] flex-1" />
            <span className="font-label-mono text-[11px] text-outline uppercase tracking-wider">
              Chế độ thử nghiệm
            </span>
            <div className="h-[1px] bg-black/[0.08] dark:bg-white/[0.08] flex-1" />
          </div>

          <button
            id="quick-demo-login-btn"
            onClick={handleQuickDemoLogin}
            disabled={isSigningIn}
            className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-label-md text-body-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Icon name="bolt" className="text-[16px]" />
            <span>Đăng nhập nhanh Test Account</span>
          </button>
        </div>

        {/* Security & Access Token Badges */}
        <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-outline text-label-mono text-[11px]">
            <Icon name="lock" className="text-[14px] text-tertiary" />
            <span>Xác thực an toàn qua Google OAuth 2.0</span>
          </div>
          <p className="text-outline/70 font-label-mono text-[10px]">
            Chỉ sử dụng Access Token (JWT 7 days) • Không lưu trữ mật khẩu
          </p>
        </div>
      </div>
    </div>
  );
}
