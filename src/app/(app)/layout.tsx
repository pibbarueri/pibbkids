import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-4 py-2">
        <p className="text-lg font-heading font-extrabold text-primary tracking-tight">
          PIBB<span className="text-secondary italic ml-0.5">Kids</span>
        </p>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav role={session.user.role} />
    </div>
  );
}
