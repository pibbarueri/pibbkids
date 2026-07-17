"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { Users, CalendarDays, BookOpen, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Início",
    icon: <Home className="h-5 w-5" />,
    roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR, Role.RECEPCAO],
  },
  {
    href: "/children",
    label: "Crianças",
    icon: <Users className="h-5 w-5" />,
    roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR, Role.RECEPCAO],
  },
  {
    href: "/volunteers",
    label: "Voluntários",
    icon: <Users className="h-5 w-5" />,
    roles: [Role.LIDERANCA, Role.COORDENACAO],
  },
  {
    href: "/schedule",
    label: "Escala",
    icon: <CalendarDays className="h-5 w-5" />,
    roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR, Role.RECEPCAO],
  },
  {
    href: "/curriculum/lessons",
    label: "Aulas",
    icon: <BookOpen className="h-5 w-5" />,
    roles: [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR],
  },
];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {visible.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors min-w-[44px]",
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
