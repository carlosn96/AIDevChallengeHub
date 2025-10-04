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
  <Link href="/dashboard" className="flex items-center gap-2.5 group">
    <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
      <Rocket className="h-5 w-5 text-primary transition-transform duration-300 group-hover:rotate-12" />
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
    </div>
    <div className="flex flex-col -space-y-0.5">
      <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        AIDevChallenge
      </span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
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
    if (!name) return <User className="h-4 w-4" />;
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'Teacher': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      'Student': 'bg-green-500/10 text-green-500 border-green-500/30',
      'Admin': 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    };
    return colors[role as keyof typeof colors] || 'bg-primary/10 text-primary border-primary/30';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* User Section */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User Info - Hidden on mobile */}
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {role && (
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-2 py-0.5 h-5 font-medium ${getRoleColor(role)}`}
                    >
                      {role}
                    </Badge>
                  )}
                  <p className="text-sm font-semibold leading-none text-foreground">
                    {user.displayName}
                  </p>
                </div>
                <p className="text-[11px] leading-tight text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>

              {/* Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/50 transition-all">
                      {user.photoURL && (
                        <AvatarImage 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-xs">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2 p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          {user.photoURL && (
                            <AvatarImage 
                              src={user.photoURL} 
                              alt={user.displayName || 'User'} 
                            />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-xs">
                            {getInitials(user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-none truncate">
                            {user.displayName}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      {role && (
                        <Badge 
                          variant="secondary" 
                          className={`w-fit ${getRoleColor(role)}`}
                        >
                          {role}
                        </Badge>
                      )}
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
      </div>
    </header>
  );
}