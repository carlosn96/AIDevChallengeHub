import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

const Logo = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 80L50 20L80 80" stroke="url(#accent-gradient)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 60H65" stroke="url(#accent-gradient)" strokeWidth="10" strokeLinecap="round" />
    <defs>
      <linearGradient id="accent-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4facfe" />
        <stop offset="100%" stopColor="#00f2fe" />
      </linearGradient>
    </defs>
  </svg>
);

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center z-10">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <h1 className="text-4xl sm:text-5xl md:text-6xl title-neon">
            AIDev Challenge 2025
          </h1>
        </div>

        <p className="text-lg text-muted-foreground">
          Securely sign in with your institutional account to join the challenge.
        </p>
        
        <Link href="/dashboard" className="w-full">
          <Button size="lg" className="w-full text-lg font-semibold">
            <LogIn className="mr-2 h-5 w-5" />
            Login with Google
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground">
          By logging in, you agree to the terms and conditions of the hackathon.
        </p>
      </div>
    </div>
  );
}
