'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/loading-screen';
import { useSettings } from '@/context/settings-context';


export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
