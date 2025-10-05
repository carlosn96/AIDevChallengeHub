'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, Trophy, AlertCircle, Rocket } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSettings } from '@/context/settings-context';


const Logo = () => (
    <div className="inline-block p-4 rounded-full card-glass mb-6 logo-ring">
        <Rocket className="h-16 w-16 text-accent" style={{
            filter: `drop-shadow(0 0 10px hsl(var(--accent))) drop-shadow(0 0 20px hsl(var(--accent) / 0.5))`
        }}/>
    </div>
);

export default function LoginPage() {
  const {
    user,
    isLoading,
    isFirebaseConfigured,
    authError,
    handleGoogleSignIn,
    isSigningIn,
  } = useSettings();
  
  const router = useRouter();

  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; speed: number; delay: number; xEnd: number; }[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Generate particles only on the client-side to prevent hydration mismatch
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    speed: Math.random() * 15 + 10,
    delay: Math.random() * 5,
    xEnd: Math.random() * 20 - 10
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const displayError = authError?.message;
  const errorTitle = authError?.title;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] via-[#1a1a3e] to-[#2d1b69]">
      <div className="absolute inset-0 grid-bg" />

      {isMounted && particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            '--x-end': `${p.xEnd}vw`
          } as React.CSSProperties}
        />
      ))}

      <div className="scan-line" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-8 logo-container">
            <Logo/>
            <h1 className="title-neon text-4xl md:text-5xl font-black mb-2">
              AIDevChallenge
            </h1>
            <p className="orbitron text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f093fb] to-[#f5576c]">
              2025
            </p>
          </div>

          <div className="card-glass rounded-3xl p-8 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4facfe]/10 to-[#00f2fe]/10 rounded-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="orbitron text-2xl font-bold text-white text-center mb-2">
                Welcome
              </h2>
              <p className="inter text-gray-400 text-center mb-8">
                Access the future of AI development
              </p>

              {!isFirebaseConfigured ? (
                 <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Configuration Error</AlertTitle>
                  <AlertDescription>{ authError?.message || 'Authentication is currently unavailable.'}</AlertDescription>
                </Alert>
              ) : displayError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{errorTitle}</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              ) : null}


              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn || isLoading || !isFirebaseConfigured}
                size="lg"
                className="w-full button-primary rounded-xl py-4 h-auto px-6 flex items-center justify-center gap-3 text-white font-semibold inter uppercase tracking-wide"
              >
                {isSigningIn || (isLoading && isFirebaseConfigured) ? (
                  'Signing In...'
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="feature-badge rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center">
              <Sparkles className="text-2xl mb-1 text-gray-300" />
              <p className="inter text-xs text-gray-300 font-medium">Innovation</p>
            </div>
            <div className="feature-badge rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center">
              <Bot className="text-2xl mb-1 text-gray-300" />
              <p className="inter text-xs text-gray-300 font-medium">Advanced AI</p>
            </div>
            <div className="feature-badge rounded-xl p-3 text-center cursor-pointer flex flex-col items-center justify-center">
              <Trophy className="text-2xl mb-1 text-gray-300" />
              <p className="inter text-xs text-gray-300 font-medium">Awards</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="inter text-muted-foreground text-sm mb-2">
              © 2025 AIDevChallenge
            </p>
            <p className="inter text-xs text-muted-foreground/80">
              Developed by <span className="text-accent/80 font-semibold">carlosn96</span>
            </p>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-[#8b5cf6] rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00f2fe] rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-[#ec4899] rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ animationDuration: '6s', transform: 'translate(-50%, -50%)' }} />
    </div>
  );
}
