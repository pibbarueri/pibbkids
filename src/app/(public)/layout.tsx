export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-lg">{children}</div>
    </main>
  );
}
