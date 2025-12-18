import { useLocation, Link } from "wouter";
import { Clock, History, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { href: "/", icon: Clock, label: "Ponto" },
  { href: "/history", icon: History, label: "Histórico" },
  { href: "/justifications", icon: FileText, label: "Justificativas" },
];

export function DesktopNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="hidden md:flex items-center justify-between h-16 px-6 border-b bg-background sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/">
          <a className="flex items-center gap-2" data-testid="link-logo">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">Ponto Digital</span>
          </a>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid={`nav-desktop-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        
        <Link href="/profile">
          <a className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg p-1.5 pr-3" data-testid="link-profile">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user?.name?.split(" ")[0]}</span>
          </a>
        </Link>
      </div>
    </header>
  );
}
