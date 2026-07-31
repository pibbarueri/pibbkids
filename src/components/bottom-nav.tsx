"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DESTINATIONS, HOME_DESTINATION } from "@/lib/navigation";

// Icons are functions, so they can't cross the server→client prop boundary.
// The server sends plain ids/labels and we resolve the icon from the catalog here.
const ICONS = new Map(
  [HOME_DESTINATION, ...DESTINATIONS].map((d) => [d.id, d.icon] as const)
);

type NavItem = {
  id: string;
  href: string;
  label: string;
};

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = ICONS.get(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-all min-w-[44px] active:scale-90",
                active
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
