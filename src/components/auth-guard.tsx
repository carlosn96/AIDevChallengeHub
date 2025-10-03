'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LoadingScreen = () => (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center">
            <p className="text-xl font-semibold text-primary">Loading...</p>
        </div>
    </div>
)


export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
