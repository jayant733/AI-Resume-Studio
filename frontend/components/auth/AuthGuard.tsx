'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Only redirect if they are on a protected page
      const publicPages = ['/', '/login', '/signup', '/pricing'];
      if (!publicPages.includes(pathname)) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
           <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Securing Session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
