// Next shows this immediately on navigation, before the target page's data finishes
// loading — without it, tapping a shortcut/link gives zero feedback for up to a second.
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-16 animate-in fade-in duration-300">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  );
}
