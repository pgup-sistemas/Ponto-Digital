import { useLocation, Link } from "wouter";
import { Clock, History, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Clock, label: "Ponto" },
  { href: "/history", icon: History, label: "Histórico" },
  { href: "/justifications", icon: FileText, label: "Justificativas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn("text-xs font-medium", isActive && "text-primary")}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-8 h-0.5 rounded-full bg-primary" />
                )}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
