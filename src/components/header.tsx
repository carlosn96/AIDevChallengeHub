'use client';

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, LifeBuoy, Settings, Rocket } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { Badge } from "@/components/ui/badge";

const Logo = () => (
  <Link href="/dashboard" className="flex items-center gap-3 group">
    <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
      <Rocket className="h-6 w-6 text-primary transition-transform duration-300 group-hover:rotate-12" />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
    </div>
    <div className="flex flex-col">
      <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        AIDevChallenge
      </span>
      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium -mt-1">
        Hub 2025
      </span>
    </div>
  </Link>
);

export default function Header() {
  const { user, role, handleSignOut } = useSettings();
  
  const onLogout = async () => {
    await handleSignOut();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return <User className="h-5 w-5" />;
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* User Section */}
          {user && (
            <div className="flex items-center gap-3">
              {/* User Info - Hidden on mobile */}
              <div className="hidden sm:flex flex-col items-end mr-2">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {user.displayName}
                </p>
                <div className="flex items-center gap-2">
                  {role && <Badge variant="outline" className="text-xs">{role}</Badge>}
                  <p className="text-xs leading-tight text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-primary/50 transition-all"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/20 hover:border-primary transition-all">
                      {user.photoURL && (
                        <AvatarImage 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-sm">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5 p-2">
                       <p className="text-sm font-semibold leading-none">
                        {user.displayName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mb-1">
                        {user.email}
                      </p>
                      {role && <Badge variant="secondary" className="w-fit">{role}</Badge>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                      <User className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Soporte</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
      </div>
    </header>
  );
}